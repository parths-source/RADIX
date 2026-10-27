from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_companies_lists_three_placeholder_companies_with_dummy_flag():
    # Real export is not in the repo yet, so the placeholder must be in use.
    body = client.get("/api/companies").json()
    assert body["dummy"] is True
    assert {c["company_key"] for c in body["companies"]} == {"google", "microsoft", "oracle"}
    assert set(body["companies"][0]) == {"company_key", "display_name"}


def test_health_flags_placeholder_company_data():
    body = client.get("/api/health").json()
    assert body["company_data_dummy"] is True
    assert body["company_data_configured"] is False
