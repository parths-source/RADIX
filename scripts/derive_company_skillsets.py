"""Derive data/talent_check_company_skillsets.json from the saved JD extractions (decision D20).

The organizers supplied no company export, so each company's bar comes from its own sample JDs
(data/fixtures, saved runs of the real extractor) by the rule in app/services/company_derivation.py.
Prints the table; writes the file only with --write. Run from backend/:

    .venv/bin/python ../scripts/derive_company_skillsets.py          # show the table
    .venv/bin/python ../scripts/derive_company_skillsets.py --write  # and save it
"""

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.config import REPO_ROOT, get_settings  # noqa: E402
from app.models.contract import SKILLSET_CODES, ExtractedSkillList  # noqa: E402
from app.services.company_data import load_company_data  # noqa: E402
from app.services.company_derivation import derive_company_data  # noqa: E402


def main(write: bool) -> int:
    settings = get_settings()
    template = load_company_data(REPO_ROOT / "data" / "none.json", settings.company_data_placeholder_path)
    jds = []
    for path in sorted((REPO_ROOT / "data" / "fixtures").glob("*.json")):
        extraction = ExtractedSkillList.model_validate(json.loads(path.read_text(encoding="utf-8"))["extraction"])
        if extraction.source_type == "jd":
            jds.append(extraction)
    data = derive_company_data(template, jds, date.today())

    print(f"{'company':<12}" + "".join(f"{c.value:>6}" for c in SKILLSET_CODES))
    for company in data["companies"]:
        levels = {s["category_code"]: s["required_level"] for s in company["skillsets"]}
        print(f"{company['company_key']:<12}" + "".join(f"{levels[c.value]:>6}" for c in SKILLSET_CODES))
        print(f"{'':<12}from {', '.join(company['derived_from'])}")

    if write:
        out = settings.company_data_path
        out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        load_company_data(out, settings.company_data_placeholder_path)  # fails loudly if invalid
        print(f"Wrote {out.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv[1:]))
