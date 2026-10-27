import json

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_llm, get_repository
from app.config import REPO_ROOT, Settings, get_settings
from app.main import app
from app.models.contract import ExtractedSkillList
from app.services.file_text import DOCX_MIME
from app.services.llm import LLMResult
from tests.fakes import JD_OUT, RESUME_OUT, FakeLLM, FakeRepository
from tests.test_file_text import BLANK_PDF

client = TestClient(app)
SAMPLES = REPO_ROOT / "data" / "samples"
JD_SAMPLE = "jd:google_software_engineer.docx"


@pytest.fixture
def repo():
    return FakeRepository()


@pytest.fixture
def use(repo, tmp_path):
    """use(llm, fixtures={...}) wires the fakes; data_dir is a temp copy with real samples."""
    (tmp_path / "samples").symlink_to(SAMPLES)
    (tmp_path / "fixtures").mkdir()

    def _use(llm, fixtures=None):
        for name, data in (fixtures or {}).items():
            meta = {"model": "test-model", "prompt_version": "test", "generated_at": "2026-10-28"}
            (tmp_path / "fixtures" / name).write_text(json.dumps({"_meta": meta, "extraction": data}))
        app.dependency_overrides[get_llm] = lambda: llm
        app.dependency_overrides[get_repository] = lambda: repo
        app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, data_dir=tmp_path)

    yield _use
    app.dependency_overrides.clear()


def _upload(path, name=None, content_type=DOCX_MIME, kind="jd"):
    data = path.read_bytes() if hasattr(path, "read_bytes") else path
    return client.post(f"/api/extractions/{kind}", files={"file": (name or path.name, data, content_type)})


def test_samples_lists_docx_and_converted_pdfs(use):
    use(None)
    samples = client.get("/api/samples").json()["samples"]
    ids = {s["sample_id"] for s in samples}
    assert JD_SAMPLE in ids and "resume:priya_menon.pdf" in ids
    assert len([s for s in samples if s["source_type"] == "jd"]) == 12
    assert all(s["converted"] == (s["format"] == "pdf") for s in samples)


def test_jd_from_sample(use, repo):
    use(FakeLLM(JD_OUT))
    response = client.post("/api/extractions/jd", json={"sample_id": JD_SAMPLE})
    assert response.status_code == 200
    body = ExtractedSkillList.model_validate(response.json())
    assert body.id in repo.extractions and body.status == "ok"
    assert body.source_file == "google_software_engineer.docx"
    assert repo.uploads == []  # samples are not re-uploaded


def test_resume_upload_pdf_is_stored(use, repo):
    use(FakeLLM(RESUME_OUT))
    response = _upload(SAMPLES / "resumes" / "priya_menon.pdf", content_type="application/pdf", kind="resume")
    assert response.status_code == 200
    body = response.json()
    assert body["details"]["experience"][0]["kind"] == "internship"
    assert repo.uploads[0]["path"].startswith("resume/") and repo.uploads[0]["path"].endswith("/priya_menon.pdf")


def test_get_extraction_round_trip(use):
    use(FakeLLM(JD_OUT))
    created = client.post("/api/extractions/jd", json={"sample_id": JD_SAMPLE}).json()
    assert client.get(f"/api/extractions/{created['id']}").json() == created
    missing = client.get("/api/extractions/00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404 and missing.json()["error"]["code"] == "not_found"


def test_retry_then_fallback_then_502(use):
    fixture = {"source_type": "jd", "source_file": "google_software_engineer.docx", "skills": []}
    bad = LLMResult(parsed=None, error="bad")
    use(FakeLLM(bad, bad), fixtures={"google_software_engineer.json": fixture})
    assert client.post("/api/extractions/jd", json={"sample_id": JD_SAMPLE}).json()["status"] == "fallback"

    use(FakeLLM(bad, bad))
    response = client.post("/api/extractions/jd", json={"sample_id": "jd:microsoft_data_analyst.docx"})
    assert response.status_code == 502 and response.json()["error"]["code"] == "extraction_failed"


def test_no_llm_key_uses_fixture_or_502(use):
    fixture = {"source_type": "resume", "source_file": "ananya_rao.docx", "skills": []}
    use(None, fixtures={"ananya_rao.json": fixture})
    ok = client.post("/api/extractions/resume", json={"sample_id": "resume:ananya_rao.docx"})
    assert ok.json()["status"] == "fallback"
    missing = client.post("/api/extractions/resume", json={"sample_id": "resume:rohan_verma.docx"})
    assert missing.status_code == 502


@pytest.mark.parametrize(
    "kwargs, status, code",
    [
        ({"path": b"hello", "name": "cv.txt", "content_type": "text/plain"}, 422, "unsupported_file_type"),
        ({"path": b"%PDF" + b"0" * (5 * 1024 * 1024), "name": "big.pdf", "content_type": "application/pdf"}, 413, "file_too_large"),
        ({"path": BLANK_PDF, "name": "scan.pdf", "content_type": "application/pdf"}, 422, "no_extractable_text"),
    ],
)
def test_bad_uploads(use, kwargs, status, code):
    use(FakeLLM(JD_OUT))
    response = _upload(**kwargs)
    assert (response.status_code, response.json()["error"]["code"]) == (status, code)


@pytest.mark.parametrize(
    "request_kwargs, status, code",
    [
        ({"json": {"sample_id": "jd:../../.env"}}, 404, "sample_not_found"),
        ({"json": {"sample_id": "resume:ananya_rao.docx"}}, 404, "sample_not_found"),  # resume id on JD endpoint
        ({"json": {"wrong": 1}}, 422, "validation_error"),
        ({"content": b"plain", "headers": {"content-type": "text/plain"}}, 422, "unsupported_request"),
        ({"data": {"x": "1"}, "files": {"other": ("a.txt", b"x")}}, 422, "missing_file"),
    ],
)
def test_bad_requests(use, request_kwargs, status, code):
    use(FakeLLM(JD_OUT))
    response = client.post("/api/extractions/jd", **request_kwargs)
    assert (response.status_code, response.json()["error"]["code"]) == (status, code)


def test_db_misconfiguration_fails_before_the_llm_call(use, tmp_path):
    from app.services.repository import Repository

    llm = FakeLLM(JD_OUT)
    use(llm)
    app.dependency_overrides[get_repository] = lambda: Repository(Settings(_env_file=None))
    response = client.post("/api/extractions/jd", json={"sample_id": JD_SAMPLE})
    assert (response.status_code, response.json()["error"]["code"]) == (503, "db_not_configured")
    assert llm.calls == []
