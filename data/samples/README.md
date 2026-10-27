# Sample pack

`jds/*.docx` and `resumes/*.docx` are the hackathon's sample files, unchanged.

The `*.pdf` files are **converted**, not originals: the PDF versions were not supplied, so `scripts/make_sample_pdfs.py` renders each DOCX's text into a PDF with simplified layout. They exist to exercise the PDF upload path. `/api/samples` marks them `"converted": true`.
