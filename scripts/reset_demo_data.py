"""Clear saved data before a rehearsal or the live demo.

Profiles must have unique emails, so profiles left over from a rehearsal make "Save profile"
fail when the same sample resume is used again. This deletes rows from the four tables
(results first, then profiles, then extractions). Files in the uploads bucket are kept.
Run from backend/:

    .venv/bin/python ../scripts/reset_demo_data.py                 # show what would be deleted
    .venv/bin/python ../scripts/reset_demo_data.py --yes           # delete everything
    .venv/bin/python ../scripts/reset_demo_data.py --yes --since 2026-10-28T09:00:00+00:00
                                                                   # only rows created since then
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from supabase import create_client  # noqa: E402

from app.config import get_settings  # noqa: E402

TABLES = ["talent_check_results", "skill_match_results", "candidate_profiles", "extractions"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--yes", action="store_true", help="really delete (without it, only count)")
    parser.add_argument("--since", help="only rows with created_at at or after this ISO timestamp")
    args = parser.parse_args()

    settings = get_settings()
    if not settings.db_configured:
        print("Supabase is not configured in backend/.env; nothing to do.")
        return 1
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)

    for table in TABLES:
        query = db.table(table).select("id")
        if args.since:
            query = query.gte("created_at", args.since)
        ids = [row["id"] for row in query.execute().data]
        if args.yes and ids:
            for start in range(0, len(ids), 100):
                db.table(table).delete().in_("id", ids[start : start + 100]).execute()
        print(f"{table}: {'deleted' if args.yes else 'would delete'} {len(ids)}")
    if not args.yes:
        print("Nothing deleted. Add --yes to delete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
