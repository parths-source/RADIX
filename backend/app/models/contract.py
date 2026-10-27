"""Shared data contract v0.1 (PLAN.md section 6, docs/CONTRACT.md).

These models ARE the contract: every module reads and writes them, and every
LLM response, fixture and API response is validated against them. Fields marked
(+) are the approved optional additions (D5). Do not change shapes without an
entry in docs/DECISIONS.md.
"""

import re
from enum import Enum
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

CONTRACT_VERSION = "0.1"
MAX_SKILLS = 100


class CategoryCode(str, Enum):
    COD = "COD"
    DSA = "DSA"
    OOD = "OOD"
    APTI = "APTI"
    COMM = "COMM"
    AI = "AI"
    CLOUD = "CLOUD"
    SQL = "SQL"
    SWE = "SWE"
    SYSD = "SYSD"
    NETW = "NETW"
    OS = "OS"
    OTHER = "OTHER"


# The 12 RADIX skillsets: every category except OTHER.
SKILLSET_CODES: tuple[CategoryCode, ...] = tuple(c for c in CategoryCode if c is not CategoryCode.OTHER)

Confidence = Literal["high", "medium", "low"]
RequirementType = Literal["required", "preferred"]
SourceType = Literal["jd", "resume"]
ExtractionStatus = Literal["ok", "fallback", "llm_failed"]
MatchType = Literal["exact", "alias", "fuzzy", "llm"]
EvidenceStatus = Literal["none", "claimed_only", "evidenced"]
ExperienceKind = Literal["hackathon", "internship"]
LLMJudgeStatus = Literal["off", "used", "failed"]

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Level = Annotated[int, Field(ge=1, le=10)]
Score = Annotated[int, Field(ge=0, le=100)]


def _name_key(name: str) -> str:
    """Case- and whitespace-insensitive key for comparing skill names inside one profile."""
    return re.sub(r"\s+", " ", name.strip()).casefold()


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Skill(ContractModel):
    skill_name: NonEmptyStr
    category_code: CategoryCode
    evidence: str = ""
    confidence: Confidence
    requirement_type: Optional[RequirementType] = None  # (+) JD skills only; None means required


class Entry(ContractModel):
    """(+) A hackathon, internship, project or certification."""

    title: NonEmptyStr
    description: str = ""
    skills_used: list[NonEmptyStr] = Field(default_factory=list)  # (+)
    duration_months: Optional[Annotated[int, Field(ge=0)]] = None  # (+)
    # (+) D10: set on resume details.experience entries. Missing -> scored at the hackathon tier.
    kind: Optional[ExperienceKind] = None


def clean_email(value: Optional[str]) -> Optional[str]:
    """Blank -> None; anything that is not an address raises ValueError."""
    if value is None or not value.strip():
        return None
    value = value.strip()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise ValueError("email is not a valid address")
    return value


class ResumeDetails(ContractModel):
    education: str = ""
    projects: list[Entry] = Field(default_factory=list)
    experience: list[Entry] = Field(default_factory=list)
    # (+) D11: pre-fill the rest of the profile form from the same extraction
    name: Optional[str] = None
    email: Optional[str] = None
    certifications: list[Entry] = Field(default_factory=list)
    preferred_roles: list[NonEmptyStr] = Field(default_factory=list)

    @field_validator("email")
    @classmethod
    def _email_shape(cls, value: Optional[str]) -> Optional[str]:
        return clean_email(value)


class ExtractedSkillList(ContractModel):
    id: Optional[str] = None  # assigned on save
    source_type: SourceType
    source_file: NonEmptyStr
    company: Optional[str] = None  # JD only
    role: Optional[str] = None  # JD only
    skills: list[Skill] = Field(default_factory=list, max_length=MAX_SKILLS)
    details: Optional[ResumeDetails] = None  # (+) resume only
    status: ExtractionStatus = "ok"  # (+)

    @model_validator(mode="after")
    def _details_only_for_resumes(self):
        if self.source_type == "jd" and self.details is not None:
            raise ValueError("details is only allowed when source_type is 'resume'")
        return self


class CandidateProfile(ContractModel):
    id: Optional[str] = None
    name: NonEmptyStr
    email: Optional[str] = None
    education: str = ""
    skills: list[Skill] = Field(default_factory=list, max_length=MAX_SKILLS)
    hackathons: list[Entry] = Field(default_factory=list)
    internships: list[Entry] = Field(default_factory=list)
    certifications: list[Entry] = Field(default_factory=list)
    projects: list[Entry] = Field(default_factory=list)  # (+)
    preferred_roles: list[str] = Field(default_factory=list)
    cv_file: Optional[str] = None

    @field_validator("email")
    @classmethod
    def _email_shape(cls, value: Optional[str]) -> Optional[str]:
        return clean_email(value)

    @model_validator(mode="after")
    def _skills_used_must_be_listed(self):
        listed = {_name_key(s.skill_name) for s in self.skills}
        for group in ("hackathons", "internships", "certifications", "projects"):
            for entry in getattr(self, group):
                unknown = [s for s in entry.skills_used if _name_key(s) not in listed]
                if unknown:
                    raise ValueError(
                        f"{group} entry '{entry.title}' uses skills not in the skills list: {', '.join(unknown)}"
                    )
        return self


class SkillsetGap(ContractModel):
    category_code: CategoryCode
    required_level: Level
    candidate_level: Level
    gap: bool
    evidence_status: Optional[EvidenceStatus] = None  # (+)


class TalentCheckResult(ContractModel):
    company: NonEmptyStr
    skillset_gap: list[SkillsetGap]
    readiness_score: Score
    scoring_version: Optional[str] = None  # (+)


class MatchedSkill(ContractModel):
    jd_skill: NonEmptyStr
    candidate_skill: NonEmptyStr
    category_code: CategoryCode
    match_type: MatchType
    evidence: str = ""


class MissingSkill(ContractModel):
    skill_name: NonEmptyStr
    category_code: CategoryCode
    reason: str
    requirement_type: Optional[RequirementType] = None


class SkillMatchResult(ContractModel):
    jd_source_file: NonEmptyStr
    match_score: Score
    matched_skills: list[MatchedSkill] = Field(default_factory=list)
    missing_skills: list[MissingSkill] = Field(default_factory=list)
    scoring_version: Optional[str] = None  # (+)
    # (+) D12: "failed" means the optional LLM judge errored and this is the rule-based score only.
    llm_judge: Optional[LLMJudgeStatus] = None
