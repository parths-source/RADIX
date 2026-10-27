import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_repository
from app.main import app
from app.models.contract import TalentCheckResult
from tests.fakes import FakeRepository
from tests.test_profiles_api import PROFILE

client = TestClient(app)


@pytest.fixture
def repo():
    repo = FakeRepository()
    app.dependency_overrides[get_repository] = lambda: repo
    yield repo
    app.dependency_overrides.clear()


def test_talent_check_runs_and_is_stored(repo):
    profile_id = client.post("/api/profiles", json=PROFILE).json()["id"]
    response = client.post(f"/api/profiles/{profile_id}/talent-check", json={"company_key": "oracle"})
    assert response.status_code == 200
    result = TalentCheckResult.model_validate(response.json())
    assert result.company == "Oracle Financial Services Software Limited"
    assert len(result.skillset_gap) == 12 and result.scoring_version == "tc-v0.1"
    assert repo.talent_checks[0]["profile_id"] == profile_id


def test_company_can_be_named_by_alias(repo):
    profile_id = client.post("/api/profiles", json=PROFILE).json()["id"]
    assert client.post(f"/api/profiles/{profile_id}/talent-check", json={"company_key": "Google LLC"}).status_code == 200


def test_unknown_company_or_profile_is_404(repo):
    profile_id = client.post("/api/profiles", json=PROFILE).json()["id"]
    bad_company = client.post(f"/api/profiles/{profile_id}/talent-check", json={"company_key": "amazon"})
    assert (bad_company.status_code, bad_company.json()["error"]["code"]) == (404, "company_not_found")
    bad_profile = client.post("/api/profiles/nope/talent-check", json={"company_key": "google"})
    assert (bad_profile.status_code, bad_profile.json()["error"]["code"]) == (404, "not_found")
    assert repo.talent_checks == []


def test_body_is_validated(repo):
    response = client.post("/api/profiles/x/talent-check", json={})
    assert response.status_code == 422 and response.json()["error"]["code"] == "validation_error"
