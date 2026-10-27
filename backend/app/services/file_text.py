"""Upload checks and raw text extraction for PDF and DOCX (PLAN.md section 10, file rules)."""

import io
import re
from pathlib import PurePath

import pdfplumber
from docx import Document
from docx.table import Table

from app.errors import AppError

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
ALLOWED_TYPES = {".pdf": "application/pdf", ".docx": DOCX_MIME}
MAGIC = {".pdf": b"%PDF", ".docx": b"PK"}  # DOCX is a zip archive


def sanitize_filename(name: str) -> str:
    base = PurePath(name.replace("\\", "/")).name
    stem, dot, ext = base.rpartition(".")
    if not dot:
        stem, ext = base, ""
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._") or "file"
    ext = re.sub(r"[^A-Za-z0-9]", "", ext).lower()
    return f"{stem[:100]}.{ext}" if ext else stem[:100]


def validate_upload(filename: str, content_type: str | None, data: bytes, max_bytes: int) -> str:
    """Return the file extension (.pdf or .docx), or raise AppError."""
    ext = PurePath(filename.lower()).suffix
    if ext not in ALLOWED_TYPES:
        raise AppError(422, "unsupported_file_type", "Upload a .pdf or .docx file.", {"file_name": filename})
    if (content_type or "").split(";")[0].strip().lower() != ALLOWED_TYPES[ext]:
        raise AppError(
            422,
            "unsupported_file_type",
            f"The file's content type does not match {ext}. Re-save it as a real {ext} file and upload again.",
            {"content_type": content_type},
        )
    if len(data) > max_bytes:
        raise AppError(
            413, "file_too_large", f"The file is larger than {max_bytes // (1024 * 1024)} MB.", {"size": len(data)}
        )
    if not data.startswith(MAGIC[ext]):
        raise AppError(422, "unsupported_file_type", f"The file is not a valid {ext} file.")
    return ext


def extract_text(data: bytes, ext: str) -> str:
    try:
        text = _pdf_text(data) if ext == ".pdf" else _docx_text(data)
    except Exception as exc:  # corrupt or encrypted files raise many different errors
        raise AppError(422, "unreadable_file", f"The {ext} file could not be read. Check that it opens normally.") from exc
    if not text.strip():
        raise AppError(
            422,
            "no_extractable_text",
            "No text could be read from the file. Scanned PDFs (images of text) are not supported; upload a PDF with selectable text or a DOCX.",
        )
    return text


def _pdf_text(data: bytes) -> str:
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _docx_text(data: bytes) -> str:
    lines: list[str] = []
    for block in Document(io.BytesIO(data)).iter_inner_content():
        if isinstance(block, Table):
            for row in block.rows:
                cells = [c.text.strip() for c in row.cells]
                lines.append(" | ".join(c for c in dict.fromkeys(cells) if c))
        else:
            lines.append(block.text)
    return "\n".join(line for line in lines if line.strip())
