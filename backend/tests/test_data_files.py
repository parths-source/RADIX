"""Checks on the hand-maintained data files: alias seed, dummy profile, fixtures."""

import json

import pytest

from app.config import REPO_ROOT
from app.models.contract import CandidateProfile
from app.services.extraction import load_fixture

DATA = REPO_ROOT / "data"


def test_alias_file_is_normalized_and_flat():
    aliases = json.loads((DATA / "skill_aliases.json").read_text())["aliases"]
    for variant, canonical in aliases.items():
        assert variant == variant.strip().lower() and canonical == canonical.strip().lower()
        assert variant != canonical
        assert canonical not in aliases, f"alias chain: {variant} -> {canonical} -> {aliases[canonical]}"


def test_alias_file_keeps_cloud_providers_distinct():
    aliases = json.loads((DATA / "skill_aliases.json").read_text())["aliases"]
    providers = {"aws", "gcp", "azure", "cloud"}
    assert not providers & set(aliases)
    assert not providers & set(aliases.values())


def test_dummy_profile_is_marked_and_valid():
    raw = json.loads((DATA / "dummy_profile.json").read_text())
    assert raw["_meta"]["dummy"] is True
    profile = CandidateProfile.model_validate(raw["profile"])
    assert "dummy" in profile.name.lower()


FIXTURES = sorted((DATA / "fixtures").glob("*.json"))


@pytest.mark.skipif(not FIXTURES, reason="no fixtures seeded yet (Phase 8)")
@pytest.mark.parametrize("path", FIXTURES, ids=lambda p: p.name)
def test_every_fixture_matches_the_contract_and_names_its_model(path):
    meta, extraction = load_fixture(path)
    assert meta["model"] and meta["prompt_version"] and meta["generated_at"]
    assert extraction.status == "ok" and extraction.id is None  # saved straight from a successful real run
    assert path.stem == extraction.source_file.rsplit(".", 1)[0]
