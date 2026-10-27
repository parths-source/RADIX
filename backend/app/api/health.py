from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from app.api.deps import get_company_data
from app.config import Settings, get_settings
from app.services.company_data import CompanyData
from app.services.llm import SUPPORTED_PROVIDERS
from app.services.repository import check_connection

router = APIRouter()


@router.get("/health")
async def health(
    settings: Settings = Depends(get_settings),
    company_data: CompanyData = Depends(get_company_data),
) -> dict:
    db_status = await run_in_threadpool(check_connection, settings)
    return {
        "status": "ok",
        "db_configured": settings.db_configured,
        "db_connected": db_status == "ok",
        "db_status": db_status,
        "llm_configured": settings.llm_configured
        and settings.llm_provider.strip().lower() in SUPPORTED_PROVIDERS,
        "company_data_configured": not company_data.dummy,
        "company_data_dummy": company_data.dummy,
    }
