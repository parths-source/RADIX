import logging

from fastapi import Depends, Request

from app.config import Settings, get_settings
from app.services.company_data import CompanyData
from app.services.llm import LLMConfigError, StructuredLLM, make_structured_llm
from app.services.repository import Repository


def get_company_data(request: Request) -> CompanyData:
    return request.app.state.company_data


def get_repository(settings: Settings = Depends(get_settings)) -> Repository:
    return Repository(settings)


logger = logging.getLogger(__name__)


def get_llm(settings: Settings = Depends(get_settings)) -> StructuredLLM | None:
    """None means "no usable LLM": extraction then uses saved fixtures or returns 502."""
    try:
        return make_structured_llm(settings)
    except LLMConfigError as exc:
        logger.warning("llm_misconfigured %s", exc)
        return None
