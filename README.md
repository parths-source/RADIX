# RADIX Talent Match

A tool that tells a candidate how ready they are for a specific job, built on RADIX's 12-skillset framework.
Flow: pick a JD → parse a resume → build a profile → Talent Check → Skill Matching.

Scope, data contract, scoring and build order: [PLAN.md](PLAN.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md).

**Status:** Phase 6 (Skill Matching) complete. All five modules work from the API and from the `/analyze`, `/resume`, `/profile`, `/talent-check` and `/match` screens; Phase 7 wires them into one guided flow. Phase 2 (landing hero) has not started; `/` is a placeholder.

## Requirements

- Python 3.11+ (developed on 3.12)
- Node.js 20+ and npm
- A Supabase project with [0001_init.sql](supabase/migrations/0001_init.sql) applied
- A Google Gemini API key

## Install

```bash
# Backend
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## Configure

```bash
cp backend/.env.example backend/.env     # Supabase + LLM keys (backend only, git-ignored)
cp frontend/.env.example frontend/.env   # API base URL only, no secrets
```

Missing inputs (see PLAN.md section 3): the company expectations export. `/api/health` reports what is configured, including a live database check (`db_status`: `ok`, `invalid_url`, `unreachable`, `auth_failed`, `schema_missing`).

### LLM (Gemini)

In `backend/.env`:

```
LLM_PROVIDER=google
LLM_MODEL=gemini-3.5-flash
LLM_FALLBACK_MODEL=gemini-3.8-flash
LLM_API_KEY=<your key>
LLM_TIMEOUT_SECONDS=40
```

Each request times out after `LLM_TIMEOUT_SECONDS`. If the main model fails or hangs (Gemini often returns 503 "high demand"), the call goes straight to `LLM_FALLBACK_MODEL` (one retry there), then answered from a saved extraction in `data/fixtures/<file stem>.json` (shown as "Using saved extraction"), otherwise it fails with a clear 502. **The Gemini free tier allows 20 requests per day per model**; each extraction is 1 request (2 if the first answer is invalid). Enable billing on the key, or seed fixtures, before a demo.

### Company data

Until `data/company_skillsets.json` exists, the backend uses `data/company_skillsets.placeholder.json` (marked `"dummy": true`, flat levels, not RADIX data) and the API reports `dummy: true` so the UI shows a "Placeholder company data" banner. How to supply the real file: [scripts/export_company_skillsets.md](scripts/export_company_skillsets.md).

### Data files

- `data/skill_aliases.json`: skill-name aliases for Skill Matching (small, extend as needed).
- `data/dummy_profile.json`: a hand-written fictional profile (`"dummy": true`) for building Talent Check and Skill Matching before real extractions exist.
- `data/fixtures/`: saved extractions used as a fallback (seeded in Phase 8).
- `data/samples/*/*.pdf`: **converted** from the DOCX samples (text only) because PDF originals were not supplied; see [data/samples/README.md](data/samples/README.md).

### Database

Apply [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) in the Supabase SQL editor (or `supabase db push`). It creates the four tables with Row Level Security enabled and no policies, and a private `uploads` Storage bucket.

## Run

```bash
cd backend && .venv/bin/uvicorn app.main:app --reload   # http://localhost:8000/api/health
cd frontend && npm run dev                               # http://localhost:5173
```

## API (so far)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Configuration and live database check |
| GET | `/api/companies` | Companies for Talent Check, with the `dummy` flag |
| GET | `/api/samples` | Sample JDs and resumes (`sample_id`s) |
| POST | `/api/extractions/jd` | Module 1. Multipart `file` (PDF/DOCX, ≤ 5 MB) or JSON `{"sample_id": "jd:google_software_engineer.docx"}` |
| POST | `/api/extractions/resume` | Module 2. Same inputs; response includes `details` |
| GET | `/api/extractions?source_type=jd` | Recent extractions of one type |
| GET | `/api/extractions/{id}` | Fetch a stored extraction |
| POST | `/api/profiles/draft` | Module 3. `{"resume_extraction_id"}` gives a pre-filled draft; add `"base_profile_id"` to merge the resume into a saved profile. Nothing is saved |
| POST | `/api/profiles` | Create (body = profile; optional `?source_extraction_id=`). 409 if the email is taken |
| GET / PUT | `/api/profiles/{id}` | Load / full replace |
| GET | `/api/profiles` | Saved profiles (id, name, email, updated_at), newest first |
| POST | `/api/profiles/{id}/talent-check` | Module 4. `{"company_key": "google"}` (key, name or alias). Stores and returns the readiness score and 12 skillset gaps |
| POST | `/api/profiles/{id}/skill-match` | Module 5. `{"jd_extraction_id"}`. Stores and returns the match score, matched skills and missing skills (required first) |
| POST | `/api/profiles/cv` | Upload a CV (PDF/DOCX) to the private bucket; returns `cv_file` to put in the profile |

## Test

```bash
cd backend && .venv/bin/pytest          # LLM is mocked; tests/test_db_live.py runs only when Supabase is reachable (it deletes its own rows)
cd frontend && npm run lint && npm run build
```

## Talent Check scoring (tc-v0.1)

Plain code, no LLM; every constant is in [backend/app/scoring/config.py](backend/app/scoring/config.py). Formula: PLAN.md section 7. Honest limits:
- Levels are **estimates from the documents, not verified proficiency**. The constants are judgment calls.
- Results depend on extraction quality: a skill counts as evidenced only when a project, internship, hackathon or certification lists it in `skills_used`.
- It cannot tell a deep project from a trivial one.
- A skillset backed only by a skills list is capped at level 5, and a single listed skill on its own scores level 1.
- With the placeholder company data every company has the same flat bar, so readiness differs by candidate but not by company.

## Skill Matching scoring (sm-v0.1, decision D7: a proposal still under review)

Per JD skill, the first tier that hits: exact name (quality 1.0), alias via `data/skill_aliases.json` (1.0), near-identical name with `rapidfuzz.fuzz.ratio` ≥ 88 (0.8), then optionally an LLM judge (0.6) when `ENABLE_LLM_MATCH=true` (off by default; one extra Gemini call per match). Required skills weigh 1.0, preferred 0.5. Constants: [backend/app/scoring/config.py](backend/app/scoring/config.py).

Known limit: the sample JDs ask for concepts ("Programming", "Communication", "Software Testing") while resumes name tools, so with the LLM judge off those requirements show as missing and scores stay low.

## Notes

- `frontend/src/components/ui/kk.tsx` (the shader) is kept verbatim. It does not pass TypeScript strict null checks, so `tsconfig.app.json` maps `@/components/ui/kk` to a type declaration (`src/types/kk-shader.d.ts`) and excludes the file from type checking. Vite still bundles the real component.
