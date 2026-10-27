import pytest

from app.models.contract import CandidateProfile, ExtractedSkillList
from app.services.profile_builder import clean_profile, draft_from_resume, merge_resume


def _skill(name, code="COD", confidence="high"):
    return {"skill_name": name, "category_code": code, "evidence": "e", "confidence": confidence}


RESUME = ExtractedSkillList.model_validate({
    "source_type": "resume",
    "source_file": "cv.docx",
    "skills": [_skill("C++"), _skill("Postgres", "SQL"), _skill("Operating Systems", "OS")],
    "details": {
        "name": "Ananya Rao",
        "email": "ananya@example.com",
        "education": "B.Tech CSE",
        "preferred_roles": ["Software Engineer"],
        "projects": [{"title": "Scheduler", "skills_used": ["C++", "Operating Systems"]}],
        "experience": [
            {"title": "Backend intern", "skills_used": ["Postgres"], "kind": "internship", "duration_months": 2},
            {"title": "24h hackathon", "skills_used": ["C++"], "kind": "hackathon"},
            {"title": "Untyped event", "skills_used": []},
        ],
        "certifications": [{"title": "Linux Basics", "skills_used": ["Operating Systems"]}],
    },
})


def test_draft_prefills_every_field():
    draft = draft_from_resume(RESUME)
    assert (draft.name, draft.email, draft.education) == ("Ananya Rao", "ananya@example.com", "B.Tech CSE")
    assert [s.skill_name for s in draft.skills] == ["C++", "Postgres", "Operating Systems"]
    assert [e.title for e in draft.internships] == ["Backend intern"]
    assert draft.internships[0].duration_months == 2
    assert [e.title for e in draft.projects] == ["Scheduler"]
    assert [e.title for e in draft.certifications] == ["Linux Basics"]
    assert draft.preferred_roles == ["Software Engineer"]
    assert draft.id is None


def test_entries_without_kind_go_to_hackathons():
    # D10: a missing kind is treated as a hackathon (the lower experience tier).
    assert [e.title for e in draft_from_resume(RESUME).hackathons] == ["24h hackathon", "Untyped event"]


def test_draft_without_name_is_allowed_but_cannot_be_saved_as_is():
    no_name = RESUME.model_copy(update={"details": RESUME.details.model_copy(update={"name": None})})
    draft = draft_from_resume(no_name)
    assert draft.name == ""
    with pytest.raises(ValueError):
        CandidateProfile.model_validate(draft.model_dump())


def test_draft_is_a_valid_profile_once_named():
    CandidateProfile.model_validate(draft_from_resume(RESUME).model_dump())


def test_jd_extraction_is_rejected():
    jd = ExtractedSkillList.model_validate({"source_type": "jd", "source_file": "jd.docx", "skills": []})
    with pytest.raises(ValueError, match="resume"):
        draft_from_resume(jd)


def _saved_profile():
    return CandidateProfile.model_validate({
        "id": "p1",
        "name": "Ananya R.",  # edited by the candidate
        "email": None,
        "skills": [_skill("PostgreSQL", "SQL", "medium"), _skill("Git", "SWE")],
        "hackathons": [],
        "internships": [{"title": "backend  intern", "description": "edited", "skills_used": ["PostgreSQL"]}],
        "certifications": [],
        "projects": [],
        "preferred_roles": ["software engineer", "SRE"],
    })


def test_merge_keeps_candidate_edits_and_adds_new_items():
    merged = merge_resume(_saved_profile(), RESUME)
    assert merged.id == "p1" and merged.name == "Ananya R."
    assert merged.email == "ananya@example.com"  # empty field filled from the resume
    names = [s.skill_name for s in merged.skills]
    assert names == ["PostgreSQL", "Git", "C++", "Operating Systems"]  # Postgres is an alias of PostgreSQL
    assert merged.skills[0].confidence == "medium"  # the candidate's version wins
    assert [e.description for e in merged.internships] == ["edited"]  # same title, not duplicated
    assert [e.title for e in merged.projects] == ["Scheduler"]
    assert merged.preferred_roles == ["software engineer", "SRE"]


def test_merge_maps_skills_used_to_the_profiles_spelling():
    profile = _saved_profile().model_copy(update={"internships": []})
    merged = merge_resume(profile, RESUME)
    assert merged.internships[0].skills_used == ["PostgreSQL"]  # resume said "Postgres"


def test_merge_is_idempotent():
    once = merge_resume(_saved_profile(), RESUME)
    twice = merge_resume(CandidateProfile.model_validate(once.model_dump()), RESUME)
    assert twice == once


def test_clean_profile_dedupes_skills_and_roles():
    profile = CandidateProfile.model_validate({
        "name": "X",
        "skills": [_skill("PostgreSQL", "SQL"), _skill("postgres", "SQL"), _skill("JS")],
        "projects": [{"title": "App", "skills_used": ["postgres", "PostgreSQL", "JS"]}],
        "hackathons": [], "internships": [], "certifications": [],
        "preferred_roles": ["SWE", " swe ", "Data Analyst"],
    })
    cleaned = clean_profile(profile, "id-1")
    assert cleaned.id == "id-1"
    assert [s.skill_name for s in cleaned.skills] == ["PostgreSQL", "JS"]
    assert cleaned.projects[0].skills_used == ["PostgreSQL", "JS"]
    assert cleaned.preferred_roles == ["SWE", "Data Analyst"]
