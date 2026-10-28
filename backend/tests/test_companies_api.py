from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_companies_lists_three_companies_from_the_jd_derived_file():
    # data/talent_check_company_skillsets.json (D20) is in the repo, so it wins over the placeholder.
    body = client.get("/api/companies").json()
    assert body["dummy"] is False
    assert body["method"] == "derived_from_jds"
    assert "not RADIX hiring data" in body["source"]
    assert body["note"]
    assert {c["company_key"] for c in body["companies"]} == {"google", "microsoft", "oracle"}
    assert set(body["companies"][0]) == {"company_key", "display_name"}


def test_health_reports_company_data_is_not_the_placeholder(monkeypatch):
    from app.api import health as health_module

    monkeypatch.setattr(health_module, "check_connection", lambda settings: "not_configured")
    body = client.get("/api/health").json()
    assert body["company_data_dummy"] is False
    assert body["company_data_configured"] is True
