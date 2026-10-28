"""Modules 1 and 2 over HTTP: POST /extractions/jd, POST /extractions/resume, GET /extractions/{id}."""

from dataclasses import dataclass
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ValidationError
from starlette.datastructures import UploadFile  # what request.form() returns

from app.api.deps import get_llm, get_repository
from app.config import Settings, get_settings
from app.errors import AppError
from app.models.contract import ExtractedSkillList, SourceType
from app.services import file_text, jd_analytics, resume_parsing
from app.services.extraction import saved_extraction
from app.services.llm import StructuredLLM
from app.services.repository import Repository
from app.services.samples import resolve_sample

router = APIRouter()

MODULES = {"jd": jd_analytics, "resume": resume_parsing}


class SampleRequest(BaseModel):
    sample_id: str
    mode: Optional[Literal["saved", "live"]] = None  # default: SAMPLE_EXTRACTION_MODE ("saved")


@dataclass
class _Input:
    file_name: str
    data: bytes
    content_type: str
    is_sample: bool
    mode: str = "live"


async def _read_input(request: Request, source_type: SourceType, settings: Settings) -> _Input:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        upload = form.get("file")
        if not isinstance(upload, UploadFile) or not upload.filename:
            raise AppError(422, "missing_file", "Send the document in a form field named 'file'.")
        data = await upload.read(max_bytes + 1)  # one byte over is enough to detect "too large"
        return _Input(upload.filename, data, upload.content_type or "", is_sample=False)
    if content_type.startswith("application/json"):
        try:
            body = SampleRequest.model_validate(await request.json())
        except (ValueError, ValidationError) as exc:
            raise AppError(422, "validation_error", "Send JSON like {\"sample_id\": \"jd:google_software_engineer.docx\"}.") from exc
        path = resolve_sample(settings.data_dir, body.sample_id, source_type)
        if path is None:
            raise AppError(404, "sample_not_found", f"No {source_type} sample with id '{body.sample_id}'. See GET /api/samples.")
        mime = file_text.ALLOWED_TYPES[path.suffix]
        return _Input(path.name, path.read_bytes(), mime, is_sample=True, mode=body.mode or settings.sample_extraction_mode)
    raise AppError(422, "unsupported_request", "Send multipart/form-data with a 'file' field, or JSON with a 'sample_id'.")


async def _extract(
    source_type: SourceType, request: Request, settings: Settings, llm: StructuredLLM | None, repo: Repository
) -> ExtractedSkillList:
    doc = await _read_input(request, source_type, settings)
    ext = file_text.validate_upload(doc.file_name, doc.content_type, doc.data, settings.max_upload_mb * 1024 * 1024)
    file_name = file_text.sanitize_filename(doc.file_name)
    text = await run_in_threadpool(file_text.extract_text, doc.data, ext)
    await run_in_threadpool(repo.ensure_ready)  # before the LLM call: free-tier quota is small
    extraction = None
    if doc.mode == "saved":  # demo default for samples; no LLM call
        extraction = saved_extraction(source_type, file_name, settings)
    if extraction is None:
        extraction = await run_in_threadpool(MODULES[source_type].run, text, file_name, llm, settings)
    file_path = None
    if not doc.is_sample:  # samples already live in the repo
        file_path = await run_in_threadpool(repo.upload_file, source_type, file_name, doc.data, doc.content_type)
    return await run_in_threadpool(repo.save_extraction, extraction, file_path)


@router.post("/extractions/jd", response_model=ExtractedSkillList, response_model_exclude_none=True)
async def extract_jd(
    request: Request,
    settings: Settings = Depends(get_settings),
    llm: StructuredLLM | None = Depends(get_llm),
    repo: Repository = Depends(get_repository),
):
    return await _extract("jd", request, settings, llm, repo)


@router.post("/extractions/resume", response_model=ExtractedSkillList, response_model_exclude_none=True)
async def extract_resume(
    request: Request,
    settings: Settings = Depends(get_settings),
    llm: StructuredLLM | None = Depends(get_llm),
    repo: Repository = Depends(get_repository),
):
    return await _extract("resume", request, settings, llm, repo)


@router.get("/extractions")
def list_extractions(source_type: SourceType, repo: Repository = Depends(get_repository)) -> dict:
    """Recent extractions of one type (for choosing the analyzed JD on the Skill Match screen)."""
    return {"extractions": repo.list_extractions(source_type)}


@router.get("/extractions/{extraction_id}", response_model=ExtractedSkillList, response_model_exclude_none=True)
def get_extraction(extraction_id: str, repo: Repository = Depends(get_repository)):
    extraction = repo.get_extraction(extraction_id)
    if extraction is None:
        raise AppError(404, "not_found", f"No extraction with id '{extraction_id}'.")
    return extraction
