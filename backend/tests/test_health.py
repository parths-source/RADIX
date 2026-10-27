import httpx
import pytest
from fastapi.testclient import TestClient

from app.api import health as health_module

from app.api.deps import get_company_data
from app.config import Settings, get_settings
from app.main import app
from app.services.company_data import CompanyData
from app.services.repository import check_connection

client = TestClient(app)


@pytest.fixture(autouse=True)
def fake_db_check(monkeypatch):
    """Health tests never touch the network; check_connection itself is tested below."""
    status = {"value": "not_configured"}
    monkeypatch.setattr(health_module, "check_connection", lambda settings: status["value"])
    return status


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
        "db_connected": False,
        "db_status": "not_configured",
        "llm_configured": False,
        "company_data_configured": False,
        "company_data_dummy": True,
    }


def test_health_reports_configured_services(fake_db_check):
    fake_db_check["value"] = "ok"
    app.dependency_overrides[get_company_data] = lambda: _company_data(dummy=False)
    _override(
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="service-role",
        llm_provider="google",
        llm_model="model",
        llm_api_key="key",
    )
    body = client.get("/api/health").json()
    assert body["db_configured"] is True
    assert body["db_connected"] is True
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


def test_health_flags_unsupported_llm_provider():
    _override(llm_provider="Google/Gemini", llm_model="m", llm_api_key="k")
    assert client.get("/api/health").json()["llm_configured"] is False


def _settings(url="https://example.supabase.co"):
    return Settings(_env_file=None, supabase_url=url, supabase_service_role_key="key")


@pytest.mark.parametrize(
    "response, expected",
    [
        (httpx.Response(200, json=[]), "ok"),
        (httpx.Response(401, json={}), "auth_failed"),
        (httpx.Response(404, json={"code": "PGRST205"}), "schema_missing"),
        (httpx.Response(500, json={}), "error_500"),
    ],
)
def test_check_connection_statuses(monkeypatch, response, expected):
    monkeypatch.setattr(httpx, "get", lambda *a, **k: response)
    assert check_connection(_settings()) == expected


def test_check_connection_unreachable(monkeypatch):
    def boom(*a, **k):
        raise httpx.ConnectError("no route")

    monkeypatch.setattr(httpx, "get", boom)
    assert check_connection(_settings()) == "unreachable"


def test_check_connection_rejects_url_without_scheme():
    assert check_connection(_settings(url="sb_publishable_abc")) == "invalid_url"
    assert check_connection(Settings(_env_file=None)) == "not_configured"
