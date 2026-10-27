import re

from app.config import REPO_ROOT

SQL = (REPO_ROOT / "supabase" / "migrations" / "0001_init.sql").read_text()
EXPECTED_TABLES = {"extractions", "candidate_profiles", "talent_check_results", "skill_match_results"}


def test_creates_the_four_tables():
    assert set(re.findall(r"create table (\w+)", SQL)) == EXPECTED_TABLES


def test_rls_enabled_on_every_table():
    rls = set(re.findall(r"alter table (\w+)\s+enable row level security", SQL))
    assert rls == EXPECTED_TABLES


def test_no_policies():
    assert "create policy" not in SQL.lower()


def test_uploads_bucket_is_private():
    assert re.search(r"values \('uploads', 'uploads', false\)", SQL)
