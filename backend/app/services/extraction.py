"""Shared pipeline for modules 1 and 2 (PLAN.md sections 5.4 and 10).

LLM call with structured output -> convert to the contract -> on a schema or
validation failure retry once with the error appended -> otherwise fall back to
data/fixtures/<file stem>.json (status "fallback") -> otherwise 502.
"""

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from pydantic import BaseModel, ValidationError

from app.config import Settings
from app.errors import AppError
from app.models.contract import MAX_SKILLS, CategoryCode, ExtractedSkillList, SourceType
from app.services.llm import StructuredLLM
from app.services.normalization import normalize_name

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
EVIDENCE_MAX_CHARS = 200

CATEGORY_DESCRIPTIONS = """\
COD: programming languages and coding
DSA: data structures and algorithms
OOD: object-oriented design
APTI: aptitude, quantitative and logical reasoning
COMM: communication
AI: machine learning, deep learning, NLP, LLMs, data-science methods
CLOUD: cloud platforms and services
SQL: databases and SQL
SWE: software-engineering practice (version control, testing, SDLC, APIs, DevOps)
SYSD: system design and architecture
NETW: networking
OS: operating systems
OTHER: anything that fits none of the above"""


@dataclass
class ExtractionSpec:
    source_type: SourceType
    prompt_version: str  # file name in app/prompts without .md
    schema: type[BaseModel]  # what the LLM must return
    to_contract: Callable[[BaseModel, str], ExtractedSkillList]


def load_prompt(version: str) -> str:
    return (PROMPTS_DIR / f"{version}.md").read_text(encoding="utf-8").replace("{categories}", CATEGORY_DESCRIPTIONS)


def to_category(code: str) -> CategoryCode:
    """Unknown codes become OTHER instead of failing the whole extraction."""
    try:
        return CategoryCode(code.strip().upper())
    except ValueError:
        return CategoryCode.OTHER


def short_evidence(text: str) -> str:
    text = " ".join(text.split())
    return text if len(text) <= EVIDENCE_MAX_CHARS else text[: EVIDENCE_MAX_CHARS - 1] + "…"


def dedupe_by_name(skills: list[dict]) -> list[dict]:
    """Keep the first occurrence of each normalized name; a later 'required' upgrades a 'preferred'."""
    seen: dict[str, dict] = {}
    for skill in skills:
        key = normalize_name(skill["skill_name"])
        if not key:
            continue
        if key not in seen:
            seen[key] = skill
        elif skill.get("requirement_type") == "required" and seen[key].get("requirement_type") == "preferred":
            seen[key]["requirement_type"] = "required"
    return list(seen.values())[:MAX_SKILLS]


def run_extraction(
    spec: ExtractionSpec, text: str, source_file: str, llm: StructuredLLM | None, settings: Settings
) -> ExtractedSkillList:
    log = {"module": spec.source_type, "prompt": spec.prompt_version}
    if len(text) > settings.llm_max_input_chars:
        logger.warning("extraction_truncated %s chars=%s limit=%s", log, len(text), settings.llm_max_input_chars)
        text = text[: settings.llm_max_input_chars]

    if llm is None:
        return _fallback(spec, source_file, settings, "llm_not_configured")

    system = load_prompt(spec.prompt_version)
    user = f"Document text:\n<<<\n{text}\n>>>"
    error_note: str | None = None
    for attempt in (1, 2):
        message = user if error_note is None else (
            f"{user}\n\nYour previous answer was invalid:\n{error_note}\nReturn a corrected answer."
        )
        try:
            result = llm(spec.schema, system, message)
        except Exception as exc:  # network, quota, auth: do not retry, fall back
            logger.warning(
                "extraction_llm_error %s attempt=%s error=%s detail=%s", log, attempt, type(exc).__name__, str(exc)[:200]
            )
            return _fallback(spec, source_file, settings, "llm_error")
        if result.parsed is None:
            error_note = result.error or "Output did not match the schema."
            logger.warning("extraction_schema_failure %s attempt=%s", log, attempt)
            continue
        try:
            extraction = spec.to_contract(result.parsed, source_file)
        except ValidationError as exc:
            error_note = str(exc)[:1000]
            logger.warning("extraction_validation_failure %s attempt=%s", log, attempt)
            continue
        logger.info("extraction_ok %s attempt=%s skills=%s", log, attempt, len(extraction.skills))
        return extraction
    return _fallback(spec, source_file, settings, "invalid_llm_output")


def load_fixture(path: Path) -> tuple[dict, ExtractedSkillList]:
    """A fixture is {"_meta": {model, prompt_version, generated_at, ...}, "extraction": ExtractedSkillList}."""
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["_meta"], ExtractedSkillList.model_validate(data["extraction"])


def _fallback(spec: ExtractionSpec, source_file: str, settings: Settings, reason: str) -> ExtractedSkillList:
    fixture = settings.data_dir / "fixtures" / f"{Path(source_file).stem}.json"
    if fixture.is_file():
        meta, extraction = load_fixture(fixture)
        if extraction.source_type == spec.source_type:
            logger.info("extraction_fallback module=%s reason=%s fixture=%s fixture_model=%s",
                        spec.source_type, reason, fixture.name, meta.get("model"))
            return extraction.model_copy(update={"id": None, "source_file": source_file, "status": "fallback"})
    messages = {
        "llm_not_configured": "No LLM is configured and there is no saved extraction for this file.",
        "llm_error": "The LLM call failed and there is no saved extraction for this file. Try again, or use a sample file.",
        "invalid_llm_output": "The LLM returned invalid output twice and there is no saved extraction for this file.",
    }
    raise AppError(502, "extraction_failed", messages[reason], {"reason": reason})
