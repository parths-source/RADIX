"""All five modules back to back through the HTTP API (fake LLM and repository)."""

from fastapi.testclient import TestClient

from app.api.deps import get_llm, get_repository
from app.main import app
from app.models.contract import CandidateProfile, ExtractedSkillList, SkillMatchResult, TalentCheckResult
from tests.fakes import FakeLLM, FakeRepository

client = TestClient(app)

JD_OUT = {
    "company": "Google LLC", "role": "Software Engineer",
    "skills": [
        {"skill_name": "C++", "category_code": "COD", "evidence": "C++", "confidence": "high", "requirement_type": "required"},
        {"skill_name": "Operating Systems", "category_code": "OS", "evidence": "OS", "confidence": "high", "requirement_type": "required"},
        {"skill_name": "Kubernetes", "category_code": "CLOUD", "evidence": "k8s", "confidence": "medium", "requirement_type": "preferred"},
    ],
}
RESUME_OUT = {
    "name": "Flow Candidate", "email": "flow@example.com", "preferred_roles": ["Software Engineer"],
    "skills": [
        {"skill_name": "C++", "category_code": "COD", "evidence": "C++", "confidence": "high"},
        {"skill_name": "OS", "category_code": "OS", "evidence": "OS", "confidence": "medium"},
    ],
    "education": "B.Tech",
    "projects": [{"title": "Scheduler", "skills_used": ["C++", "OS"]}],
    "experience": [{"title": "Intern", "skills_used": ["C++"], "kind": "internship"}],
}


def test_pick_jd_parse_resume_build_profile_talent_check_skill_match():
    repo = FakeRepository()
    llm = FakeLLM(JD_OUT, RESUME_OUT)
    app.dependency_overrides[get_repository] = lambda: repo
    app.dependency_overrides[get_llm] = lambda: llm
    try:
        jd = ExtractedSkillList.model_validate(
            client.post("/api/extractions/jd", json={"sample_id": "jd:google_software_engineer.docx"}).json())
        resume = ExtractedSkillList.model_validate(
            client.post("/api/extractions/resume", json={"sample_id": "resume:ananya_rao.docx"}).json())

        draft = client.post("/api/profiles/draft", json={"resume_extraction_id": resume.id}).json()
        assert draft["name"] == "Flow Candidate" and [i["title"] for i in draft["internships"]] == ["Intern"]
        created = client.post("/api/profiles", json=draft, params={"source_extraction_id": resume.id})
        profile = CandidateProfile.model_validate(created.json())

        talent = TalentCheckResult.model_validate(
            client.post(f"/api/profiles/{profile.id}/talent-check", json={"company_key": jd.company}).json())
        assert talent.company == "Google LLC" and 0 <= talent.readiness_score <= 100

        match = SkillMatchResult.model_validate(
            client.post(f"/api/profiles/{profile.id}/skill-match", json={"jd_extraction_id": jd.id}).json())
        assert {m.jd_skill: m.match_type for m in match.matched_skills} == {"C++": "exact", "Operating Systems": "alias"}
        assert [m.skill_name for m in match.missing_skills] == ["Kubernetes"]
        assert match.match_score == 80  # (1 + 1) / (1 + 1 + 0.5)
        assert match.llm_judge == "off"
    finally:
        app.dependency_overrides.clear()
