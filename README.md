# RADIX Talent Match

A tool that tells a candidate how ready they are for a specific job, built on RADIX's 12-skillset framework.
Flow: pick a JD → parse a resume → build a profile → Talent Check → Skill Matching.

Scope, data contract, scoring and build order: [PLAN.md](PLAN.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md).

**Status:** Phase 1 (contract and fixtures) complete. Backend: `/api/health`, `/api/companies`, the v0.1 contract models and the company-data loader. Frontend: placeholder page and contract types. Modules arrive in later phases.

## Requirements

- Python 3.11+ (developed on 3.12)
- Node.js 20+ and npm
- A Supabase project (not yet connected)

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

Missing inputs (see PLAN.md section 3): the company expectations export. `/api/health` reports what is configured.

### Company data

Until `data/company_skillsets.json` exists, the backend uses `data/company_skillsets.placeholder.json` (marked `"dummy": true`, flat levels, not RADIX data) and the API reports `dummy: true` so the UI shows a "Placeholder company data" banner. How to supply the real file: [scripts/export_company_skillsets.md](scripts/export_company_skillsets.md).

### Data files

- `data/skill_aliases.json`: skill-name aliases for Skill Matching (small, extend as needed).
- `data/dummy_profile.json`: a hand-written fictional profile (`"dummy": true`) for building Talent Check and Skill Matching before real extractions exist.
- `data/fixtures/`: saved extractions used as a fallback (seeded in Phase 8).

### Database

Apply [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) in the Supabase SQL editor (or `supabase db push`). It creates the four tables with Row Level Security enabled and no policies, and a private `uploads` Storage bucket.

## Run

```bash
cd backend && .venv/bin/uvicorn app.main:app --reload   # http://localhost:8000/api/health
cd frontend && npm run dev                               # http://localhost:5173
```

## Test

```bash
cd backend && .venv/bin/pytest
cd frontend && npm run lint && npm run build
```

## Notes

- `frontend/src/components/ui/kk.tsx` (the shader) is kept verbatim. It does not pass TypeScript strict null checks, so `tsconfig.app.json` maps `@/components/ui/kk` to a type declaration (`src/types/kk-shader.d.ts`) and excludes the file from type checking. Vite still bundles the real component.
