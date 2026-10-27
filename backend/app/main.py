from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import companies, extractions, health, profiles, samples, talent_check
from app.config import get_settings
from app.errors import register_error_handlers
from app.logging_setup import configure_logging, register_request_logging
from app.services.company_data import load_company_data


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(title="RADIX Talent Match API", version="0.1.0")
    # Fails loudly at startup if the company file is missing or invalid.
    app.state.company_data = load_company_data(
        settings.company_data_path, settings.company_data_placeholder_path
    )
    register_error_handlers(app)
    register_request_logging(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api")
    app.include_router(companies.router, prefix="/api")
    app.include_router(samples.router, prefix="/api")
    app.include_router(extractions.router, prefix="/api")
    app.include_router(profiles.router, prefix="/api")
    app.include_router(talent_check.router, prefix="/api")
    return app


app = create_app()
