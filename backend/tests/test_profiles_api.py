import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_repository
from app.main import app
from app.models.contract import CandidateProfile, ExtractedSkillList
from app.services.file_text import DOCX_MIME
from tests.fakes import FakeRepository
from tests.test_file_text import SAMPLES

client = TestClient(app)

PROFILE = {
    "name": "Test Candidate",
    "email": "test@example.com",
    "education": "B.Tech",
    "skills": [
        {"skill_name": "Python", "category_code": "COD", "evidence": "e", "confidence": "high"},
        {"skill_name": "SQL", "category_code": "SQL", "evidence": "e", "confidence": "medium"},
    ],
    "hackathons": [],
    "internships": [{"title": "Intern", "skills_used": ["Python"], "duration_months": 2}],
    "certifications": [],
    "projects": [{"title": "App", "skills_used": ["python", "SQL"]}],
    "preferred_roles": ["Data Analyst"],
}

RESUME = ExtractedSkillList.model_validate({
    "source_type": "resume", "source_file": "cv.docx",
    "skills": [{"skill_name": "Java", "category_code": "COD", "evidence": "Java", "confidence": "high"}],
    "details": {"name": "From Resume", "experience": [{"title": "Hack", "skills_used": ["Java"], "kind": "hackathon"}]},
})
JD = ExtractedSkillList.model_validate({"source_type": "jd", "source_file": "jd.docx", "skills": []})


@pytest.fixture
def repo():
    repo = FakeRepository()
    app.dependency_overrides[get_repository] = lambda: repo
    yield repo
    app.dependency_overrides.clear()


def _create(body=PROFILE, **params):
    return client.post("/api/profiles", json=body, params=params)


def test_create_get_update_round_trip(repo):
    created = _create()
    assert created.status_code == 201
    body = CandidateProfile.model_validate(created.json())
    assert body.id and body.projects[0].skills_used == ["Python", "SQL"]  # cleaned to the listed spelling
    assert client.get(f"/api/profiles/{body.id}").json() == created.json()

    changed = {**PROFILE, "name": "Renamed", "preferred_roles": ["SWE"]}
    updated = client.put(f"/api/profiles/{body.id}", json=changed)
    assert updated.status_code == 200 and updated.json()["name"] == "Renamed"
    assert client.get(f"/api/profiles/{body.id}").json()["preferred_roles"] == ["SWE"]


def test_list_profiles_newest_first(repo):
    _create()
    _create({**PROFILE, "name": "Second", "email": "second@example.com"})
    listed = client.get("/api/profiles").json()["profiles"]
    assert [p["name"] for p in listed] == ["Second", "Test Candidate"]
    assert set(listed[0]) == {"id", "name", "email", "updated_at"}


def test_missing_profile_is_404(repo):
    assert client.get("/api/profiles/nope").status_code == 404
    assert client.put("/api/profiles/nope", json=PROFILE).json()["error"]["code"] == "not_found"


@pytest.mark.parametrize(
    "change, fragment",
    [
        ({"name": "  "}, "name"),
        ({"email": "not-an-email"}, "email"),
        ({"projects": [{"title": "App", "skills_used": ["Rust"]}]}, "Rust"),
        ({"skills": [{"skill_name": "X", "category_code": "WEB", "confidence": "high"}]}, "category_code"),
    ],
)
def test_validation_errors_are_reported(repo, change, fragment):
    response = _create({**PROFILE, **change})
    assert response.status_code == 422 and response.json()["error"]["code"] == "validation_error"
    assert fragment in str(response.json()["error"]["details"])


def test_duplicate_email_is_409(repo):
    _create()
    response = _create({**PROFILE, "name": "Other"})
    assert (response.status_code, response.json()["error"]["code"]) == (409, "email_taken")


def test_source_extraction_is_recorded_and_checked(repo):
    saved = repo.save_extraction(RESUME, None)
    created = _create(source_extraction_id=saved.id).json()
    assert repo.profiles[created["id"]]["source_extraction_id"] == saved.id
    jd = repo.save_extraction(JD, None)
    assert _create(source_extraction_id=jd.id).json()["error"]["code"] == "not_a_resume"
    assert _create(source_extraction_id="missing").status_code == 404


def test_draft_from_resume(repo):
    saved = repo.save_extraction(RESUME, None)
    draft = client.post("/api/profiles/draft", json={"resume_extraction_id": saved.id}).json()
    assert draft["name"] == "From Resume" and draft["id"] is None
    assert [h["title"] for h in draft["hackathons"]] == ["Hack"]


def test_draft_merges_into_saved_profile(repo):
    profile_id = _create().json()["id"]
    saved = repo.save_extraction(RESUME, None)
    merged = client.post("/api/profiles/draft", json={"resume_extraction_id": saved.id, "base_profile_id": profile_id}).json()
    assert merged["id"] == profile_id and merged["name"] == "Test Candidate"
    assert [s["skill_name"] for s in merged["skills"]] == ["Python", "SQL", "Java"]
    # the draft is not saved until the candidate presses Save
    assert len(client.get(f"/api/profiles/{profile_id}").json()["skills"]) == 2


def test_draft_errors(repo):
    jd = repo.save_extraction(JD, None)
    assert client.post("/api/profiles/draft", json={"resume_extraction_id": jd.id}).status_code == 422
    assert client.post("/api/profiles/draft", json={"resume_extraction_id": "missing"}).status_code == 404
    resume = repo.save_extraction(RESUME, None)
    bad_base = client.post("/api/profiles/draft", json={"resume_extraction_id": resume.id, "base_profile_id": "missing"})
    assert bad_base.status_code == 404


def test_cv_upload(repo):
    data = (SAMPLES / "resumes" / "ananya_rao.docx").read_bytes()
    response = client.post("/api/profiles/cv", files={"file": ("My CV.docx", data, DOCX_MIME)})
    assert response.status_code == 200
    path = response.json()["cv_file"]
    assert path.startswith("cv/") and path.endswith("/My_CV.docx")
    assert repo.uploads[0]["path"] == path


def test_cv_upload_rejects_other_types(repo):
    response = client.post("/api/profiles/cv", files={"file": ("cv.png", b"\x89PNG", "image/png")})
    assert (response.status_code, response.json()["error"]["code"]) == (422, "unsupported_file_type")
    assert client.post("/api/profiles/cv", json={}).json()["error"]["code"] == "unsupported_request"
