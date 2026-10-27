import random

import pytest

from app.config import REPO_ROOT
from app.models.contract import SKILLSET_CODES, CandidateProfile, CategoryCode
from app.scoring import config as cfg
from app.services.company_data import Company, load_company_data
from app.scoring.rounding import round_half_up
from app.services.talent_check import estimate_levels, run

PLACEHOLDER = load_company_data(REPO_ROOT / "data" / "none.json", REPO_ROOT / "data" / "company_skillsets.placeholder.json")
GOOGLE = PLACEHOLDER.find("google")


def skill(name, code="DSA", confidence="high"):
    return {"skill_name": name, "category_code": code, "evidence": "e", "confidence": confidence}


def entry(title, *used):
    return {"title": title, "skills_used": list(used)}


def profile(skills=(), **groups):
    return CandidateProfile.model_validate({"name": "T", "skills": list(skills), **groups})


def company(levels: dict[str, int]) -> Company:
    return Company.model_validate({
        "company_key": "c", "display_name": "C",
        "skillsets": [{"category_code": code.value, "required_level": levels.get(code.value, 5)} for code in SKILLSET_CODES],
    })


DSA = CategoryCode.DSA


# Worked examples (PLAN.md section 7)

def test_worked_example_evidenced_dsa_is_level_7():
    p = profile(
        [skill("Data Structures"), skill("Algorithms"), skill("Dynamic Programming", confidence="medium")],
        projects=[entry("P", "Data Structures")],
        hackathons=[entry("H", "Algorithms")],
    )
    estimate = estimate_levels(p)[DSA]
    assert (estimate.level, estimate.evidence_status) == (7, "evidenced")


def test_worked_example_claims_only_dsa_is_level_4():
    p = profile([skill(n) for n in ("Arrays", "Graphs", "Trees", "Sorting")])
    estimate = estimate_levels(p)[DSA]
    assert (estimate.level, estimate.evidence_status) == (4, "claimed_only")


# The seven checks (PLAN.md section 13)

def test_no_skills_gives_level_1_and_every_category_a_gap():
    result = run(profile(), GOOGLE)
    assert len(result.skillset_gap) == 12
    assert all(g.candidate_level == 1 and g.gap and g.evidence_status == "none" for g in result.skillset_gap)
    assert result.readiness_score == round_half_up(100 * 1 / 5)  # flat placeholder bar of 5


def test_duplicates_are_counted_once():
    once = profile([skill("Python", "COD")], projects=[entry("P", "Python")])
    twice = profile([skill("Python", "COD"), skill("python", "COD"), skill(" PYTHON ", "COD")],
                    projects=[entry("P", "Python")])
    assert estimate_levels(once) == estimate_levels(twice)


def test_alias_duplicates_are_counted_once():
    a = profile([skill("PostgreSQL", "SQL")])
    b = profile([skill("PostgreSQL", "SQL"), skill("Postgres", "SQL")])
    assert estimate_levels(a) == estimate_levels(b)


def _random_profile(rng: random.Random) -> CandidateProfile:
    codes = [c.value for c in SKILLSET_CODES]
    skills = [skill(f"S{i}", rng.choice(codes), rng.choice(["high", "medium", "low"])) for i in range(rng.randint(0, 15))]
    names = [s["skill_name"] for s in skills]
    pick = lambda: rng.sample(names, k=min(len(names), rng.randint(0, 3)))  # noqa: E731
    groups = {g: [entry(f"{g}{i}", *pick()) for i in range(rng.randint(0, 3))]
              for g in ("internships", "projects", "hackathons", "certifications")}
    return profile(skills, **groups)


def _levels(p):
    return {c: e.level for c, e in estimate_levels(p).items()}


@pytest.mark.parametrize("seed", range(40))
def test_adding_evidence_never_lowers_a_level(seed):
    rng = random.Random(seed)
    p = _random_profile(rng)
    if not p.skills:
        return
    before = _levels(p)
    target = rng.choice(p.skills).skill_name
    for group in ("internships", "projects", "hackathons", "certifications"):
        more = p.model_copy(update={group: [*getattr(p, group), CandidateProfile.model_validate(
            {"name": "x", "skills": [skill(target)], group: [entry("new", target)]}).__getattribute__(group)[0]]})
        after = _levels(more)
        assert all(after[c] >= before[c] for c in before), group
    upgraded = p.model_copy(update={"skills": [s.model_copy(update={"confidence": "high"}) for s in p.skills]})
    assert all(_levels(upgraded)[c] >= before[c] for c in before)


@pytest.mark.parametrize("seed", range(40))
def test_claims_only_never_above_cap_and_ranges_hold(seed):
    p = _random_profile(random.Random(seed))
    for code, estimate in estimate_levels(p).items():
        assert cfg.LEVEL_MIN <= estimate.level <= cfg.LEVEL_MAX
        if estimate.evidence_status == "claimed_only":
            assert estimate.level <= cfg.CLAIMS_ONLY_CAP
    result = run(p, GOOGLE)
    assert 0 <= result.readiness_score <= 100


def test_many_strong_claims_are_capped_at_5():
    p = profile([skill(f"Algo {i}") for i in range(20)])  # depth saturates: raw 0.6 -> level 6 before the cap
    assert estimate_levels(p)[DSA].level == cfg.CLAIMS_ONLY_CAP


def test_certification_lifts_the_claims_only_cap():
    p = profile([skill(f"Algo {i}") for i in range(20)], certifications=[entry("C", "Algo 0")])
    estimate = estimate_levels(p)[DSA]
    assert estimate.evidence_status == "evidenced" and estimate.level > cfg.CLAIMS_ONLY_CAP


def test_deterministic():
    p = _random_profile(random.Random(7))
    assert run(p, GOOGLE) == run(p, GOOGLE)


def test_low_confidence_scores_below_high():
    def level(conf):
        return estimate_levels(profile([skill("Algorithms", confidence=conf)], projects=[entry("P", "Algorithms")]))[DSA].level

    assert level("low") < level("high")
    assert level("low") <= level("medium") <= level("high")  # one skill: low and medium can round to the same level


# Readiness and gaps

def test_readiness_weights_by_required_level_and_gives_no_bonus():
    # COD: level 1 vs bar 10 -> coverage 0.1; every other category: skipped bars are impossible
    # (companies always have 12), so use bars where the candidate meets or exceeds them.
    p = profile([skill("Python", "COD")], internships=[entry("I", "Python")])
    levels = _levels(p)
    bars = {c.value: 1 for c in SKILLSET_CODES}
    bars["COD"] = 10
    result = run(p, company(bars))
    cod = next(g for g in result.skillset_gap if g.category_code is CategoryCode.COD)
    expected = round_half_up(100 * (10 * min(1, levels[CategoryCode.COD] / 10) + 11 * 1) / (10 + 11))
    assert result.readiness_score == expected
    assert cod.gap is (levels[CategoryCode.COD] < 10)
    assert all(not g.gap for g in result.skillset_gap if g.category_code is not CategoryCode.COD)


def test_meeting_every_bar_scores_100():
    assert run(profile(), company({c.value: 1 for c in SKILLSET_CODES})).readiness_score == 100


def test_other_category_is_ignored():
    with_other = profile([skill("Excel", "OTHER")], projects=[entry("P", "Excel")])
    assert estimate_levels(with_other) == estimate_levels(profile())


def test_result_shape():
    result = run(profile(), GOOGLE)
    assert result.company == "Google LLC" and result.scoring_version == "tc-v0.1"
    assert [g.category_code for g in result.skillset_gap] == list(SKILLSET_CODES)


def test_round_half_up():
    assert [round_half_up(x) for x in (2.5, 3.5, 4.4999999999, 5.877, 0.0)] == [3, 4, 5, 6, 0]


def test_different_candidates_get_different_results():
    systems = profile(
        [skill("C++", "COD"), skill("Operating Systems", "OS"), skill("Algorithms")],
        projects=[entry("Scheduler", "C++", "Operating Systems")], internships=[entry("Backend", "C++", "Algorithms")],
    )
    data = profile(
        [skill("SQL", "SQL"), skill("Machine Learning", "AI"), skill("Python", "COD", "medium")],
        projects=[entry("Churn model", "SQL", "Machine Learning", "Python")], internships=[entry("Analytics", "SQL")],
    )
    a, b = run(systems, GOOGLE), run(data, GOOGLE)
    assert [g.candidate_level for g in a.skillset_gap] != [g.candidate_level for g in b.skillset_gap]
    level = lambda r, code: next(g.candidate_level for g in r.skillset_gap if g.category_code is code)  # noqa: E731
    assert level(a, CategoryCode.OS) > level(b, CategoryCode.OS)
    assert level(b, CategoryCode.AI) > level(a, CategoryCode.AI)
