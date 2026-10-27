"""Module 3, Profile Builder: plain code, no LLM.

- draft_from_resume: a resume extraction -> a profile draft to pre-fill the form
- merge_resume: add what a resume extraction found to an existing profile without
  overwriting anything the candidate already entered
- clean_profile: tidy a profile before it is saved
"""

from typing import Optional

from app.models.contract import CandidateProfile, Entry, ExtractedSkillList, Skill
from app.services.normalization import canonical_name, normalize_name


class ProfileDraft(CandidateProfile):
    """A CandidateProfile whose name may still be empty (the candidate fills it in before saving)."""

    name: str = ""


ENTRY_GROUPS = ("hackathons", "internships", "certifications", "projects")


def _fields(profile: CandidateProfile) -> dict:
    """Shallow field copy that keeps nested Skill/Entry objects (model_dump would turn them into dicts)."""
    return {name: getattr(profile, name) for name in CandidateProfile.model_fields}


def _dedupe_skills(skills: list[Skill]) -> list[Skill]:
    seen: dict[str, Skill] = {}
    for skill in skills:
        seen.setdefault(canonical_name(skill.skill_name), skill)
    return list(seen.values())


def _remap_entry(entry: Entry, names: dict[str, str]) -> Entry:
    """Point skills_used at the profile's own spelling of each skill (aliases included)."""
    used: list[str] = []
    for name in entry.skills_used:
        mapped = names.get(canonical_name(name))
        if mapped and mapped not in used:
            used.append(mapped)
    return entry.model_copy(update={"skills_used": used})


def _remap_all(data: dict) -> dict:
    names = {canonical_name(s.skill_name): s.skill_name for s in data["skills"]}
    for group in ENTRY_GROUPS:
        data[group] = [_remap_entry(e, names) for e in data[group]]
    return data


def _resume_groups(extraction: ExtractedSkillList) -> dict[str, list[Entry]]:
    details = extraction.details
    if details is None:
        return {group: [] for group in ENTRY_GROUPS}
    # D10: entries without a kind are treated as hackathons (the lower experience tier).
    return {
        "hackathons": [e for e in details.experience if e.kind != "internship"],
        "internships": [e for e in details.experience if e.kind == "internship"],
        "certifications": list(details.certifications),
        "projects": list(details.projects),
    }


def _require_resume(extraction: ExtractedSkillList) -> None:
    if extraction.source_type != "resume":
        raise ValueError("a profile can only be built from a resume extraction")


def draft_from_resume(extraction: ExtractedSkillList) -> ProfileDraft:
    _require_resume(extraction)
    details = extraction.details
    data = {
        "name": (details.name if details else None) or "",
        "email": details.email if details else None,
        "education": details.education if details else "",
        "skills": _dedupe_skills(extraction.skills),
        "preferred_roles": list(details.preferred_roles) if details else [],
        **_resume_groups(extraction),
    }
    return ProfileDraft.model_validate(_remap_all(data))


def merge_resume(profile: CandidateProfile, extraction: ExtractedSkillList) -> ProfileDraft:
    """Keep everything already in the profile; add new skills, entries and roles from the resume."""
    _require_resume(extraction)
    draft = draft_from_resume(extraction)
    data = _fields(profile)
    data["skills"] = _dedupe_skills([*profile.skills, *draft.skills])
    for group in ENTRY_GROUPS:
        existing = getattr(profile, group)
        titles = {normalize_name(e.title) for e in existing}
        data[group] = [*existing, *(e for e in getattr(draft, group) if normalize_name(e.title) not in titles)]
    for field in ("name", "email", "education"):
        if not data[field]:
            data[field] = getattr(draft, field)
    data["preferred_roles"] = _dedupe_roles([*profile.preferred_roles, *draft.preferred_roles])
    return ProfileDraft.model_validate(_remap_all(data))


def _dedupe_roles(roles: list[str]) -> list[str]:
    seen: dict[str, str] = {}
    for role in roles:
        if role.strip():
            seen.setdefault(normalize_name(role), role.strip())
    return list(seen.values())


def clean_profile(profile: CandidateProfile, profile_id: Optional[str] = None) -> CandidateProfile:
    """Before saving: one skill per canonical name, skills_used in the profile's spelling, unique roles."""
    data = _fields(profile)
    data["id"] = profile_id
    data["skills"] = _dedupe_skills(profile.skills)
    data["preferred_roles"] = _dedupe_roles(profile.preferred_roles)
    return CandidateProfile.model_validate(_remap_all(data))
