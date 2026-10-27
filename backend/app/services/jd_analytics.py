"""Module 1, JD Analytics: JD text -> ExtractedSkillList (LLM)."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.config import Settings
from app.models.contract import ExtractedSkillList
from app.services.extraction import ExtractionSpec, dedupe_by_name, run_extraction, short_evidence, to_category
from app.services.llm import StructuredLLM


class JDSkillOut(BaseModel):
    skill_name: str
    category_code: str = Field(description="One of the category codes listed in the instructions")
    evidence: str = Field(description="Short exact quote from the JD")
    confidence: Literal["high", "medium", "low"]
    requirement_type: Literal["required", "preferred"]


class JDOut(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    skills: list[JDSkillOut]


def _to_contract(out: JDOut, source_file: str) -> ExtractedSkillList:
    skills = dedupe_by_name([
        {
            "skill_name": s.skill_name.strip(),
            "category_code": to_category(s.category_code),
            "evidence": short_evidence(s.evidence),
            "confidence": s.confidence,
            "requirement_type": s.requirement_type,
        }
        for s in out.skills
    ])
    return ExtractedSkillList(
        source_type="jd",
        source_file=source_file,
        company=(out.company or "").strip() or None,
        role=(out.role or "").strip() or None,
        skills=skills,
        status="ok",
    )


SPEC = ExtractionSpec(source_type="jd", prompt_version="jd_extraction_v1", schema=JDOut, to_contract=_to_contract)


def run(text: str, source_file: str, llm: StructuredLLM | None, settings: Settings) -> ExtractedSkillList:
    return run_extraction(SPEC, text, source_file, llm, settings)
