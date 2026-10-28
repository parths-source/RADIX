from fastapi import APIRouter, Depends

from app.api.deps import get_company_data
from app.services.company_data import CompanyData

router = APIRouter()


@router.get("/companies")
def list_companies(company_data: CompanyData = Depends(get_company_data)) -> dict:
    return {
        "dummy": company_data.dummy,
        "source": company_data.meta.source,
        "method": company_data.meta.method,
        "note": company_data.meta.note,
        "companies": [
            {"company_key": c.company_key, "display_name": c.display_name} for c in company_data.companies
        ],
    }
