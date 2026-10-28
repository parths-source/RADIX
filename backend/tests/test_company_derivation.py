"""Company bars derived from the sample JDs (D20): the rule, and the committed file."""

import json
from datetime import date

import pytest

from app.config import REPO_ROOT, get_settings
from app.models.contract import SKILLSET_CODES, CategoryCode, ExtractedSkillList
from app.scoring import config as cfg
from app.services.company_data import CompanyData, load_company_data
from app.services.company_derivation import METHOD, derive_company_data, level_for, weighted_counts

TEMPLATE = load_company_data(REPO_ROOT / "data" / "none.json", REPO_ROOT / "data" / "company_skillsets.placeholder.json")


def _jd(company: str, skills: list[tuple[str, str, str | None]], source_file: str = "jd.docx") -> ExtractedSkillList:
    return ExtractedSkillList.model_validate({
        "source_type": "jd",
        "source_file": source_file,
        "company": company,
        "role": "Engineer",
        "skills": [
            {"skill_name": name, "category_code": code, "evidence": "from the JD", "confidence": "high", "requirement_type": req}
            for name, code, req in skills
        ],
    })


def _fixture_jds() -> list[ExtractedSkillList]:
    jds = []
    for path in sorted((REPO_ROOT / "data" / "fixtures").glob("*.json")):
        extraction = ExtractedSkillList.model_validate(json.loads(path.read_text())["extraction"])
        if extraction.source_type == "jd":
            jds.append(extraction)
    return jds


@pytest.mark.parametrize(("weighted", "level"), [(0, 2), (0.5, 3), (1, 3), (3, 5), (4.5, 7), (40, 8)])
def test_level_rule(weighted, level):
    assert level_for(weighted) == level


def test_level_rule_stays_inside_its_bounds():
    assert level_for(0) == cfg.COMPANY_BASE_LEVEL
    assert level_for(1000) == cfg.COMPANY_MAX_LEVEL


def test_weighted_counts_dedupe_preferred_half_and_other_ignored():
    jds = [
        _jd("Google LLC", [("SQL", "SQL", "required"), ("Spark", "SQL", "preferred"), ("Teamwork", "OTHER", None)]),
        # SQL again (counts once, and required beats preferred); Python with no requirement_type counts as required
        _jd("Google LLC", [(" sql ", "SQL", "preferred"), ("Python", "COD", None)]),
    ]
    counts = weighted_counts(jds)
    assert set(counts) == set(SKILLSET_CODES)
    assert counts[CategoryCode.SQL] == 1.5
    assert counts[CategoryCode.COD] == 1.0
    assert counts[CategoryCode.OS] == 0.0


def test_derived_file_has_every_company_with_twelve_levels_and_is_marked():
    data = derive_company_data(TEMPLATE, _fixture_jds(), date(2026, 10, 28))
    parsed = CompanyData.model_validate(data)
    assert parsed.dummy is False
    assert parsed.meta.method == METHOD
    assert "not RADIX hiring data" in parsed.meta.source
    assert {c.company_key for c in parsed.companies} == {"google", "microsoft", "oracle"}
    for company in parsed.companies:
        assert len(company.derived_from) == 2
        assert all(cfg.COMPANY_BASE_LEVEL <= lvl <= cfg.COMPANY_MAX_LEVEL for lvl in company.required_levels().values())
    # not a flat bar: companies differ
    assert len({tuple(c.required_levels().values()) for c in parsed.companies}) == 3


def test_committed_file_matches_the_rule_and_the_fixtures():
    committed = json.loads(get_settings().company_data_path.read_text())
    fresh = derive_company_data(TEMPLATE, _fixture_jds(), date.fromisoformat(committed["_meta"]["exported_at"]))
    assert committed == fresh


def test_unknown_company_or_company_without_jd_fails_loudly():
    with pytest.raises(ValueError, match="matches no company"):
        derive_company_data(TEMPLATE, [_jd("Acme Corp", [])], date(2026, 10, 28))
    with pytest.raises(ValueError, match="no JD found"):
        derive_company_data(TEMPLATE, [_jd("Google LLC", [])], date(2026, 10, 28))
