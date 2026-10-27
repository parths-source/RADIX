import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_llm, get_repository
from app.config import Settings, get_settings
from app.main import app
from app.models.contract import ExtractedSkillList, SkillMatchResult
from tests.fakes import FakeLLM, FakeRepository
from tests.test_profiles_api import PROFILE

client = TestClient(app)

JD = ExtractedSkillList.model_validate({
    "source_type": "jd", "source_file": "google_swe.docx", "company": "Google LLC", "role": "SWE",
    "skills": [
        {"skill_name": "Python", "category_code": "COD", "evidence": "e", "confidence": "high", "requirement_type": "required"},
        {"skill_name": "Programming", "category_code": "COD", "evidence": "e", "confidence": "high", "requirement_type": "required"},
        {"skill_name": "Kubernetes", "category_code": "CLOUD", "evidence": "e", "confidence": "high", "requirement_type": "preferred"},
    ],
})


@pytest.fixture
def repo():
    repo = FakeRepository()
    app.dependency_overrides[get_repository] = lambda: repo
    yield repo
    app.dependency_overrides.clear()


def _setup(repo):
    profile_id = client.post("/api/profiles", json=PROFILE).json()["id"]
    return profile_id, repo.save_extraction(JD, None).id


def test_skill_match_runs_and_is_stored(repo):
    profile_id, jd_id = _setup(repo)
    response = client.post(f"/api/profiles/{profile_id}/skill-match", json={"jd_extraction_id": jd_id})
    assert response.status_code == 200
    result = SkillMatchResult.model_validate(response.json())
    assert result.match_score == 40  # Python matched (1.0) of 1 + 1 + 0.5
    assert [m.skill_name for m in result.missing_skills] == ["Programming", "Kubernetes"]
    assert repo.skill_matches[0]["jd_extraction_id"] == jd_id


def test_llm_judge_is_off_by_default(repo):
    llm = FakeLLM()
    app.dependency_overrides[get_llm] = lambda: llm
    profile_id, jd_id = _setup(repo)
    client.post(f"/api/profiles/{profile_id}/skill-match", json={"jd_extraction_id": jd_id})
    assert llm.calls == []


def test_llm_judge_runs_when_enabled(repo):
    llm = FakeLLM({"verdicts": [{"jd_skill": "Programming", "candidate_skill": "Python", "reason": "language"},
                                {"jd_skill": "Kubernetes", "candidate_skill": None, "reason": "none"}]})
    app.dependency_overrides[get_llm] = lambda: llm
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, enable_llm_match=True)
    profile_id, jd_id = _setup(repo)
    body = client.post(f"/api/profiles/{profile_id}/skill-match", json={"jd_extraction_id": jd_id}).json()
    assert {m["jd_skill"]: m["match_type"] for m in body["matched_skills"]} == {"Python": "exact", "Programming": "llm"}


def test_errors(repo):
    profile_id, jd_id = _setup(repo)
    resume_id = repo.save_extraction(ExtractedSkillList(source_type="resume", source_file="cv.docx"), None).id
    empty_jd = repo.save_extraction(ExtractedSkillList(source_type="jd", source_file="empty.docx"), None).id
    cases = [
        ("nope", jd_id, 404, "not_found"),
        (profile_id, "nope", 404, "not_found"),
        (profile_id, resume_id, 422, "not_a_jd"),
        (profile_id, empty_jd, 422, "jd_has_no_skills"),
    ]
    for pid, eid, status, code in cases:
        response = client.post(f"/api/profiles/{pid}/skill-match", json={"jd_extraction_id": eid})
        assert (response.status_code, response.json()["error"]["code"]) == (status, code)
    assert repo.skill_matches == []


def test_list_jd_extractions(repo):
    _, jd_id = _setup(repo)
    repo.save_extraction(ExtractedSkillList(source_type="resume", source_file="cv.docx"), None)
    listed = client.get("/api/extractions", params={"source_type": "jd"}).json()["extractions"]
    assert [e["id"] for e in listed] == [jd_id]
    assert client.get("/api/extractions", params={"source_type": "pdf"}).status_code == 422
