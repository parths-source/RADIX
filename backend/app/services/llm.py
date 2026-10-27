"""LLM factory: one structured-output call, driven by LLM_PROVIDER and LLM_MODEL.

Modules call a StructuredLLM and never touch provider SDKs, so tests can pass a
fake. Temperature is always 0.
"""

import logging
import time
from dataclasses import dataclass
from typing import Callable

from pydantic import BaseModel

from app.config import Settings

logger = logging.getLogger(__name__)

SUPPORTED_PROVIDERS = ("google",)


@dataclass
class LLMResult:
    parsed: BaseModel | None  # None when the output did not match the schema
    error: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    model: str | None = None  # the model that actually answered (main or fallback)


# (schema, system prompt, user message) -> LLMResult. Raises on transport/API errors.
StructuredLLM = Callable[[type[BaseModel], str, str], LLMResult]


class LLMConfigError(RuntimeError):
    pass


def make_structured_llm(settings: Settings) -> StructuredLLM | None:
    """Return a callable for the configured provider, or None if no LLM is configured."""
    if not settings.llm_configured:
        return None
    provider = settings.llm_provider.strip().lower()
    if provider not in SUPPORTED_PROVIDERS:
        raise LLMConfigError(
            f"LLM_PROVIDER={settings.llm_provider!r} is not supported. Use one of: {', '.join(SUPPORTED_PROVIDERS)}."
        )

    from langchain_google_genai import ChatGoogleGenerativeAI

    model_names = [settings.llm_model]
    if settings.llm_fallback_model and settings.llm_fallback_model != settings.llm_model:
        model_names.append(settings.llm_fallback_model)
    # With a fallback configured, the main model gets no retry: the fallback is the retry.
    # The last model gets one retry for a transient 429/503.
    models = [
        ChatGoogleGenerativeAI(
            model=name,
            google_api_key=settings.llm_api_key,
            temperature=0,
            max_retries=1 if i == len(model_names) - 1 else 0,
            timeout=settings.llm_timeout_seconds,
        )
        for i, name in enumerate(model_names)
    ]

    def invoke(schema: type[BaseModel], system: str, user: str) -> tuple[str, dict]:
        """Try the main model, then the fallback model; re-raise the last error."""
        for i, (name, model) in enumerate(zip(model_names, models)):
            runnable = model.with_structured_output(schema, method="json_schema", include_raw=True)
            try:
                return name, runnable.invoke([("system", system), ("human", user)])
            except Exception as exc:
                if i == len(models) - 1:
                    raise
                logger.warning("llm_model_failed model=%s error=%s trying=%s", name, type(exc).__name__, model_names[i + 1])
        raise AssertionError("unreachable")

    def call(schema: type[BaseModel], system: str, user: str) -> LLMResult:
        start = time.perf_counter()
        used_model, out = invoke(schema, system, user)
        usage = getattr(out["raw"], "usage_metadata", None) or {}
        logger.info(
            "llm_call provider=%s model=%s schema=%s latency_ms=%s input_tokens=%s output_tokens=%s parsed=%s",
            provider, used_model, schema.__name__, round((time.perf_counter() - start) * 1000),
            usage.get("input_tokens"), usage.get("output_tokens"), out["parsed"] is not None,
        )
        error = out.get("parsing_error")
        return LLMResult(
            parsed=out["parsed"],
            error=str(error)[:1000] if error else None,
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
            model=used_model,
        )

    return call
