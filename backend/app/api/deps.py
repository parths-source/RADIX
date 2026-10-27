from fastapi import Request

from app.services.company_data import CompanyData


def get_company_data(request: Request) -> CompanyData:
    return request.app.state.company_data
