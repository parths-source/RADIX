# CLAUDE.md — RADIX Talent Match

A hackathon tool that tells a candidate how ready they are for a specific job. Stack: Python (FastAPI) backend, React + TypeScript + Tailwind + shadcn frontend, Supabase (Postgres + Storage).

**Before doing anything, read `PLAN.md` in full.** Then skim `docs/MILESTONES.md` (the organizers' checklist). It is the source of truth for scope, data contract, scoring rules, schema, API, UI and build order. The original hackathon brief (PDF) is the source of truth for requirements; `PLAN.md` labels what comes from the brief and what is a proposal.

## Provided files (already in the repo, do not recreate)

- `docs/brief/RADIX_Talent_Match_Hackathon_Brief.pdf` is the source of truth. Its text layer is garbled (dropped letters and digits): read the pages as images, not extracted text.
- `data/samples/jds/*.docx` (6) and `data/samples/resumes/*.docx` (4): the hackathon sample pack. `PLAN.md` section 3b describes their real structure.
- `frontend/src/components/ui/kk.tsx` (shader), `frontend/src/assets/radix-logo.svg` and `radix-mark.svg` (logo).
- `docs/design/hero-mockup.png` (hero layout reference) and `docs/design/background-reference.jpg` (target colour).
- **Not provided yet:** the company expectations data, the Supabase project and keys, and an LLM key. Do not invent them.

## Working rules

1. **Work one phase at a time**, in the order in `PLAN.md` section 14. At the end of each phase: run the tests, summarise what changed, list anything skipped, then stop and wait for the user's go-ahead.
2. **Do not invent data.** Company expectations, sample extractions and scores must come from real files or be clearly marked dummy (`"dummy": true`, and a visible banner in the UI). Never present placeholder numbers as RADIX data.
3. **The data contract is locked at v0.1** (`PLAN.md` section 6). If you need to change it, stop, explain why, and log the change in `docs/DECISIONS.md` after the user approves. Never change it silently.
4. **All scoring constants live in one config module** (`backend/app/scoring/config.py`). No magic numbers inside scoring functions.
5. **Plain code for Profile Builder and Talent Check.** LLM only for JD extraction, resume extraction and the optional fuzzy judge in Skill Matching.
6. **Do not edit `frontend/src/components/ui/kk.tsx`** (the shader). Use it as provided.
7. **No extra infrastructure.** No Redis, queues, vector DB, microservices, auth providers or Docker unless the user asks.
8. **Secrets** go in `.env` files that are git-ignored. Provide `.env.example`. The Supabase service-role key and the LLM key are backend-only and must never reach the browser.
9. **Write tests with each module**, not at the end. A phase is not done until its listed tests pass.
10. **If an input you need is missing** (see `PLAN.md` section 3), say so and continue with whatever does not depend on it. Do not guess.
11. Commit after each finished phase with a clear message.
12. Keep `README.md` current: how to install, configure, run, test, and run the demo.

## Commands (update as the project takes shape)

- Backend setup: `cd backend && python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt`
- Backend: `cd backend && .venv/bin/uvicorn app.main:app --reload`
- Backend tests: `cd backend && .venv/bin/pytest`
- Frontend: `cd frontend && npm run dev`
- Frontend checks: `cd frontend && npm run lint && npm run build`
