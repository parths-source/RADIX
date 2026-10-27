"""Supabase access (Postgres tables + private Storage bucket). Backend only, service-role key."""

import logging
import uuid
from datetime import datetime, timezone

import httpx

from app.config import Settings
from app.errors import AppError
from app.models.contract import CandidateProfile, ExtractedSkillList, TalentCheckResult

logger = logging.getLogger(__name__)

BUCKET = "uploads"
HEALTH_TIMEOUT_SECONDS = 4
EXTRACTION_COLUMNS = "id,source_type,source_file,company,role,skills,details,status"
PROFILE_COLUMNS = "id,name,email,education,skills,hackathons,internships,certifications,projects,preferred_roles,cv_file"
PROFILE_LIST_COLUMNS = "id,name,email,updated_at"


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
            if getattr(exc, "code", None) == "23505":  # unique violation: candidate_profiles.email
                raise AppError(409, "email_taken", "A saved profile already uses this email. Load that profile instead, or use another email.") from exc
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
        if not _is_uuid(extraction_id):
            return None
        result = self._run("get_extraction", lambda: self.client.table("extractions")
                           .select(EXTRACTION_COLUMNS).eq("id", extraction_id).limit(1).execute())
        return ExtractedSkillList.model_validate(result.data[0]) if result.data else None

    # Profiles (module 3)

    def create_profile(self, profile: CandidateProfile, source_extraction_id: str | None) -> CandidateProfile:
        row = _profile_row(profile)
        row["source_extraction_id"] = source_extraction_id
        result = self._run("create_profile", lambda: self.client.table("candidate_profiles").insert(row).execute())
        return _row_to_profile(result.data[0])

    def update_profile(self, profile_id: str, profile: CandidateProfile) -> CandidateProfile | None:
        if not _is_uuid(profile_id):
            return None
        row = _profile_row(profile)
        row["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = self._run("update_profile", lambda: self.client.table("candidate_profiles")
                           .update(row).eq("id", profile_id).execute())
        return _row_to_profile(result.data[0]) if result.data else None

    def get_profile(self, profile_id: str) -> CandidateProfile | None:
        if not _is_uuid(profile_id):
            return None
        result = self._run("get_profile", lambda: self.client.table("candidate_profiles")
                           .select(PROFILE_COLUMNS).eq("id", profile_id).limit(1).execute())
        return _row_to_profile(result.data[0]) if result.data else None

    def list_profiles(self) -> list[dict]:
        result = self._run("list_profiles", lambda: self.client.table("candidate_profiles")
                           .select(PROFILE_LIST_COLUMNS).order("updated_at", desc=True).limit(100).execute())
        return result.data

    # Results (modules 4 and 5)

    def save_talent_check(self, profile_id: str, result: TalentCheckResult) -> TalentCheckResult:
        row = {"profile_id": profile_id, **result.model_dump(mode="json")}
        self._run("save_talent_check", lambda: self.client.table("talent_check_results").insert(row).execute())
        return result


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def _profile_row(profile: CandidateProfile) -> dict:
    return profile.model_dump(mode="json", exclude={"id"})


def _row_to_profile(row: dict) -> CandidateProfile:
    """jsonb list columns are nullable in the schema; the contract wants lists."""
    data = {k: v for k, v in row.items() if k in PROFILE_COLUMNS.split(",")}
    for key in ("skills", "hackathons", "internships", "certifications", "projects", "preferred_roles"):
        data[key] = data.get(key) or []
    data["education"] = data.get("education") or ""
    return CandidateProfile.model_validate(data)
