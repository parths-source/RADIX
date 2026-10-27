"""Round trip against the real Supabase project. Skipped unless backend/.env reaches it."""

import pytest

from app.config import get_settings
from app.models.contract import ExtractedSkillList
from app.services.repository import BUCKET, Repository, check_connection

settings = get_settings()
pytestmark = pytest.mark.skipif(
    check_connection(settings) != "ok", reason="Supabase not reachable with backend/.env (see /api/health db_status)"
)


def test_extraction_and_upload_round_trip():
    repo = Repository(settings)
    extraction = ExtractedSkillList.model_validate({
        "source_type": "jd", "source_file": "pytest_live.docx", "company": "Test", "role": "Test",
        "skills": [{"skill_name": "Python", "category_code": "COD", "evidence": "test", "confidence": "high",
                    "requirement_type": "required"}],
    })
    path = repo.upload_file("jd", "pytest_live.txt", b"pytest live round trip", "text/plain")
    saved = repo.save_extraction(extraction, path)
    try:
        assert repo.get_extraction(saved.id) == saved
    finally:
        repo.client.table("extractions").delete().eq("id", saved.id).execute()
        repo.client.storage.from_(BUCKET).remove([path])
    assert repo.get_extraction(saved.id) is None


def test_profile_round_trip_and_unique_email():
    import uuid

    from app.errors import AppError
    from app.models.contract import CandidateProfile

    repo = Repository(settings)
    email = f"pytest-{uuid.uuid4().hex[:8]}@example.com"
    profile = CandidateProfile.model_validate({
        "name": "pytest live", "email": email,
        "skills": [{"skill_name": "Python", "category_code": "COD", "confidence": "high"}],
        "projects": [{"title": "App", "skills_used": ["Python"]}],
    })
    created = repo.create_profile(profile, None)
    try:
        assert repo.get_profile(created.id) == created
        updated = repo.update_profile(created.id, created.model_copy(update={"name": "pytest renamed"}))
        assert updated.name == "pytest renamed"
        assert created.id in [p["id"] for p in repo.list_profiles()]
        with pytest.raises(AppError) as exc_info:
            repo.create_profile(profile, None)
        assert exc_info.value.code == "email_taken"
    finally:
        repo.client.table("candidate_profiles").delete().eq("id", created.id).execute()
