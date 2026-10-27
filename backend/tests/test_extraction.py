import json
import logging
from dataclasses import replace

import pytest

from app.config import Settings
from app.errors import AppError
from app.models.contract import CategoryCode, ExtractedSkillList
from app.services import jd_analytics, resume_parsing
from app.services.extraction import run_extraction
from app.services.llm import LLMResult
from tests.fakes import JD_OUT, RESUME_OUT, FakeLLM


@pytest.fixture
def settings(tmp_path):
    (tmp_path / "fixtures").mkdir()
    return Settings(_env_file=None, data_dir=tmp_path, llm_max_input_chars=20000)


def _write_fixture(settings, name, data):
    (settings.data_dir / "fixtures" / name).write_text(json.dumps(data))


JD_FIXTURE = {"source_type": "jd", "source_file": "google_swe.docx", "company": "Google LLC", "role": "SWE",
              "skills": [{"skill_name": "Go", "category_code": "COD", "evidence": "Go", "confidence": "high"}]}


def test_jd_success(settings):
    llm = FakeLLM(JD_OUT)
    out = jd_analytics.run("JD text", "google_swe.docx", llm, settings)
    assert out.status == "ok" and out.company == "Google LLC"
    assert [(s.skill_name, s.requirement_type) for s in out.skills] == [("Python", "required"), ("Kubernetes", "preferred")]
    assert "COD: programming languages" in llm.calls[0]["system"]  # category definitions sent
    assert "JD text" in llm.calls[0]["user"]


def test_resume_success_maps_skills_used_and_kind(settings):
    out = resume_parsing.run("resume text", "cv.docx", FakeLLM(RESUME_OUT), settings)
    assert out.details.education == "B.Tech CSE"
    assert out.details.projects[0].skills_used == ["C++", "Operating Systems"]  # canonical skill names
    internship, hackathon = out.details.experience
    assert (internship.kind, internship.duration_months) == ("internship", 2)
    assert hackathon.kind == "hackathon" and hackathon.skills_used == []  # "Rust" is not an extracted skill
    assert out.company is None and out.role is None


def test_resume_d11_fields(settings):
    out = resume_parsing.run("resume text", "cv.docx", FakeLLM(RESUME_OUT), settings)
    assert (out.details.name, out.details.email) == ("Test Candidate", "test@example.com")
    assert out.details.certifications[0].skills_used == ["Operating Systems"]
    assert out.details.preferred_roles == ["Software Engineer", "SRE"]


def test_resume_bad_email_is_dropped_not_fatal(settings):
    out = resume_parsing.run("t", "cv.docx", FakeLLM({**RESUME_OUT, "email": "not an email"}), settings)
    assert out.status == "ok" and out.details.email is None


def test_resume_prompt_is_v2():
    assert resume_parsing.SPEC.prompt_version == "resume_extraction_v2"


def test_unknown_category_becomes_other_and_duplicates_collapse(settings):
    skills = [
        {"skill_name": "Postman", "category_code": "TOOLS", "evidence": "x", "confidence": "low", "requirement_type": "preferred"},
        {"skill_name": "python", "category_code": "cod", "evidence": "x", "confidence": "high", "requirement_type": "preferred"},
        {"skill_name": " Python ", "category_code": "COD", "evidence": "x", "confidence": "high", "requirement_type": "required"},
    ]
    out = jd_analytics.run("t", "a.docx", FakeLLM({"skills": skills}), settings)
    assert [(s.skill_name, s.category_code) for s in out.skills] == [("Postman", CategoryCode.OTHER), ("python", CategoryCode.COD)]
    assert out.skills[1].requirement_type == "required"  # a required duplicate wins over preferred


def test_evidence_is_shortened(settings):
    long = {**JD_OUT, "skills": [{**JD_OUT["skills"][0], "evidence": "word " * 200}]}
    out = jd_analytics.run("t", "a.docx", FakeLLM(long), settings)
    assert len(out.skills[0].evidence) <= 200


def test_schema_failure_retries_once_with_the_error(settings):
    llm = FakeLLM(LLMResult(parsed=None, error="missing field skills"), JD_OUT)
    out = jd_analytics.run("t", "a.docx", llm, settings)
    assert out.status == "ok" and len(llm.calls) == 2
    assert "missing field skills" in llm.calls[1]["user"]


def test_contract_validation_failure_retries(settings):
    attempts = []

    def to_contract(out, source_file):
        attempts.append(1)
        if len(attempts) == 1:
            ExtractedSkillList.model_validate({"source_type": "jd", "source_file": ""})  # raises ValidationError
        return jd_analytics.SPEC.to_contract(out, source_file)

    spec = replace(jd_analytics.SPEC, to_contract=to_contract)
    llm = FakeLLM(JD_OUT, JD_OUT)
    assert run_extraction(spec, "t", "a.docx", llm, settings).status == "ok"
    assert "previous answer was invalid" in llm.calls[1]["user"]


def test_blank_skill_names_are_dropped(settings):
    out = jd_analytics.run("t", "a.docx", FakeLLM({"skills": [{**JD_OUT["skills"][0], "skill_name": "  "}]}), settings)
    assert out.skills == []


def test_two_failures_fall_back_to_fixture(settings):
    _write_fixture(settings, "google_swe.json", JD_FIXTURE)
    llm = FakeLLM(LLMResult(parsed=None, error="bad"), LLMResult(parsed=None, error="bad"))
    out = jd_analytics.run("t", "google_swe.pdf", llm, settings)  # PDF and DOCX share a fixture by stem
    assert out.status == "fallback" and out.skills[0].skill_name == "Go"
    assert out.source_file == "google_swe.pdf"


def test_two_failures_without_fixture_is_502(settings):
    llm = FakeLLM(LLMResult(parsed=None, error="bad"), LLMResult(parsed=None, error="bad"))
    with pytest.raises(AppError) as exc_info:
        jd_analytics.run("t", "unknown.docx", llm, settings)
    assert (exc_info.value.status_code, exc_info.value.details["reason"]) == (502, "invalid_llm_output")


def test_llm_error_falls_back_without_retry(settings):
    _write_fixture(settings, "google_swe.json", JD_FIXTURE)
    llm = FakeLLM(RuntimeError("503 overloaded"))
    assert jd_analytics.run("t", "google_swe.docx", llm, settings).status == "fallback"
    assert len(llm.calls) == 1


def test_no_llm_with_fixture_falls_back(settings):
    _write_fixture(settings, "google_swe.json", JD_FIXTURE)
    assert jd_analytics.run("t", "google_swe.docx", None, settings).status == "fallback"


def test_no_llm_without_fixture_is_502(settings):
    with pytest.raises(AppError) as exc_info:
        jd_analytics.run("t", "other.docx", None, settings)
    assert exc_info.value.status_code == 502
    assert exc_info.value.details["reason"] == "llm_not_configured"


def test_fixture_of_the_wrong_type_is_not_used(settings):
    _write_fixture(settings, "cv.json", JD_FIXTURE)
    with pytest.raises(AppError):
        resume_parsing.run("t", "cv.docx", None, settings)


def test_long_text_is_truncated_and_logged(settings, caplog):
    settings = settings.model_copy(update={"llm_max_input_chars": 50})
    llm = FakeLLM(JD_OUT)
    with caplog.at_level(logging.WARNING):
        jd_analytics.run("x" * 500, "a.docx", llm, settings)
    assert "x" * 51 not in llm.calls[0]["user"]
    assert "extraction_truncated" in caplog.text
    assert "x" * 50 not in caplog.text  # document text is never logged


def test_output_always_matches_contract(settings):
    for module, out in ((jd_analytics, JD_OUT), (resume_parsing, RESUME_OUT)):
        result = module.run("t", "a.docx", FakeLLM(out), settings)
        ExtractedSkillList.model_validate(result.model_dump())
