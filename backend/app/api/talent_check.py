"""Module 4 over HTTP: POST /profiles/{id}/talent-check."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_company_data, get_repository
from app.errors import AppError
from app.models.contract import TalentCheckResult
from app.services import talent_check
from app.services.company_data import CompanyData
from app.services.repository import Repository

router = APIRouter()


class TalentCheckRequest(BaseModel):
    company_key: str


@router.post("/profiles/{profile_id}/talent-check", response_model=TalentCheckResult)
def run_talent_check(
    profile_id: str,
    body: TalentCheckRequest,
    repo: Repository = Depends(get_repository),
    company_data: CompanyData = Depends(get_company_data),
):
    company = company_data.find(body.company_key)
    if company is None:
        raise AppError(404, "company_not_found", f"No company '{body.company_key}'. See GET /api/companies.")
    profile = repo.get_profile(profile_id)
    if profile is None:
        raise AppError(404, "not_found", f"No profile with id '{profile_id}'.")
    return repo.save_talent_check(profile_id, talent_check.run(profile, company))
