"""Make text-layer PDFs of the sample DOCX files (PDF originals were not supplied).

The PDFs carry the DOCX text with simplified layout, so they exercise the PDF
upload path; they are labelled "converted" in /api/samples. Run from the repo root:

    python -m venv /tmp/pdfenv && /tmp/pdfenv/bin/pip install pymupdf python-docx
    /tmp/pdfenv/bin/python scripts/make_sample_pdfs.py
"""

import html
from pathlib import Path

import pymupdf
from docx import Document

SAMPLES = Path(__file__).resolve().parent.parent / "data" / "samples"


def convert(docx_path: Path) -> Path:
    paragraphs = [p.text.strip() for p in Document(docx_path).paragraphs if p.text.strip()]
    body = "".join(f"<p>{html.escape(t)}</p>" for t in paragraphs)
    story = pymupdf.Story(html=f"<body style='font-family: sans-serif; font-size: 10pt'>{body}</body>")
    out = docx_path.with_suffix(".pdf")
    writer = pymupdf.DocumentWriter(str(out))
    more = True
    while more:
        device = writer.begin_page(pymupdf.paper_rect("a4"))
        more, _ = story.place(pymupdf.paper_rect("a4") + (50, 50, -50, -50))
        story.draw(device)
        writer.end_page()
    writer.close()
    return out


if __name__ == "__main__":
    for path in sorted(SAMPLES.glob("*/*.docx")):
        print("wrote", convert(path).relative_to(SAMPLES))
