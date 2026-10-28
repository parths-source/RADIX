import copy
import json

import pytest

from app.config import REPO_ROOT
from app.models.contract import SKILLSET_CODES
from app.services.company_data import CompanyDataError, load_company_data

PLACEHOLDER = REPO_ROOT / "data" / "company_skillsets.placeholder.json"
GOOD = json.loads(PLACEHOLDER.read_text())


def _load(tmp_path, data, *, real=True):
    """Write data as the real export (or as the placeholder) and load it."""
    real_path, placeholder_path = tmp_path / "company_skillsets.json", tmp_path / "placeholder.json"
    (real_path if real else placeholder_path).write_text(json.dumps(data))
    return load_company_data(real_path, placeholder_path)


def _bad(mutate):
    data = copy.deepcopy(GOOD)
    mutate(data)
    return data


def test_placeholder_loads_and_is_marked_dummy():
    data = load_company_data(REPO_ROOT / "data" / "does-not-exist.json", PLACEHOLDER)
    assert data.dummy is True
    for company in data.companies:
        assert set(company.required_levels()) == set(SKILLSET_CODES)


def test_placeholder_levels_are_flat_not_invented_company_profiles():
    levels = {s["required_level"] for c in GOOD["companies"] for s in c["skillsets"]}
    assert len(levels) == 1


def test_real_file_takes_precedence(tmp_path):
    real = _bad(lambda d: d["_meta"].update(dummy=False, source="staging_company_skill_levels export"))
    assert _load(tmp_path, real).dummy is False


def test_find_matches_jd_company_names():
    data = load_company_data(REPO_ROOT / "data" / "does-not-exist.json", PLACEHOLDER)
    assert data.find("Google LLC").company_key == "google"
    assert data.find("Microsoft Corporation").company_key == "microsoft"
    assert data.find("  oracle financial services software limited ").company_key == "oracle"
    assert data.find("Amazon") is None


@pytest.mark.parametrize(
    "mutate, message",
    [
        (lambda d: d["companies"][0]["skillsets"].pop(), "missing category codes"),
        (lambda d: d["companies"][0]["skillsets"].append({"category_code": "COD", "required_level": 5}), "duplicate"),
        (lambda d: d["companies"][0]["skillsets"][0].update(required_level=11), "less than or equal to 10"),
        (lambda d: d["companies"][0]["skillsets"][0].update(required_level=0), "greater than or equal to 1"),
        (lambda d: d["companies"][0]["skillsets"][0].update(required_level=7.5), "required_level"),
        (lambda d: d["companies"][0]["skillsets"][0].update(required_level="7"), "required_level"),
        (lambda d: d["companies"][0]["skillsets"][0].update(category_code="XYZ"), "category_code"),
        (lambda d: d["companies"][0]["skillsets"][0].update(category_code="OTHER"), "OTHER"),
        (lambda d: d["companies"][1].update(company_key="google"), "duplicate company_key"),
        (lambda d: d.update(companies=[]), "companies"),
        (lambda d: d.pop("_meta"), "_meta"),
    ],
)
def test_loader_rejects_bad_data(tmp_path, mutate, message):
    with pytest.raises(CompanyDataError, match=message):
        _load(tmp_path, _bad(mutate))


def test_placeholder_must_be_marked_dummy(tmp_path):
    with pytest.raises(CompanyDataError, match="must set _meta.dummy"):
        _load(tmp_path, _bad(lambda d: d["_meta"].update(dummy=False)), real=False)


def test_invalid_json_is_reported(tmp_path):
    (tmp_path / "company_skillsets.json").write_text("{not json")
    with pytest.raises(CompanyDataError, match="not valid JSON"):
        load_company_data(tmp_path / "company_skillsets.json", tmp_path / "p.json")


def test_no_file_at_all(tmp_path):
    with pytest.raises(CompanyDataError, match="No company data found"):
        load_company_data(tmp_path / "a.json", tmp_path / "b.json")


def test_app_refuses_to_start_with_bad_company_data(tmp_path, monkeypatch):
    from app.config import get_settings
    from app.main import create_app

    (tmp_path / "talent_check_company_skillsets.json").write_text(json.dumps(_bad(lambda d: d["companies"][0]["skillsets"].pop())))
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    get_settings.cache_clear()
    try:
        with pytest.raises(CompanyDataError, match="missing category codes"):
            create_app()
    finally:
        get_settings.cache_clear()
