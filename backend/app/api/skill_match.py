"""Module 5 over HTTP: POST /profiles/{id}/skill-match."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_llm, get_repository
from app.config import Settings, get_settings
from app.errors import AppError
from app.models.contract import SkillMatchResult
from app.services import skill_matching
from app.services.llm import StructuredLLM
from app.services.repository import Repository

router = APIRouter()


class SkillMatchRequest(BaseModel):
    jd_extraction_id: str


@router.post("/profiles/{profile_id}/skill-match", response_model=SkillMatchResult)
def run_skill_match(
    profile_id: str,
    body: SkillMatchRequest,
    settings: Settings = Depends(get_settings),
    llm: StructuredLLM | None = Depends(get_llm),
    repo: Repository = Depends(get_repository),
):
    profile = repo.get_profile(profile_id)
    if profile is None:
        raise AppError(404, "not_found", f"No profile with id '{profile_id}'.")
    jd = repo.get_extraction(body.jd_extraction_id)
    if jd is None:
        raise AppError(404, "not_found", f"No extraction with id '{body.jd_extraction_id}'.")
    if jd.source_type != "jd":
        raise AppError(422, "not_a_jd", "That extraction is a resume. Choose an analyzed JD.")
    judge = llm if settings.enable_llm_match else None  # the LLM judge is off unless ENABLE_LLM_MATCH=true
    result = skill_matching.run(profile.skills, jd, judge)
    return repo.save_skill_match(profile_id, body.jd_extraction_id, result)
