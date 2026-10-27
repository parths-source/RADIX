from fastapi import APIRouter, Depends

from app.config import Settings, get_settings

router = APIRouter()


@router.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict:
    # Real export missing -> Talent Check will use the dummy placeholder file.
    # Phase 1 replaces this file check with the validating company-data loader.
    real_company_data = settings.company_data_path.is_file()
    return {
        "status": "ok",
        "db_configured": settings.db_configured,
        "llm_configured": settings.llm_configured,
        "company_data_configured": real_company_data,
        "company_data_dummy": not real_company_data,
    }
