from fastapi.testclient import TestClient

from app.api.deps import get_company_data
from app.config import Settings, get_settings
from app.main import app
from app.services.company_data import CompanyData

client = TestClient(app)


def _override(**values):
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, **values)


def teardown_function():
    app.dependency_overrides.clear()


def _company_data(dummy: bool) -> CompanyData:
    real = app.state.company_data.model_dump(by_alias=True, mode="json")
    real["_meta"]["dummy"] = dummy
    return CompanyData.model_validate(real)


def test_health_reports_unconfigured_services():
    _override()
    app.dependency_overrides[get_company_data] = lambda: _company_data(dummy=True)
    body = client.get("/api/health").json()
    assert body == {
        "status": "ok",
        "db_configured": False,
        "llm_configured": False,
        "company_data_configured": False,
        "company_data_dummy": True,
    }


def test_health_reports_configured_services():
    app.dependency_overrides[get_company_data] = lambda: _company_data(dummy=False)
    _override(
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="service-role",
        llm_provider="provider",
        llm_model="model",
        llm_api_key="key",
    )
    body = client.get("/api/health").json()
    assert body["db_configured"] is True
    assert body["llm_configured"] is True
    assert body["company_data_configured"] is True
    assert body["company_data_dummy"] is False


def test_health_does_not_leak_secrets():
    _override(supabase_url="https://example.supabase.co", supabase_service_role_key="secret-key-value")
    assert "secret-key-value" not in client.get("/api/health").text


def test_unknown_route_uses_error_shape():
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
    assert set(response.json()["error"]) == {"code", "message", "details"}


def test_responses_carry_request_id():
    assert client.get("/api/health").headers["x-request-id"]


def test_cors_allows_only_frontend_origin():
    allowed = get_settings().frontend_origin
    ok = client.options("/api/health", headers={"Origin": allowed, "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == allowed
    bad = client.options(
        "/api/health", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"}
    )
    assert "access-control-allow-origin" not in bad.headers
