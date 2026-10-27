"""Module 3 over HTTP: profile CRUD, a pre-filled draft from a resume extraction, CV upload."""

from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from starlette.datastructures import UploadFile  # what request.form() returns

from app.api.deps import get_repository
from app.config import Settings, get_settings
from app.errors import AppError
from app.models.contract import CandidateProfile, ExtractedSkillList
from app.services import file_text, profile_builder
from app.services.profile_builder import ProfileDraft
from app.services.repository import Repository

router = APIRouter()


class DraftRequest(BaseModel):
    resume_extraction_id: str
    base_profile_id: Optional[str] = None  # set to merge the resume into a saved profile


def _resume_extraction(repo: Repository, extraction_id: str) -> ExtractedSkillList:
    extraction = repo.get_extraction(extraction_id)
    if extraction is None:
        raise AppError(404, "not_found", f"No extraction with id '{extraction_id}'.")
    if extraction.source_type != "resume":
        raise AppError(422, "not_a_resume", "That extraction is a JD. Build the profile from a parsed resume.")
    return extraction


def _profile_or_404(repo: Repository, profile_id: str) -> CandidateProfile:
    profile = repo.get_profile(profile_id)
    if profile is None:
        raise AppError(404, "not_found", f"No profile with id '{profile_id}'.")
    return profile


@router.get("/profiles")
def list_profiles(repo: Repository = Depends(get_repository)) -> dict:
    return {"profiles": repo.list_profiles()}


@router.post("/profiles/draft", response_model=ProfileDraft)
def draft_profile(body: DraftRequest, repo: Repository = Depends(get_repository)):
    extraction = _resume_extraction(repo, body.resume_extraction_id)
    if body.base_profile_id is None:
        return profile_builder.draft_from_resume(extraction)
    return profile_builder.merge_resume(_profile_or_404(repo, body.base_profile_id), extraction)


@router.post("/profiles", response_model=CandidateProfile, status_code=201)
def create_profile(
    profile: CandidateProfile, source_extraction_id: Optional[str] = None, repo: Repository = Depends(get_repository)
):
    if source_extraction_id is not None:
        _resume_extraction(repo, source_extraction_id)
    return repo.create_profile(profile_builder.clean_profile(profile), source_extraction_id)


@router.get("/profiles/{profile_id}", response_model=CandidateProfile)
def get_profile(profile_id: str, repo: Repository = Depends(get_repository)):
    return _profile_or_404(repo, profile_id)


@router.put("/profiles/{profile_id}", response_model=CandidateProfile)
def update_profile(profile_id: str, profile: CandidateProfile, repo: Repository = Depends(get_repository)):
    updated = repo.update_profile(profile_id, profile_builder.clean_profile(profile, profile_id))
    if updated is None:
        raise AppError(404, "not_found", f"No profile with id '{profile_id}'.")
    return updated


@router.post("/profiles/cv")
async def upload_cv(
    request: Request, settings: Settings = Depends(get_settings), repo: Repository = Depends(get_repository)
) -> dict:
    """Store a CV (PDF/DOCX) in the private bucket; the form puts the returned path in cv_file."""
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if not request.headers.get("content-type", "").startswith("multipart/form-data"):
        raise AppError(422, "unsupported_request", "Send multipart/form-data with a 'file' field.")
    upload = (await request.form()).get("file")
    if not isinstance(upload, UploadFile) or not upload.filename:
        raise AppError(422, "missing_file", "Send the CV in a form field named 'file'.")
    data = await upload.read(max_bytes + 1)
    file_text.validate_upload(upload.filename, upload.content_type, data, max_bytes)
    path = await run_in_threadpool(
        repo.upload_file, "cv", file_text.sanitize_filename(upload.filename), data, upload.content_type or ""
    )
    return {"cv_file": path}
