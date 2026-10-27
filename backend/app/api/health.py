from fastapi import APIRouter, Depends

from app.api.deps import get_company_data
from app.config import Settings, get_settings
from app.services.company_data import CompanyData

router = APIRouter()


@router.get("/health")
def health(
    settings: Settings = Depends(get_settings),
    company_data: CompanyData = Depends(get_company_data),
) -> dict:
    return {
        "status": "ok",
        "db_configured": settings.db_configured,
        "llm_configured": settings.llm_configured,
        "company_data_configured": not company_data.dummy,
        "company_data_dummy": company_data.dummy,
    }
