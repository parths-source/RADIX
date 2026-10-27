"""Supabase access (Postgres tables + private Storage bucket). Backend only, service-role key."""

import logging
import uuid

import httpx

from app.config import Settings
from app.errors import AppError
from app.models.contract import ExtractedSkillList

logger = logging.getLogger(__name__)

BUCKET = "uploads"
HEALTH_TIMEOUT_SECONDS = 4
EXTRACTION_COLUMNS = "id,source_type,source_file,company,role,skills,details,status"


def check_connection(settings: Settings) -> str:
    """Real round trip to the extractions table. Returns a status code for /api/health."""
    if not settings.db_configured:
        return "not_configured"
    url = settings.supabase_url.rstrip("/")
    if not url.startswith(("https://", "http://")):
        return "invalid_url"
    key = settings.supabase_service_role_key
    try:
        response = httpx.get(
            f"{url}/rest/v1/extractions",
            params={"select": "id", "limit": 1},
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            timeout=HEALTH_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError:
        return "unreachable"
    if response.status_code == 200:
        return "ok"
    if response.status_code in (401, 403):
        return "auth_failed"
    if response.status_code == 404 or "PGRST205" in response.text:  # table not in schema cache
        return "schema_missing"
    return f"error_{response.status_code}"


class Repository:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._client = None

    @property
    def client(self):
        if self._client is None:
            if not self._settings.db_configured:
                raise AppError(503, "db_not_configured", "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.")
            from supabase import create_client

            try:
                self._client = create_client(self._settings.supabase_url, self._settings.supabase_service_role_key)
            except Exception as exc:
                raise AppError(503, "db_unavailable", "Could not connect to Supabase. Check SUPABASE_URL and the key in backend/.env.") from exc
        return self._client

    def ensure_ready(self) -> None:
        """Fail fast on a bad configuration, before spending an LLM call."""
        _ = self.client

    def _run(self, action: str, fn):
        try:
            return fn()
        except AppError:
            raise
        except Exception as exc:
            logger.warning("db_error action=%s error=%s", action, type(exc).__name__)
            raise AppError(503, "db_unavailable", f"The database request failed ({action}). Check /api/health.") from exc

    def upload_file(self, folder: str, filename: str, data: bytes, content_type: str) -> str:
        path = f"{folder}/{uuid.uuid4()}/{filename}"
        self._run("upload_file", lambda: self.client.storage.from_(BUCKET).upload(
            path, data, {"content-type": content_type}
        ))
        return path

    def save_extraction(self, extraction: ExtractedSkillList, file_path: str | None) -> ExtractedSkillList:
        row = extraction.model_dump(mode="json", exclude={"id"})
        row["file_path"] = file_path
        result = self._run("save_extraction", lambda: self.client.table("extractions").insert(row).execute())
        return extraction.model_copy(update={"id": result.data[0]["id"]})

    def get_extraction(self, extraction_id: str) -> ExtractedSkillList | None:
        try:
            uuid.UUID(extraction_id)
        except ValueError:
            return None
        result = self._run("get_extraction", lambda: self.client.table("extractions")
                           .select(EXTRACTION_COLUMNS).eq("id", extraction_id).limit(1).execute())
        return ExtractedSkillList.model_validate(result.data[0]) if result.data else None
