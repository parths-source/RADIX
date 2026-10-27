"""Runtime settings, read from environment variables and backend/.env."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    llm_provider: str = ""
    llm_model: str = ""
    llm_api_key: str = ""
    llm_fallback_model: str = ""  # optional; tried when the main model errors (e.g. 503 overload)
    enable_llm_match: bool = False

    frontend_origin: str = "http://localhost:5173"

    max_upload_mb: int = 5
    llm_max_input_chars: int = 20000

    data_dir: Path = REPO_ROOT / "data"

    @property
    def db_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_provider and self.llm_model and self.llm_api_key)

    @property
    def company_data_path(self) -> Path:
        return self.data_dir / "company_skillsets.json"

    @property
    def company_data_placeholder_path(self) -> Path:
        return self.data_dir / "company_skillsets.placeholder.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
