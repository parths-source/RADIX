import copy

import pytest
from pydantic import ValidationError

from app.models.contract import (
    SKILLSET_CODES,
    CandidateProfile,
    CategoryCode,
    ExtractedSkillList,
    Skill,
    SkillMatchResult,
    TalentCheckResult,
)

SKILL = {"skill_name": "Python", "category_code": "COD", "evidence": "Python, Java", "confidence": "high"}

JD = {
    "source_type": "jd",
    "source_file": "google_software_engineer.docx",
    "company": "Google LLC",
    "role": "Software Engineer",
    "skills": [
        {**SKILL, "requirement_type": "required"},
        {"skill_name": "Kubernetes", "category_code": "CLOUD", "evidence": "nice to have", "confidence": "medium",
         "requirement_type": "preferred"},
    ],
    "status": "ok",
}

RESUME = {
    "source_type": "resume",
    "source_file": "resume.docx",
    "skills": [SKILL],
    "details": {
        "education": "B.Tech",
        "projects": [{"title": "Scheduler", "description": "C++ job scheduler", "skills_used": ["C++"]}],
        "experience": [{"title": "Intern", "skills_used": ["Python"], "duration_months": 2}],
    },
}

PROFILE = {
    "name": "Test",
    "email": "test@example.com",
    "skills": [SKILL, {"skill_name": "PostgreSQL", "category_code": "SQL", "confidence": "medium"}],
    "internships": [{"title": "Intern", "skills_used": ["python", " PostgreSQL "]}],
    "projects": [{"title": "App", "skills_used": ["Python"]}],
    "preferred_roles": ["SWE"],
}

TALENT = {
    "company": "Google LLC",
    "skillset_gap": [
        {"category_code": "COD", "required_level": 8, "candidate_level": 6, "gap": True, "evidence_status": "evidenced"}
    ],
    "readiness_score": 72,
    "scoring_version": "tc-v0.1",
}

MATCH = {
    "jd_source_file": "google_swe.pdf",
    "match_score": 64,
    "matched_skills": [{"jd_skill": "PostgreSQL", "candidate_skill": "Postgres", "category_code": "SQL",
                        "match_type": "alias", "evidence": "alias map"}],
    "missing_skills": [{"skill_name": "Kubernetes", "category_code": "CLOUD", "reason": "No matching skill in profile",
                        "requirement_type": "required"}],
    "scoring_version": "sm-v0.1",
}


def _with(base, path, value):
    data = copy.deepcopy(base)
    target = data
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return data


def test_twelve_skillsets_plus_other():
    assert len(SKILLSET_CODES) == 12
    assert len(CategoryCode) == 13


@pytest.mark.parametrize(
    "model, data",
    [(ExtractedSkillList, JD), (ExtractedSkillList, RESUME), (CandidateProfile, PROFILE),
     (TalentCheckResult, TALENT), (SkillMatchResult, MATCH)],
)
def test_documented_examples_validate_and_round_trip(model, data):
    parsed = model.model_validate(data)
    assert model.model_validate(parsed.model_dump()) == parsed


def test_brief_only_shapes_still_validate():
    # A module that ignores every (+) field must still emit a valid object.
    Skill.model_validate({k: SKILL[k] for k in ("skill_name", "category_code", "evidence", "confidence")})
    ExtractedSkillList.model_validate({"source_type": "jd", "source_file": "a.pdf", "company": "X", "role": "Y",
                                       "skills": []})
    TalentCheckResult.model_validate({k: v for k, v in TALENT.items() if k != "scoring_version"})
    SkillMatchResult.model_validate({k: v for k, v in MATCH.items() if k != "scoring_version"})


def test_skill_name_is_trimmed():
    assert Skill.model_validate({**SKILL, "skill_name": "  Python "}).skill_name == "Python"


@pytest.mark.parametrize(
    "model, base, path, value",
    [
        (Skill, SKILL, ["skill_name"], "   "),
        (Skill, SKILL, ["category_code"], "WEB"),
        (Skill, SKILL, ["confidence"], "very high"),
        (Skill, SKILL, ["requirement_type"], "optional"),
        (Skill, SKILL, ["unexpected_field"], 1),
        (ExtractedSkillList, JD, ["source_type"], "cv"),
        (ExtractedSkillList, JD, ["status"], "maybe"),
        (ExtractedSkillList, JD, ["skills"], [SKILL] * 101),
        (ExtractedSkillList, JD, ["details"], {"education": "x"}),
        (CandidateProfile, PROFILE, ["name"], ""),
        (CandidateProfile, PROFILE, ["email"], "not-an-email"),
        (CandidateProfile, PROFILE, ["projects"], [{"title": "App", "skills_used": ["Rust"]}]),
        (CandidateProfile, PROFILE, ["internships", 0, "duration_months"], -1),
        (TalentCheckResult, TALENT, ["readiness_score"], 101),
        (TalentCheckResult, TALENT, ["readiness_score"], -1),
        (TalentCheckResult, TALENT, ["skillset_gap", 0, "required_level"], 11),
        (TalentCheckResult, TALENT, ["skillset_gap", 0, "candidate_level"], 0),
        (TalentCheckResult, TALENT, ["skillset_gap", 0, "evidence_status"], "verified"),
        (SkillMatchResult, MATCH, ["match_score"], 100.5),
        (SkillMatchResult, MATCH, ["matched_skills", 0, "match_type"], "partial"),
    ],
)
def test_validation_rules(model, base, path, value):
    with pytest.raises(ValidationError):
        model.model_validate(_with(base, path, value))


def test_skills_used_must_reference_listed_skills_with_a_clear_message():
    with pytest.raises(ValidationError, match="App.*Rust"):
        CandidateProfile.model_validate(_with(PROFILE, ["projects"], [{"title": "App", "skills_used": ["Rust"]}]))


def test_blank_email_becomes_none():
    assert CandidateProfile.model_validate({**PROFILE, "email": "  "}).email is None


def test_experience_kind_is_optional_and_restricted():
    # D10: kind tags resume experience entries; missing is allowed.
    resume = _with(RESUME, ["details", "experience", 0, "kind"], "internship")
    assert ExtractedSkillList.model_validate(resume).details.experience[0].kind == "internship"
    assert ExtractedSkillList.model_validate(RESUME).details.experience[0].kind is None
    with pytest.raises(ValidationError):
        ExtractedSkillList.model_validate(_with(RESUME, ["details", "experience", 0, "kind"], "job"))


def test_resume_details_d11_fields_are_optional():
    details = ExtractedSkillList.model_validate(RESUME).details
    assert (details.name, details.email, details.certifications, details.preferred_roles) == (None, None, [], [])
    full = _with(RESUME, ["details", "certifications"], [{"title": "AWS CCP"}])
    full["details"].update(name="A", email="a@b.co", preferred_roles=["SWE"])
    assert ExtractedSkillList.model_validate(full).details.certifications[0].title == "AWS CCP"
    with pytest.raises(ValidationError):
        ExtractedSkillList.model_validate(_with(RESUME, ["details", "email"], "nope"))
