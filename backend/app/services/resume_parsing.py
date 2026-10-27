"""Module 2, Resume Parsing: resume text -> ExtractedSkillList with details (LLM)."""

import logging
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.config import Settings
from app.models.contract import Entry, ExtractedSkillList, ResumeDetails, clean_email
from app.services.extraction import ExtractionSpec, dedupe_by_name, run_extraction, short_evidence, to_category
from app.services.llm import StructuredLLM
from app.services.normalization import normalize_name

logger = logging.getLogger(__name__)


class ResumeSkillOut(BaseModel):
    skill_name: str
    category_code: str = Field(description="One of the category codes listed in the instructions")
    evidence: str = Field(description="Short exact quote from the resume")
    confidence: Literal["high", "medium", "low"]


class EntryOut(BaseModel):
    title: str
    description: str = ""
    skills_used: list[str] = Field(default_factory=list, description="Names exactly as in the skills list")
    duration_months: Optional[int] = Field(default=None, description="Only if the resume states it")


class ExperienceOut(EntryOut):
    kind: Literal["hackathon", "internship"]


class ResumeOut(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = Field(default=None, description="Only if an address appears in the resume")
    skills: list[ResumeSkillOut]
    education: str = ""
    projects: list[EntryOut] = Field(default_factory=list)
    experience: list[ExperienceOut] = Field(default_factory=list)
    certifications: list[EntryOut] = Field(default_factory=list)
    preferred_roles: list[str] = Field(default_factory=list)


def _entry(out: EntryOut, skill_names: dict[str, str], kind: Optional[str] = None) -> Entry:
    """Point skills_used at the extracted skill names; drop names that match no skill."""
    used, dropped = [], 0
    for name in out.skills_used:
        canonical = skill_names.get(normalize_name(name))
        if canonical is None:
            dropped += 1
        elif canonical not in used:
            used.append(canonical)
    if dropped:
        logger.info("resume_skills_used_dropped count=%s", dropped)
    duration = out.duration_months if out.duration_months is not None and out.duration_months >= 0 else None
    return Entry(title=out.title, description=out.description.strip(), skills_used=used,
                 duration_months=duration, kind=kind)


def _safe_email(value: Optional[str]) -> Optional[str]:
    """A malformed address from the LLM is dropped rather than failing the whole extraction."""
    try:
        return clean_email(value)
    except ValueError:
        return None


def _to_contract(out: ResumeOut, source_file: str) -> ExtractedSkillList:
    skills = dedupe_by_name([
        {
            "skill_name": s.skill_name.strip(),
            "category_code": to_category(s.category_code),
            "evidence": short_evidence(s.evidence),
            "confidence": s.confidence,
        }
        for s in out.skills
    ])
    names = {normalize_name(s["skill_name"]): s["skill_name"] for s in skills}
    details = ResumeDetails(
        education=" ".join(out.education.split()),
        projects=[_entry(p, names) for p in out.projects if p.title.strip()],
        experience=[_entry(e, names, e.kind) for e in out.experience if e.title.strip()],
        name=(out.name or "").strip() or None,
        email=_safe_email(out.email),
        certifications=[_entry(c, names) for c in out.certifications if c.title.strip()],
        preferred_roles=list(dict.fromkeys(r.strip() for r in out.preferred_roles if r.strip())),
    )
    return ExtractedSkillList(source_type="resume", source_file=source_file, skills=skills, details=details)


SPEC = ExtractionSpec(
    source_type="resume", prompt_version="resume_extraction_v2", schema=ResumeOut, to_contract=_to_contract
)


def run(text: str, source_file: str, llm: StructuredLLM | None, settings: Settings) -> ExtractedSkillList:
    return run_extraction(SPEC, text, source_file, llm, settings)
