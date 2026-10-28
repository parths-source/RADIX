# RADIX Talent Match

A tool that tells a candidate how ready they are for a specific job, built on RADIX's 12-skillset framework.
Flow: pick a JD → parse a resume → build a profile → Talent Check → Skill Matching.

Scope, data contract, scoring and build order: [PLAN.md](PLAN.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md). Contract: [docs/CONTRACT.md](docs/CONTRACT.md). Demo: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

**Status:** All phases (0–8) complete. Landing page with the shader hero at `/`; the five modules run as one guided flow from `/analyze`; sample files use saved extractions by default; the Definition of Done checks are recorded below.

## Run it from a clean clone

You need: **Python 3.11+**, **Node.js 20+** with npm, **git**, and from the team lead the **Supabase project URL + service-role (secret) key** and a **Gemini API key**. Ask for keys privately; never commit them.

1. **Clone.**
   ```bash
   git clone <repo-url> radix-talent-match && cd radix-talent-match
   ```
2. **Python 3.11+.** Check with `python3 --version`. If yours is older (macOS ships 3.9), one option is [uv](https://docs.astral.sh/uv/):
   ```bash
   python3 -m pip install --user uv && python3 -m uv python install 3.12
   # then use the printed path, or `uv python find 3.12`, in place of python3.12 below
   ```
3. **Backend.**
   ```bash
   cd backend
   python3.12 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   cp .env.example .env        # then fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LLM_API_KEY
   cd ..
   ```
   `SUPABASE_URL` is the project URL (`https://<ref>.supabase.co`), **not** the publishable key.
4. **Database (once per Supabase project).** In the Supabase dashboard → SQL editor, run [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql). It creates four tables with Row Level Security on and no policies, and a private `uploads` bucket. Skip this if the team project already has it.
5. **Frontend.**
   ```bash
   cd frontend
   npm install
   cp .env.example .env        # API base URL only, no secrets
   cd ..
   ```
6. **Check.**
   ```bash
   cd backend && .venv/bin/pytest -q     # ~330 tests; live database tests run only when Supabase is reachable
   cd ../frontend && npm run lint && npm run build
   ```
7. **Run** (two terminals).
   ```bash
   cd backend && .venv/bin/uvicorn app.main:app --reload    # http://localhost:8000/api/health
   cd frontend && npm run dev                                # http://localhost:5173
   ```
   Open http://localhost:8000/api/health: `db_status` must be `"ok"` (`schema_missing` means step 4 was skipped; `invalid_url` means `SUPABASE_URL` is wrong). Then open http://localhost:5173/analyze.

The sample files, converted PDFs and saved extractions (`data/fixtures/`) are in the repo, so the demo works even without a Gemini key.

## Configuration (`backend/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | | Backend only. The service-role key bypasses RLS; never put it in the frontend |
| `LLM_PROVIDER` | `google` | Only Google Gemini is supported |
| `LLM_MODEL` / `LLM_FALLBACK_MODEL` | `gemini-3.5-flash` / `gemini-3.8-flash` | The fallback is tried when the main model errors or times out |
| `LLM_API_KEY` | | Gemini key. The free tier allows only 20 requests per model per day; use a key with billing for demos |
| `LLM_TIMEOUT_SECONDS` | `40` | Per request, so a hung call falls back quickly |
| `SAMPLE_EXTRACTION_MODE` | `saved` | Sample files: `saved` serves `data/fixtures/` (no LLM call, "Using saved extraction" badge); `live` runs Gemini. The UI switch overrides it per request |
| `ENABLE_LLM_MATCH` | `false` | Optional AI judge in Skill Matching (one extra call per match) |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | The only origin CORS allows |
| `MAX_UPLOAD_MB`, `LLM_MAX_INPUT_CHARS` | `5`, `20000` | Upload size limit; document text is truncated (and logged) beyond this |

**Company data.** Until `data/company_skillsets.json` (the organizers' `staging_company_skill_levels` export) exists, the backend uses `data/company_skillsets.placeholder.json`: marked `"dummy": true`, one flat level for every company and skillset, not RADIX data. The API reports `dummy: true` and the Talent Check screen shows a "Placeholder company data" banner. How to supply the real file: [scripts/export_company_skillsets.md](scripts/export_company_skillsets.md).

## Run the demo

Full script with timings: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md). Short version:

1. **Analyze JD:** sample "Google Data Scientist" → Analyze JD. ("Use saved extraction" is ticked by default; untick it to run Gemini live.)
2. **Parse resume:** "Karthik Subramaniam" → Parse resume → Next: build the profile → Save profile.
3. **Skill Match:** Match → score 32, six required skills missing.
4. **Contrast:** parse "Ananya Rao" → Next: build a new profile → Save → Skill Match against the same JD → score 0.
5. **Talent Check:** Karthik vs Google LLC → readiness 42; link SQL and Python to his internship and Python and pandas to his competition in the profile, save, re-run → 45.

The stepper marks steps done and survives a refresh; "Start over" clears the flow (saved rows stay in Supabase).

## Definition of Done: results on the sample pack (2026-10-28)

All numbers use the saved extractions in `data/fixtures/` (model `gemini-3.5-flash`; JD prompt `jd_extraction_v1`, resume prompt `resume_extraction_v2`) and the committed scoring (`tc-v0.1`, `sm-v0.1` with aliases v0.2). Talent Check uses the **placeholder** company data.

### 1. Each module runs on its own against at least 2 samples ✅

| Module | Run on | Result |
|---|---|---|
| JD Analytics | All 6 JDs (DOCX) on `gemini-3.5-flash`; 1 JD PDF (Oracle Associate SE) on `gemini-3.5-flash` | All `ok`; 9–13 skills each, company and role read correctly, required vs nice-to-have from the section headings |
| Resume Parsing | All 4 resumes (DOCX) on `gemini-3.5-flash`; Priya's PDF live on `gemini-3.5-flash` | All `ok`; fit-descriptor line ignored, "None listed" gives no certifications, hackathons and internships told apart, name and preferred roles read |
| Profile Builder | Drafts from all 4 resume extractions; saved and reloaded through Supabase (Karthik, Ananya, Priya) | Drafts valid against the contract; reloaded profile identical to the saved one |
| Talent Check | All 4 candidates × Google, Microsoft, Oracle | 12 skillset gaps and a readiness score each; stored in Supabase |
| Skill Matching | All 4 candidates × all 6 JDs | Table below; stored in Supabase |

### 2. The five pieces wired into one flow ✅
- **Browser (headless Chromium), saved extractions:** Google Data Scientist JD → Karthik → profile → Skill Match **32** → Ananya → profile → Skill Match **0** → Talent Check Karthik vs Google **42** → link skills to experience → **45**. No console errors; no horizontal scroll at 375 px.
- **API, live Gemini + Supabase:** Google Data Scientist + Karthik, and Oracle Application Support Analyst + Priya (PDF): extraction → profile → Talent Check → Skill Match, every LLM call answered by `gemini-3.5-flash`.
- `backend/tests/test_flow.py` runs all five modules back to back on every test run.

### 3. Different candidates get visibly different results ✅

**Skill Match score (0–100), rule-based (default):**

| | Google SWE | MS SWE | Oracle Assoc. SE | Google DS | MS Data Analyst | Oracle Support |
|---|---|---|---|---|---|---|
| Ananya (systems) | **33** | **32** | 29 | 0 | 0 | 38 |
| Karthik (data) | 0 | 0 | 10 | **32** | **29** | 13 |
| Priya (support) | 8 | 8 | 10 | 11 | 12 | **44** |
| Rohan (all-rounder) | **33** | **32** | **38** | 21 | 24 | 25 |

Matches the pack's stated fits: Ananya leads the SWE roles, Karthik the data roles, Priya the Oracle support role, Rohan is strong on most.

**Talent Check estimated level per skillset (Google, placeholder bar 5 everywhere):**

| | COD | DSA | OOD | APTI | AI | SQL | NETW | OS | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| Ananya | 7 | 1 | 4 | 1 | 1 | 3 | 1 | 4 | 40 |
| Karthik | 4 | 1 | 1 | 4 | 4 | 5 | 1 | 1 | 42 |
| Priya | 4 | 1 | 1 | 1 | 1 | 5 | 2 | 1 | 33 |
| Rohan | 2 | 1 | 4 | 1 | 3 | 1 | 1 | 1 | 37 |

(COMM, CLOUD, SWE and SYSD omitted for width; all four score 1–4 there.) Levels differ by candidate in the expected directions (Ananya coding and OS, Karthik SQL, AI and aptitude). Rohan is not first; see Limits and decision D16. Per-company ordering cannot be judged until real company data replaces the flat placeholder.

## Limits (said plainly)

- **Estimates, not verified proficiency.** Talent Check levels come from what the documents say. The constants are judgment calls, all in `backend/app/scoring/config.py`.
- **Placeholder company data.** Company bars are one flat dummy value. Talent Check readiness therefore differs by candidate but not by company, and readiness barely moves once a skillset reaches the flat bar of 5 (no bonus for exceeding it).
- **Extraction quality drives everything.** A skill counts as evidence only when a project, internship, hackathon or certification lists it. The sample resumes' internship and hackathon lines name almost no skills, so the internship tier rarely counts until the candidate links skills in Profile Builder. This is why Rohan, the pack's "strong all-rounder", is not top in Talent Check (D16).
- **Talent Check cannot tell a deep project from a trivial one**, and a single listed skill scores level 1.
- **Skill Matching is name-based by default.** JDs ask for concepts ("Programming", "Quantitative Reasoning") while resumes name tools, so many requirements show as missing and scores stay under 50. The optional AI judge (`ENABLE_LLM_MATCH`) addresses this but is off by default.
- **Some synonyms were added after reviewing the samples.** The alias list (`data/skill_aliases.json` v0.2, decision D13) includes concept synonyms requested after seeing results, and "ticketing tools = ticketing systems" was added after seeing Priya's Oracle Support score. They are genuine synonyms and unit-tested against false matches, but they were not chosen blind.
- **Live runs vary.** Gemini at temperature 0 still returns somewhat different skill lists between runs (Karthik vs Google DS scored 22 live once vs 32 from the saved extraction). The demo uses saved extractions by default so numbers are repeatable.
- **Sample PDFs are converted**, text only, from the DOCX files; PDF originals were not supplied ([data/samples/README.md](data/samples/README.md)).
- **No authentication.** The MVP has no logins (D2); anyone with the app URL can read and change profiles. Run it locally.
- **Gemini availability.** `gemini-3.8-flash` returned 503 "high demand" repeatedly on 28 Oct; the free tier is limited to 20 requests per model per day.

## Data files

- `data/samples/`: the hackathon pack (6 JDs, 4 resumes, DOCX) plus converted PDFs.
- `data/fixtures/<stem>.json`: saved extractions, `{"_meta": {model, prompt_version, generated_at}, "extraction": …}`, saved unedited by [scripts/seed_fixtures.py](scripts/seed_fixtures.py), which refuses results that did not come from the primary model.
- `data/skill_aliases.json`: same-meaning skill names for Skill Matching.
- `data/company_skillsets.placeholder.json`: dummy company bars (see Configuration).
- `data/dummy_profile.json`: a hand-written fictional profile used during development (`"dummy": true`).

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Configuration and live database check (`db_status`) |
| GET | `/api/companies` | Companies for Talent Check, with the `dummy` flag |
| GET | `/api/samples` | Sample JDs and resumes (`sample_id`s) |
| POST | `/api/extractions/jd` | Module 1. Multipart `file` (PDF/DOCX, ≤ 5 MB), or JSON `{"sample_id": "jd:google_software_engineer.docx", "mode": "saved" \| "live"}` |
| POST | `/api/extractions/resume` | Module 2. Same inputs; response includes `details` |
| GET | `/api/extractions?source_type=jd` | Recent extractions of one type |
| GET | `/api/extractions/{id}` | Fetch a stored extraction |
| POST | `/api/profiles/draft` | Module 3. `{"resume_extraction_id"}` gives a pre-filled draft; add `"base_profile_id"` to merge into a saved profile. Nothing is saved |
| POST | `/api/profiles` | Create (optional `?source_extraction_id=`). 409 if the email is taken |
| GET / PUT | `/api/profiles/{id}` | Load / full replace |
| GET | `/api/profiles` | Saved profiles, newest first |
| POST | `/api/profiles/cv` | Upload a CV to the private bucket; returns `cv_file` |
| POST | `/api/profiles/{id}/talent-check` | Module 4. `{"company_key": "google"}` (key, name or alias) |
| POST | `/api/profiles/{id}/skill-match` | Module 5. `{"jd_extraction_id"}`; `llm_judge` says whether the AI judge was off, used or failed |

Errors always have the shape `{"error": {"code", "message", "details"}}`.

## Scoring in one paragraph each

**Talent Check (tc-v0.1, D6).** Per skillset: strength = confidence (high 1.0, medium 0.7, low 0.4) × where the skill appears (internship 1.0, project/hackathon 0.7, certification 0.6, skills list only 0.3); depth = min(1, Σ strength / 2.5); experience = min(1, entries using the skillset / 3); level = 1 + round(9 × (0.6 depth + 0.4 experience)), capped at 5 when backed only by a skills list. Readiness = 100 × Σ(bar × min(1, level / bar)) / Σ bar. Formula: PLAN.md section 7.

**Skill Matching (sm-v0.1, D7 + D13).** Per JD skill, the first tier that hits: exact name (1.0), alias (1.0), near-identical name with `rapidfuzz.fuzz.ratio` ≥ 88 (0.8), optional AI judge (0.6). Required skills weigh 1.0, nice-to-haves 0.5. Missing skills are listed required first, then in JD order. Formula: PLAN.md section 8.

## Landing hero

`/` layers, bottom to top: a CSS gradient fallback, the provided WebGL shader (`kk.tsx`, landing page only), a scrim behind the text, the orbit stage (rings, planet horizon, the RADIX wordmark derived from `radix-logo.svg`, 11 orbiting logos), then the content. Checked in headless Chromium (software WebGL):
- Logos orbit (about 60 px per 2 s) and slow to about 20% while one is hovered; the loop pauses off-screen or in a hidden tab.
- The shader receives the pointer (its mouse uniform follows the cursor, cursor effect on). The visible distortion could not be measured reliably under software rendering; check it by eye on a real GPU.
- `prefers-reduced-motion`: no shader, logos at fixed positions. At 375 px: labels hidden, no horizontal scroll. No console errors.
- **Headline contrast** (WCAG, background sampled behind the text over several shader frames, 95th percentile / brightest pixel): with the plan's ~35% scrim the headline failed, so the scrim core is ~72% abyss (wider on phones). White (`--mist`) headline: 5.2–6.6:1 / ≥ 3.16:1 at every size (3:1 needed for large text). Subcopy: 6.7–8.2:1 / 4.06:1 at worst on tablet (4.5:1 needed for body text, met at the 95th percentile). The mockup's **violet→pink second line failed** (about 1.8:1 and 2.4:1) and was replaced with `--mist`, as PLAN.md 11.4 specifies.

## Notes

- `frontend/src/components/ui/kk.tsx` (the shader) is kept verbatim. It does not pass TypeScript strict null checks, so `tsconfig.app.json` maps `@/components/ui/kk` to a type declaration (`src/types/kk-shader.d.ts`) and excludes the file from type checking. Vite still bundles the real component.
- Test runs against the live database delete the rows they create.
