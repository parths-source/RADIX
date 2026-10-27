"""Test doubles: a scripted LLM and an in-memory repository (no network, no Supabase)."""

import uuid
from datetime import datetime, timezone

from app.errors import AppError
from app.models.contract import ExtractedSkillList
from app.services.llm import LLMResult


class FakeLLM:
    """Returns the scripted results in order; an Exception in the script is raised."""

    def __init__(self, *script):
        self.script = list(script)
        self.calls: list[dict] = []

    def __call__(self, schema, system, user):
        self.calls.append({"schema": schema, "system": system, "user": user})
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        if isinstance(item, dict):
            return LLMResult(parsed=schema.model_validate(item))
        return item


class FakeRepository:
    def __init__(self):
        self.extractions: dict[str, ExtractedSkillList] = {}
        self.uploads: list[dict] = []
        self.profiles: dict[str, dict] = {}

    def ensure_ready(self):
        pass

    def upload_file(self, folder, filename, data, content_type):
        path = f"{folder}/{uuid.uuid4()}/{filename}"
        self.uploads.append({"path": path, "size": len(data), "content_type": content_type})
        return path

    def save_extraction(self, extraction, file_path):
        saved = extraction.model_copy(update={"id": str(uuid.uuid4())})
        self.extractions[saved.id] = saved
        return saved

    def get_extraction(self, extraction_id):
        return self.extractions.get(extraction_id)

    def _check_email(self, profile, own_id=None):
        for pid, row in self.profiles.items():
            if profile.email and row["profile"].email == profile.email and pid != own_id:
                raise AppError(409, "email_taken", "A saved profile already uses this email.")

    def create_profile(self, profile, source_extraction_id):
        self._check_email(profile)
        saved = profile.model_copy(update={"id": str(uuid.uuid4())})
        self.profiles[saved.id] = {"profile": saved, "source_extraction_id": source_extraction_id,
                                   "updated_at": datetime.now(timezone.utc).isoformat()}
        return saved

    def update_profile(self, profile_id, profile):
        if profile_id not in self.profiles:
            return None
        self._check_email(profile, profile_id)
        saved = profile.model_copy(update={"id": profile_id})
        self.profiles[profile_id].update(profile=saved, updated_at=datetime.now(timezone.utc).isoformat())
        return saved

    def get_profile(self, profile_id):
        row = self.profiles.get(profile_id)
        return row["profile"] if row else None

    def list_profiles(self):
        rows = sorted(self.profiles.values(), key=lambda r: r["updated_at"], reverse=True)
        return [{"id": r["profile"].id, "name": r["profile"].name, "email": r["profile"].email,
                 "updated_at": r["updated_at"]} for r in rows]


JD_OUT = {
    "company": "Google LLC",
    "role": "Software Engineer",
    "skills": [
        {"skill_name": "Python", "category_code": "COD", "evidence": "Python", "confidence": "high",
         "requirement_type": "required"},
        {"skill_name": "Kubernetes", "category_code": "CLOUD", "evidence": "nice to have k8s",
         "confidence": "medium", "requirement_type": "preferred"},
    ],
}

RESUME_OUT = {
    "name": "Test Candidate",
    "email": "test@example.com",
    "certifications": [{"title": "Linux Basics", "skills_used": ["operating systems"]}],
    "preferred_roles": ["Software Engineer", " Software Engineer ", "SRE"],
    "skills": [
        {"skill_name": "C++", "category_code": "COD", "evidence": "C++", "confidence": "high"},
        {"skill_name": "Operating Systems", "category_code": "OS", "evidence": "OS", "confidence": "high"},
    ],
    "education": "B.Tech  CSE",
    "projects": [{"title": "Scheduler", "description": "C++ job scheduler", "skills_used": ["c++", "operating  systems"]}],
    "experience": [
        {"title": "Backend intern", "skills_used": ["C++"], "kind": "internship", "duration_months": 2},
        {"title": "24h hackathon", "skills_used": ["Rust"], "kind": "hackathon"},
    ],
}
