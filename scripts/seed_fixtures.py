"""Run the real extractor on sample files and save the results as fixtures (PLAN.md section 5.4).

A result is saved only if every LLM call was answered by the PRIMARY model (LLM_MODEL)
and the extraction status is "ok". Anything else is reported and not saved. Fixtures
are never edited by hand. Run from backend/:

    .venv/bin/python ../scripts/seed_fixtures.py data/samples/resumes/ananya_rao.docx ...
"""

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.config import REPO_ROOT, get_settings  # noqa: E402
from app.models.contract import ExtractedSkillList  # noqa: E402
from app.services import file_text, jd_analytics, resume_parsing  # noqa: E402
from app.services.llm import make_structured_llm  # noqa: E402

FIXTURES = REPO_ROOT / "data" / "fixtures"


def write_fixture(extraction: ExtractedSkillList, model: str, prompt_version: str, generated_at: str) -> Path:
    path = FIXTURES / f"{Path(extraction.source_file).stem}.json"
    meta = {"model": model, "prompt_version": prompt_version, "generated_at": generated_at,
            "note": "Saved unedited from a real extractor run."}
    payload = {"_meta": meta, "extraction": extraction.model_dump(mode="json", exclude_none=True)}
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def main(paths: list[str]) -> int:
    settings = get_settings()
    llm = make_structured_llm(settings)
    if llm is None:
        print("No LLM configured; nothing saved.")
        return 1
    failures = 0
    for rel in paths:
        path = REPO_ROOT / rel
        module = jd_analytics if "/jds/" in rel else resume_parsing
        models_used: list[str | None] = []

        def recording_llm(schema, system, user):
            result = llm(schema, system, user)
            models_used.append(result.model)
            return result

        text = file_text.extract_text(path.read_bytes(), path.suffix)
        try:
            extraction = module.run(text, path.name, recording_llm, settings)
        except Exception as exc:
            print(f"NOT SAVED {rel}: {exc}")
            failures += 1
            continue
        if extraction.status != "ok" or any(m != settings.llm_model for m in models_used):
            print(f"NOT SAVED {rel}: status={extraction.status} models={models_used} (primary is {settings.llm_model})")
            failures += 1
            continue
        saved = write_fixture(extraction, settings.llm_model, module.SPEC.prompt_version, date.today().isoformat())
        print(f"SAVED {saved.relative_to(REPO_ROOT)} model={settings.llm_model} calls={len(models_used)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
