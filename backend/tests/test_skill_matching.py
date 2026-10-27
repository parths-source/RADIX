import pytest

from app.errors import AppError
from app.models.contract import ExtractedSkillList, Skill
from app.services import skill_matching
from app.services.llm import LLMResult
from tests.fakes import FakeLLM


def s(name, code="COD", req=None):
    return Skill.model_validate({"skill_name": name, "category_code": code, "evidence": f"has {name}",
                                 "confidence": "high", "requirement_type": req})


def jd(*skills):
    return ExtractedSkillList(source_type="jd", source_file="jd.docx", skills=list(skills))


def match(candidate, *jd_skills, llm=None):
    return skill_matching.run(candidate, jd(*jd_skills), llm)


def matched_types(result):
    return {m.jd_skill: m.match_type for m in result.matched_skills}


# Mandatory cases (PLAN.md section 8)

@pytest.mark.parametrize("jd_name, candidate_name", [("JavaScript", "Java"), ("Java", "JavaScript"), ("C++", "C"),
                                                     ("C", "C++"), ("NoSQL", "SQL"), ("SQL", "NoSQL"), ("C#", "C")])
def test_distinct_skills_never_match(jd_name, candidate_name):
    result = match([s(candidate_name)], s(jd_name))
    assert result.match_score == 0 and result.matched_skills == []


def test_postgres_matches_postgresql_by_alias():
    result = match([s("Postgres", "SQL")], s("PostgreSQL", "SQL"))
    assert matched_types(result) == {"PostgreSQL": "alias"} and result.match_score == 100


def test_duplicate_jd_skills_count_once():
    once = match([s("Python")], s("Python"), s("Go"))
    twice = match([s("Python")], s("Python"), s("python "), s("Go"))
    assert once.match_score == twice.match_score == 50
    assert len(twice.matched_skills) == 1


def test_duplicate_required_wins_over_preferred():
    result = match([], s("Go", req="preferred"), s("go", req="required"))
    assert result.missing_skills[0].requirement_type == "required"


def test_empty_profile_scores_zero_with_everything_missing():
    result = match([], s("Python"), s("SQL", "SQL"))
    assert result.match_score == 0
    assert [m.skill_name for m in result.missing_skills] == ["Python", "SQL"]
    assert all(m.reason == "No matching skill in profile" for m in result.missing_skills)


def test_identical_input_gives_identical_output():
    args = ([s("Python"), s("Docker", "CLOUD")], s("Python"), s("Kubernetes", "CLOUD"), s("Docker", "CLOUD", "preferred"))
    assert match(*args) == match(*args)


def test_different_candidates_get_different_scores():
    jd_skills = (s("Python"), s("SQL", "SQL"), s("Machine Learning", "AI"), s("C++"))
    data = match([s("Python"), s("SQL", "SQL"), s("Machine Learning", "AI")], *jd_skills)
    systems = match([s("C++"), s("Operating Systems", "OS")], *jd_skills)
    assert data.match_score != systems.match_score


def test_jd_without_skills_is_an_error_not_zero():
    with pytest.raises(AppError) as exc_info:
        match([s("Python")])
    assert (exc_info.value.status_code, exc_info.value.code) == (422, "jd_has_no_skills")


# Tiers and score

def test_exact_match_is_case_and_punctuation_insensitive():
    assert matched_types(match([s("node.js")], s("Node.js"))) == {"Node.js": "exact"}
    assert matched_types(match([s("CI/CD", "SWE")], s("CI CD", "SWE"))) == {"CI CD": "exact"}


def test_fuzzy_catches_near_identical_names_at_quality_0_8():
    result = match([s("Kubernetes", "CLOUD")], s("Kubernets", "CLOUD"))
    assert matched_types(result) == {"Kubernets": "fuzzy"} and result.match_score == 80


def test_fuzzy_does_not_use_partial_ratios():
    assert match([s("Java")], s("Java Spring Boot Microservices")).matched_skills == []


def test_preferred_skills_weigh_half():
    # required Python matched (1.0), preferred Go missing (0.5): 100 * 1 / 1.5 = 66.7 -> 67
    assert match([s("Python")], s("Python", req="required"), s("Go", req="preferred")).match_score == 67
    # untagged counts as required
    assert match([s("Python")], s("Python"), s("Go", req="preferred")).match_score == 67


def test_missing_ranked_required_first_then_jd_order():
    result = match([], s("A", req="preferred"), s("B"), s("C", req="preferred"), s("D", req="required"))
    assert [(m.skill_name, m.requirement_type) for m in result.missing_skills] == [
        ("B", "required"), ("D", "required"), ("A", "preferred"), ("C", "preferred")]


def test_result_shape():
    result = match([s("Python")], s("Python"))
    assert result.jd_source_file == "jd.docx" and result.scoring_version == "sm-v0.1"
    assert result.matched_skills[0].category_code.value == "COD"


# Optional LLM judge (off by default; tested with a fake)

def _verdicts(*items):
    return {"verdicts": [{"jd_skill": j, "candidate_skill": c, "reason": r} for j, c, r in items]}


def test_llm_judge_matches_at_quality_0_6_and_explains_misses():
    llm = FakeLLM(_verdicts(("Programming", "Python", "Python is a programming language"),
                            ("Kubernetes", None, "No container orchestration skill")))
    result = match([s("Python"), s("Docker", "CLOUD")], s("Programming"), s("Kubernetes", "CLOUD"), llm=llm)
    assert matched_types(result) == {"Programming": "llm"}
    assert result.match_score == 30  # 0.6 of 2 required skills
    assert result.missing_skills[0].reason == "No container orchestration skill"
    assert "Programming" in llm.calls[0]["user"] and "Docker" in llm.calls[0]["user"]


def test_llm_judge_is_only_asked_about_unmatched_skills():
    llm = FakeLLM(_verdicts(("Programming", None, "no")))
    match([s("Python")], s("Python"), s("Programming"), llm=llm)
    assert "- Python (COD)" not in llm.calls[0]["user"].split("Candidate skills")[0]


def test_llm_judge_cannot_invent_candidate_skills():
    llm = FakeLLM(_verdicts(("Programming", "Rust", "Rust is a language")))
    assert match([s("Python")], s("Programming"), llm=llm).matched_skills == []


@pytest.mark.parametrize("failure", [RuntimeError("503"), LLMResult(parsed=None, error="bad json")])
def test_llm_judge_failure_falls_back_to_rule_result_and_says_so(failure):
    result = match([s("Python")], s("Python"), s("Programming"), llm=FakeLLM(failure))
    assert result.match_score == 50 and result.missing_skills[0].reason == "No matching skill in profile"
    assert result.llm_judge == "failed"


def test_llm_judge_status_off_and_used():
    assert match([s("Python")], s("Python")).llm_judge == "off"
    used = match([s("Python")], s("Programming"), llm=FakeLLM(_verdicts(("Programming", "Python", "language"))))
    assert used.llm_judge == "used"


def test_llm_judge_not_called_when_everything_matched():
    llm = FakeLLM()
    match([s("Python")], s("Python"), llm=llm)
    assert llm.calls == []


# D13: concept synonyms (data/skill_aliases.json v0.2)

@pytest.mark.parametrize(
    "jd_name, candidate_name",
    [
        ("Operating Systems", "OS"), ("Computer Networks", "Networking"), ("Computer Networks", "Networking Fundamentals"),
        ("Object-Oriented Design", "OOP"), ("Object-Oriented Design", "Object-Oriented Programming"),
        ("Data Structures and Algorithms", "Data Structures & Algorithms"), ("Data Structures and Algorithms", "DSA"),
        ("System Design", "Systems Design"), ("Software Testing", "Testing"), ("CI/CD", "Continuous Integration"),
        ("Communication", "Communication Skills"), ("APIs", "REST APIs"), ("Statistics", "Applied Statistics"),
        ("Ticketing Systems", "Ticketing Tools"),
    ],
)
def test_concept_synonyms_match_by_alias(jd_name, candidate_name):
    result = match([s(candidate_name)], s(jd_name))
    assert matched_types(result) == {jd_name: "alias"} and result.match_score == 100


@pytest.mark.parametrize(
    "jd_name, candidate_name",
    [
        ("Computer Networks", "Neural Networks"), ("Operating Systems", "iOS"), ("Software Testing", "A/B testing"),
        ("Git", "Version Control"), ("Kubernetes", "Cloud"), ("AWS", "Azure"), ("Databases", "NoSQL"),
        ("JavaScript", "Java"), ("C++", "C"), ("NoSQL", "SQL"),
    ],
)
def test_synonyms_do_not_create_false_matches(jd_name, candidate_name):
    assert match([s(candidate_name)], s(jd_name)).matched_skills == []
