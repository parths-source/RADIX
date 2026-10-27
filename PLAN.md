# RADIX Talent Match — Build Plan (v0.1)

Audience: Claude Code, working in the user's VS Code repo. Read this file completely, then follow section 14 phase by phase.

Labels used throughout:
- **[Brief]** stated in the RADIX hackathon brief (PDF).
- **[Decision]** approved by the user during planning.
- **[Proposal]** recommended by the planner, not specified by the brief. Treat as the default unless the user objects.
- **[Open]** unresolved; ask the user or use the stated fallback.

---

## 1. What we are building

**[Brief]** A small, real, end-to-end tool that helps a *candidate* understand how ready they actually are for a specific job, built on RADIX's 12-skillset framework. Five pieces, wired into one flow:

`Pick a JD → Parse a resume → Build/update a profile → Run Talent Check → Run Skill Matching`

| # | Module | Type [Brief] | Job |
|---|---|---|---|
| 1 | JD Analytics | LLM extraction | JD (PDF/DOCX) → structured skill list |
| 2 | Resume Parsing | LLM extraction | Resume (PDF/DOCX) → skill list + education, projects, experience |
| 3 | Profile Builder | Plain code | Form (pre-filled from Resume Parsing), saved/loaded as JSON |
| 4 | Talent Check | Plain code | Saved profile + selected company → readiness score + per-skillset gaps |
| 5 | Skill Matching | Fuzzy match | Profile + one JD skill list → match score + matched / missing skills |

**[Brief] Definition of Done**
1. All five pieces run on their own against at least 2 of the sample JDs/resumes.
2. The five pieces are wired into one flow, end to end, for at least one company / JD / candidate combination.
3. Talent Check and Skill Matching give visibly different results for different candidates (the scoring logic is not a constant).

**[Brief / Event Plan / Milestone Checklist] Presentation and dates.** Teams of five, each member owns one module, one also serves as Scrum Master. Build window 24 Oct (9:30 AM) to 28 Oct. Content to cover: the problem, the architecture, a live demo of the integrated tool, and one challenge faced.
- **29 Oct, Phase 1 peer presentations:** 30 min presentation + 15 min panel Q&A. Top 9 teams advance.
- **30 Oct, Phase 2 expert panels:** 45 min per team to a TGL / JSS faculty / industry panel. Top 3 advance.
- **31 Oct, Phase 3 TGL Blitz:** the 3 finalists present to a jury (industry experts, TGL, JSS management, investors).
- The Milestone Checklist separately mentions a "5–8 minute script or slides". **[Open]** the two timings do not agree; build the demo so a 5–8 minute core can be expanded to 30 and 45 minutes (section 15).
- **[Correction]** an earlier planning draft said "45-minute slot" for the first presentation. The Event Plan gives 30 + 15 for Phase 1; 45 minutes applies to Phase 2.

**[Brief] Test data:** 6 JDs (Google: Software Engineer, Data Scientist; Microsoft: Software Engineer, Data Analyst; Oracle Financial Services: Associate Software Engineer, Application Support Analyst) and 4 resumes, each in PDF and DOCX. The four candidates are deliberately different (systems-learning generalist; data-leaning analyst; entry-level support-oriented; strong all-rounder). Results should visibly differ between them.

---

## 2. Approved decisions (decision log seed)

Copy this table into `docs/DECISIONS.md` in Phase 0 and keep it updated.

| # | Decision | Status |
|---|---|---|
| D1 | Backend framework: FastAPI | Approved |
| D2 | No authentication in the MVP. Backend is the only thing that talks to Supabase | Approved |
| D3 | Four tables: `extractions`, `candidate_profiles`, `talent_check_results`, `skill_match_results` | Approved (provisional) |
| D4 | Company expectations: local JSON file, exported once from the organizers' `staging_company_skill_levels` table (Option 2). No company table in our DB for the MVP | Approved |
| D5 | Contract additions (all optional fields) approved, see section 6 | Approved |
| D6 | Candidate-level formula v0.1 with experience as a criterion (section 7) | Treated as approved for the MVP; constants are tunable in config |
| D7 | Skill Matching score v0.1 (section 8) | **[Proposal] — not yet discussed with the user. Flag it in the Phase 6 summary** |
| D8 | UI: hero uses the supplied WebGL shader as background and orbiting tech logos (section 11) | Approved |
| D9 | Demo runs locally (localhost), not from a deployed URL | [Proposal] |

---

## 3. Inputs the user must supply (do not invent these)

| Input | Where it goes | If missing |
|---|---|---|
| Sample JD and resume files | `data/samples/jds/`, `data/samples/resumes/` | **PROVIDED** (6 JDs + 4 resumes, DOCX only; see section 3b). PDF versions are not supplied: generate test PDFs from the DOCX files (LibreOffice `soffice --headless --convert-to pdf`) if available, and label them as converted |
| Company expectations export from `staging_company_skill_levels` (3 companies × 12 skillsets) | `data/company_skillsets.json` | **NOT PROVIDED YET.** Use `data/company_skillsets.placeholder.json` (dummy values, `"dummy": true`); UI shows a "Placeholder company data" banner. **Blocks a truthful demo of Talent Check** |
| RADIX logo | `frontend/src/assets/radix-logo.svg`, `radix-mark.svg` | **PROVIDED** (rebuilt from the brief PDF's geometry, see 11.2) |
| Shader component `kk.tsx` | `frontend/src/components/ui/kk.tsx` | **PROVIDED** verbatim; do not modify |
| Design references | `docs/design/` | **PROVIDED**: hero mockup and background reference image |
| Milestone checklist | `docs/MILESTONES.md` | **PROVIDED** (converted from the organizers' xlsx) |
| LLM API key and provider choice | `backend/.env` | Run with fixtures only (section 5.4) |
| Supabase project URL, service-role key | `backend/.env` | Ask; do not proceed past Phase 0 DB step without them |

### 3b. What the provided sample files actually look like (inspected, not assumed)

**JDs (6, DOCX):** `Google_LLC_-_Software_Engineer`, `Google_LLC_-_Data_Scientist`, `Microsoft_-_Software_Engineer`, `Microsoft_-_Data_Analyst`, `Oracle_-_Associate_Software_Engineer`, `Oracle_-_Application_Support_Analyst`. Each has the same layout: title line "Company — Role", a "Role Category" line, a location/CTC line, then sections **Role Overview, Key Responsibilities, What We're Looking For, Nice to Have, Benefits**. No tables.
- Requirements are largely **conceptual** ("operating systems fundamentals", "object-oriented design", "system design at scale"), not just tool names. They map almost directly onto the 12 categories, so JD extraction should return category-level skills as well as named technologies.
- **"Nice to Have" = preferred; everything under "What We're Looking For" = required.** Use the section heading as the signal for `requirement_type`.
- Ignore Benefits and the CTC line.
- `company` / `role` can be read from the title line. Company names contain suffixes ("Google LLC", "Oracle Financial Services Software Limited"), so the company alias list in `company_skillsets.json` must cover them.

**Resumes (4, DOCX):** `Ananya_Rao`, `Karthik_Subramaniam`, `Priya_Menon`, `Rohan_Verma`. Layout: name, **a one-line fit descriptor**, Education, Technical Skills (comma list), Projects (bullets), **a combined "Hackathons / Internships" section**, Certifications, Achievements, Preferred Roles.
- **The fit descriptor line** (e.g. "Systems-leaning generalist — strong fit for SWE-heavy roles, weaker fit for data roles") is test-pack metadata, not resume content. **The extractor must ignore it** and must never derive skills from it. Use it only in tests, as the expected ordering when checking that results differ sensibly (section 13).
- "Certifications: **None listed**" must produce an empty list, not a skill or entry.
- Hackathons and internships share one section: the extractor must classify each bullet as hackathon or internship.
- Internship entries carry **no duration**, and bullets carry no explicit skill list. For the Talent Check formula (section 7) to work, resume extraction must **infer `skills_used` per project/hackathon/internship entry from that entry's text** (for example "multithreaded job scheduler in C++ simulating OS-level process scheduling" → C++, Operating Systems). `duration_months` stays null unless stated.
- Expected fits stated by the pack: Ananya → SWE roles; Karthik → Data Scientist / Data Analyst; Priya → Oracle roles; Rohan → strong across nearly all roles.

---

## 4. Architecture

**[Proposal]** Modular monolith.

```
React (Vite, TS, Tailwind, shadcn)  --REST/JSON-->  FastAPI
                                                      ├─ services/jd_analytics      (LLM)
                                                      ├─ services/resume_parsing    (LLM)
                                                      ├─ services/profile_builder   (plain)
                                                      ├─ services/talent_check      (plain, reads company JSON)
                                                      └─ services/skill_matching    (rules + optional LLM judge)
                                                      │
                                      Supabase Postgres (4 tables)   Supabase Storage (private "uploads" bucket)
```

- React talks **only** to the FastAPI backend, never directly to Supabase.
- The Supabase service-role key and the LLM key live only in the backend environment.
- Each module is a separate Python package/file with a clear function interface so the five can be owned and tested independently.
- Request flow example (Skill Matching): UI → `POST /api/profiles/{id}/skill-match` → load profile and JD extraction from Postgres → `skill_matching.run()` → store result row → return JSON → UI renders score, matched, missing.

**Stack**
- Backend: Python 3.11+, FastAPI, Pydantic v2, uvicorn, `supabase` (supabase-py), `pdfplumber` (PDF text), `python-docx` (DOCX text including tables), `rapidfuzz` (fuzzy matching), LangChain with the chosen provider package, `python-multipart`, `pytest`, `httpx` (API tests), `python-dotenv`/pydantic-settings.
- Frontend: Vite + React + TypeScript, Tailwind CSS, shadcn/ui (needed so the shader lives in `src/components/ui`), React Router, React Hook Form + zod (profile form), Recharts (radar/bar charts), `react-icons` (tech logos), `sonner` (toasts), `@fontsource-variable/inter`.
- LLM: **[Open]** provider not chosen. Build a single `llm.py` factory driven by env vars `LLM_PROVIDER` and `LLM_MODEL`; use LangChain structured output bound to the Pydantic models. Temperature 0.

---

## 5. Repository layout

```
radix-talent-match/
├─ CLAUDE.md  PLAN.md  README.md  .gitignore
├─ docs/            DECISIONS.md  CONTRACT.md (copy of section 6)  DEMO_SCRIPT.md
├─ data/
│  ├─ samples/jds/        *.pdf *.docx
│  ├─ samples/resumes/    *.pdf *.docx
│  ├─ fixtures/           cached good extractions, one JSON per sample file (see 5.4)
│  ├─ company_skillsets.json              (real, user-supplied)
│  ├─ company_skillsets.placeholder.json  (dummy)
│  └─ skill_aliases.json
├─ scripts/         export_company_skillsets.md (how the user exports) · seed_fixtures.py
├─ supabase/migrations/0001_init.sql
├─ backend/
│  ├─ requirements.txt  .env.example
│  ├─ app/
│  │  ├─ main.py  config.py  errors.py  logging_setup.py
│  │  ├─ models/contract.py            (Pydantic models = the contract)
│  │  ├─ api/  health.py samples.py companies.py extractions.py profiles.py talent_check.py skill_match.py
│  │  ├─ services/  file_text.py llm.py normalization.py repository.py
│  │  │             jd_analytics.py resume_parsing.py profile_builder.py talent_check.py skill_matching.py
│  │  ├─ prompts/  jd_extraction_v1.md  resume_extraction_v1.md  skill_judge_v1.md
│  │  └─ scoring/config.py             (all constants)
│  └─ tests/
└─ frontend/
   ├─ .env.example
   └─ src/
      ├─ components/ui/       (shadcn components + kk.tsx)
      ├─ components/hero/     Hero.tsx OrbitStage.tsx OrbitIcon.tsx useOrbit.ts RadixLogo.tsx Nav.tsx
      ├─ components/app/      Stepper, SkillChips, ScoreRing, GapRadar, GapTable, MatchLists, FileDrop, StateViews
      ├─ pages/               Landing, AnalyzeJD, ParseResume, Profile, TalentCheck, SkillMatch
      ├─ lib/                 api.ts  flowState.tsx (context + localStorage ids)  utils.ts
      └─ types/contract.ts    (TypeScript mirror of section 6)
```

### 5.4 Fixtures (reliability for the live demo)
`data/fixtures/<source_file_name>.json` holds one known-good extraction per sample file. If the LLM call fails or no key is configured **and** the uploaded file name matches a fixture, return the fixture with `status: "fallback"` and show a visible "Using saved extraction" badge in the UI. If there is no matching fixture, return a clear 502 error. Fixtures are generated by running the real extractor once (`scripts/seed_fixtures.py`) and reviewing the output by hand. Never hand-edit a fixture to look better than the real extractor output.

---

## 6. Shared data contract v0.1

**[Brief]** shapes, plus **[Decision]** optional additions marked `(+)`. Every `(+)` field is optional so a module that ignores it still emits a valid object. Implement as Pydantic models in `backend/app/models/contract.py` and mirror in `frontend/src/types/contract.ts`. Copy this section to `docs/CONTRACT.md`.

**Category codes [Brief]:** `COD, DSA, OOD, APTI, COMM, AI, CLOUD, SQL, SWE, SYSD, NETW, OS` (the 12 skillsets) plus `OTHER`. Every skill has exactly one `category_code`.

**Category descriptions used in prompts [Proposal — the brief gives names only; confirm against RADIX's competency dictionary if the user has it]:**
COD programming languages and coding · DSA data structures and algorithms · OOD object-oriented design · APTI aptitude, quantitative and logical reasoning · COMM communication · AI machine learning, deep learning, NLP, LLMs, data-science methods · CLOUD cloud platforms and services · SQL databases and SQL · SWE software-engineering practice (version control, testing, SDLC, APIs, DevOps) · SYSD system design and architecture · NETW networking · OS operating systems. Anything else: `OTHER`.

```jsonc
// Skill [Brief]
{
  "skill_name": "Python",
  "category_code": "COD",            // one of the 13 codes
  "evidence": "short quote or reason",
  "confidence": "high",              // high | medium | low
  "requirement_type": "required"     // (+) JD skills only: required | preferred. Default required
}

// Entry (+): used inside hackathons, internships, projects, certifications
{
  "title": "...",
  "description": "...",
  "skills_used": ["Python", "SQL"],  // (+) names must exist in the profile's skills list
  "duration_months": 1               // (+) optional, internships mainly
}

// Extracted skill list [Brief: Role 1 and 2 output]
{
  "id": "uuid",                      // assigned on save
  "source_type": "jd",               // jd | resume
  "source_file": "google_swe.pdf",
  "company": "Google LLC",           // JD only
  "role": "Software Engineer",       // JD only
  "skills": [ /* Skill */ ],
  "details": {                       // (+) resume only
    "education": "...",
    "projects": [ /* Entry */ ],
    "experience": [ /* Entry */ ]
  },
  "status": "ok"                     // (+) ok | fallback | llm_failed
}

// Candidate profile [Brief: Role 3 output]
{
  "id": "uuid",
  "name": "...", "email": "...", "education": "...",
  "skills": [ /* Skill */ ],
  "hackathons": [ /* Entry */ ],
  "internships": [ /* Entry */ ],
  "certifications": [ /* Entry */ ],
  "projects": [ /* Entry */ ],       // (+) not in the brief's profile, needed for experience scoring
  "preferred_roles": ["..."],
  "cv_file": "..."
}

// Talent Check result [Brief: Role 4 output]
{
  "company": "Google LLC",
  "skillset_gap": [
    { "category_code": "COD", "required_level": 8, "candidate_level": 6, "gap": true,
      "evidence_status": "evidenced" }   // (+) none | claimed_only | evidenced
  ],
  "readiness_score": 72,
  "scoring_version": "tc-v0.1"           // (+)
}

// Skill Matching result [Brief: Role 5 output]
{
  "jd_source_file": "google_swe.pdf",
  "match_score": 64,
  "matched_skills": [
    { "jd_skill": "PostgreSQL", "candidate_skill": "Postgres", "category_code": "SQL",
      "match_type": "alias",             // exact | alias | fuzzy | llm
      "evidence": "..." }
  ],
  "missing_skills": [
    { "skill_name": "Kubernetes", "category_code": "CLOUD", "reason": "No matching skill in profile",
      "requirement_type": "required" }
  ],
  "scoring_version": "sm-v0.1"           // (+)
}
```

Validation rules: category_code in the 13 codes; confidence in the 3 values; levels integers 1–10; scores integers 0–100; skill_name non-empty after trim; at most 100 skills per list.

---

## 7. Talent Check scoring v0.1 (D6)

Plain code, deterministic, no LLM. All constants in `scoring/config.py`. Output must say "estimated" in the UI: it is an **evidence-based estimate from documents, not verified proficiency**.

**Per category `c`** (ignore `OTHER`; de-duplicate skills after normalization):

1. `strength(s) = conf(s) × tier(s)`
   - `conf`: high 1.0, medium 0.7, low 0.4
   - `tier(s)` = strongest place the skill appears, matched via normalized names in the `skills_used` of profile entries: internship 1.0 · project or hackathon 0.7 · certification 0.6 · skills list only 0.3
2. `D_c = min(1, Σ strength(s) / 2.5)` (depth; roughly three well-evidenced skills give full depth)
3. `E_c` = number of internship / hackathon / project entries whose `skills_used` include a skill of category `c`; `X_c = min(1, E_c / 3)`
4. `raw_c = 0.6 × D_c + 0.4 × X_c`
5. `candidate_level_c = 1 + round(9 × raw_c)`, half rounds up, result in 1..10
6. Cap: if `E_c = 0` and every skill in `c` is skills-list-only, `candidate_level_c = min(candidate_level_c, 5)`
7. No skills in `c`: level 1, `evidence_status = "none"`. Claims only (cap applies): `"claimed_only"`. Otherwise `"evidenced"`.

**Readiness** (for categories that have a `required_level R_c`; skip categories without one):
- `coverage_c = min(1, candidate_level_c / R_c)` (no bonus for exceeding the bar)
- `readiness_score = round(100 × Σ(R_c × coverage_c) / Σ R_c)`
- `gap_c = candidate_level_c < R_c`

**Worked example** (illustrative, for a unit test): DSA skills Data Structures (high, used in a project), Algorithms (high, used in a hackathon), Dynamic Programming (medium, listed only). Strengths 0.7 + 0.7 + 0.21 = 1.61 → D = 0.644; E = 2 → X = 0.667; raw = 0.653 → level 7. Claims-only counter-example: four DSA skills, all high, listed only → strengths 1.2 → D = 0.48, X = 0 → raw 0.288 → level 4.

**Honest limits to show in the README and the demo:** constants are judgment calls; results depend on extraction quality; cannot distinguish a deep project from a trivial one.

---

## 8. Skill Matching scoring v0.1 (D7, **[Proposal] — flag to user**)

Input: candidate profile (or resume extraction) + one JD extraction.

**Normalization (`normalization.py`):** lowercase, trim, collapse whitespace, strip punctuation noise (keep `+ # .` so `C++`, `C#`, `Node.js` survive), then map through `data/skill_aliases.json` (seed: js→javascript, ts→typescript, postgres→postgresql, node→node.js, reactjs→react, k8s→kubernetes, ml→machine learning, dsa→data structures and algorithms, oop→object-oriented programming, gcp/aws/azure kept distinct). Keep the file small and extendable.

**Match tiers, per JD skill, first hit wins:**
1. `exact` — normalized names equal. Quality 1.0
2. `alias` — equal after alias mapping. Quality 1.0
3. `fuzzy` — `rapidfuzz.fuzz.ratio` ≥ 88 on normalized names. Quality 0.8. **Do not use `partial_ratio` or token-set ratios** (they match "Java" to "JavaScript")
4. `llm` — optional, behind `ENABLE_LLM_MATCH=false` by default: one batched call that judges remaining unmatched JD skills against the candidate's skills and returns only strict JSON with a one-line reason. Quality 0.6. Off in tests

**Score:** weight `w = 1.0` for `required`, `0.5` for `preferred` (default `required` if untagged).
`match_score = round(100 × Σ(w × quality over matched JD skills) / Σ(w over all JD skills))`.
No JD skills → return a clear error, not a score of 0.

**Missing skills** are ranked: required before preferred, then by order of appearance in the JD. Each has a `reason`. **The gap list matters more than the number [Brief]**: the UI gives it the most visual weight.

**Mandatory unit cases:** Java ≠ JavaScript; C ≠ C++; SQL ≠ NoSQL; Postgres = PostgreSQL via alias; duplicate JD skills count once; empty profile → score 0 with all skills missing; identical input → identical output; different candidates against the same JD → different scores.

---

## 9. Database (Supabase Postgres) — D3

No tables exist yet. Create `supabase/migrations/0001_init.sql` and apply it to the user's Supabase project. All `id` columns `uuid primary key default gen_random_uuid()`. All tables have `created_at timestamptz default now()`.

**`extractions`**: `source_type text not null check in ('jd','resume')` · `source_file text not null` · `file_path text` · `company text` · `role text` · `skills jsonb not null default '[]'` · `details jsonb` · `status text not null default 'ok' check in ('ok','fallback','llm_failed')`

**`candidate_profiles`**: `name text not null` · `email text unique` · `education text` · `skills jsonb not null default '[]'` · `hackathons jsonb default '[]'` · `internships jsonb default '[]'` · `certifications jsonb default '[]'` · `projects jsonb default '[]'` · `preferred_roles jsonb default '[]'` · `cv_file text` · `source_extraction_id uuid references extractions(id) on delete set null` · `updated_at timestamptz default now()`

**`talent_check_results`**: `profile_id uuid not null references candidate_profiles(id) on delete cascade` · `company text not null` · `skillset_gap jsonb not null` · `readiness_score int not null check (0..100)` · `scoring_version text not null`

**`skill_match_results`**: `profile_id uuid not null references candidate_profiles(id) on delete cascade` · `jd_extraction_id uuid not null references extractions(id) on delete cascade` · `jd_source_file text not null` · `match_score int not null check (0..100)` · `matched_skills jsonb not null default '[]'` · `missing_skills jsonb not null default '[]'` · `scoring_version text not null`

Indexes: `candidate_profiles(email)` (unique already), `talent_check_results(profile_id)`, `skill_match_results(profile_id)`, `skill_match_results(jd_extraction_id)`. Nothing else.

**Security:** enable Row Level Security on all four tables **with no policies** so the public anon key cannot read or write anything; the backend uses the service-role key, which bypasses RLS. Create a **private** Storage bucket `uploads`; store files as `{jd|resume|cv}/{uuid}/{sanitized_filename}`.

**Company expectations (D4):** not in the DB. `data/company_skillsets.json` shape:
```jsonc
{
  "_meta": { "source": "staging_company_skill_levels export", "dummy": false, "exported_at": "YYYY-MM-DD" },
  "companies": [
    { "company_key": "google", "display_name": "Google LLC", "aliases": ["Google", "Google LLC"],
      "skillsets": [ { "category_code": "COD", "required_level": 8 } /* … exactly 12 … */ ] }
  ]
}
```
The loader validates at startup: every company has exactly the 12 category codes once, levels are integers 1–10; otherwise fail loudly with a clear message. The real export's column layout is **[Open]**: when the user provides it, write a small adapter and document it in `scripts/export_company_skillsets.md`. The loader should expose `dummy` to the API so the UI can show the banner.

---

## 10. API (FastAPI) — all under `/api`, JSON, no auth (D2)

Errors use one shape: `{ "error": { "code": "string", "message": "human readable", "details": {} } }`. CORS allows only the frontend origin from env.

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/health` | Liveness + whether DB, LLM key and company data are configured, and `company_data_dummy` | |
| GET | `/samples` | List sample JD and resume files found in `data/samples` | |
| GET | `/companies` | `[{company_key, display_name}]` + `dummy` flag | Source: company JSON |
| POST | `/extractions/jd` | Module 1. multipart `file` **or** JSON `{sample_id}` | Returns ExtractedSkillList (status ok/fallback). 422 unsupported type/empty text, 413 too large, 502 LLM failure without fixture |
| POST | `/extractions/resume` | Module 2. Same inputs | Includes `details` |
| GET | `/extractions/{id}` | Fetch one | 404 if missing |
| POST | `/profiles` | Module 3 create | Body = profile without id |
| PUT | `/profiles/{id}` | Update | Full replace |
| GET | `/profiles/{id}` | Load | |
| GET | `/profiles` | List (id, name, email, updated_at) | For choosing a saved profile |
| POST | `/profiles/{id}/talent-check` | Module 4. Body `{company_key}` | Stores and returns TalentCheckResult. 404 unknown profile/company |
| POST | `/profiles/{id}/skill-match` | Module 5. Body `{jd_extraction_id}` | Stores and returns SkillMatchResult. 422 if JD has no skills |
| GET | `/profiles/{id}/results` | Latest results for the profile | Optional |

**File rules:** accept `.pdf` and `.docx` only, check extension **and** content type, max 5 MB, sanitize file names, reject files with no extractable text (`422 no_extractable_text`, mention that scanned PDFs are unsupported). Truncate text sent to the LLM at a configured limit and log when that happens.

**Sample-file specifics for the prompts (see 3b):** JD: `required` from "What We're Looking For" and "Key Responsibilities", `preferred` from "Nice to Have", ignore Benefits and compensation; return conceptual category-level skills ("Operating Systems", "System Design") as well as named technologies. Resume: ignore the one-line fit descriptor under the name; return an empty list for "None listed"; split the combined "Hackathons / Internships" section into hackathons and internships; **infer `skills_used` for every project, hackathon and internship entry from that entry's own text** and only from skills that appear in the resume's skills list or are clearly named in the entry.

**LLM extraction rules (modules 1 and 2):** prompts live in `app/prompts/*_v1.md` and the version is logged. Send the document text plus the 13-category definitions. Instruct: extract only what the text supports; `evidence` must be a short quote from the document; map each skill to exactly one category; name technologies explicitly; for JDs focus on "Key Responsibilities" and "What We're Looking For" and tag `required` vs `preferred` from wording like "must have" / "nice to have"; for resumes be tolerant of layout variation. Use structured output validated by Pydantic; on validation failure retry once with the error appended; then fall back (5.4). Drop skills whose category is invalid by mapping them to `OTHER`. De-duplicate by normalized name. Log latency and token usage if available; never log full document text.

---

## 11. Frontend and UI spec

### 11.1 Design tokens [Decision/Proposal]
The shader's palette is already the target blue. Use these exact values so everything matches:

| Token | Hex | Use |
|---|---|---|
| `--abyss` | `#031C26` | page base, left side of hero |
| `--deep` | `#0A2A44` | panels, secondary surfaces (between abyss and tide) |
| `--tide` | `#1B6CA8` | primary accent, active states |
| `--cyan` | `#5AD2F4` | highlights, focus rings, gain/positive |
| `--mist` | `#EAF9FF` | primary text on dark, bright highlights |
| `--violet` / `--pink` | `#8B7CFF` / `#FF7AB6` | only for the hero gradient headline and match-score accents |
| `--brand` | `#3D6BFF` | RADIX brand blue (the logo's dot): primary buttons, active stepper step, links |
| `--warn` | `#F2B84B` | gaps, caution |
| `--danger` | `#FF6B6B` | errors |

Type: Inter Variable for UI and headings; the RADIX wordmark is an image/SVG. Sentence case for UI text. App pages: dark theme only (matches the hero). Surfaces are glass panels: `bg-white/5`, `border border-white/10`, `backdrop-blur`, one consistent radius.
Quality floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected, text contrast checked against the brightest part of the shader.

### 11.2 Logo
**Provided, ready to use:** `frontend/src/assets/radix-logo.svg` (mark + wordmark) and `frontend/src/assets/radix-mark.svg` (mark only). They were rebuilt from the brief PDF's page-1 header: measured geometry, with the wordmark converted from Inter Bold outlines to paths (tracking ≈ 0.33 em) so no font is needed. Do not redraw or restyle them.
- Mark: white outer ring, inner ring in white at 45% opacity, solid dot `#3D6BFF`. Wordmark: white, Inter Bold, wide-tracked capitals.
- Both are designed for dark backgrounds (white strokes and letters), which is what the hero and app use.
- The product label "TALENT MATCH" sits beside the logo in small tracked text, as in the user's mockup. Set it in HTML (Inter, small, `--mist` at ~70%), not inside the SVG.
- `RadixLogo.tsx` renders the SVG with an optional "Talent Match" label prop. The hero's large "RADIX" lettering above the planet reuses the wordmark, scaled up, with a soft cyan glow. If a separate wordmark-only file is needed, derive it from `radix-logo.svg` instead of making a new design.
- The brief itself is set in **Inter**, so Inter for the UI is consistent with the brand.

### 11.3 Shader integration (user-supplied component) [Brief of the user]
The component is `ShaderBackground` exported from `kk.tsx`: a dependency-free WebGL canvas that fills its parent, animates continuously, and distorts under the pointer (cursor effect is already configured). Its colours are already `#031C26 → #1B6CA8 → #5AD2F4 → #EAF9FF`.
1. Confirm the frontend uses shadcn project structure, Tailwind and TypeScript (Vite template `react-ts`, then `npx shadcn@latest init`, alias `@` → `src`). The default component path is `src/components/ui`. This folder matters because shadcn tooling and the user's import (`@/components/ui/kk`) both assume it.
2. Place `kk.tsx` verbatim at `src/components/ui/kk.tsx`. **Do not modify it.**
3. Use it as `<ShaderBackground className="absolute inset-0" />` inside a `relative overflow-hidden` hero wrapper, **below** all content (`z-0`). It listens for pointer movement on `window`, so overlay content does not block the effect; still mark purely decorative overlays `pointer-events-none`.
4. Underneath it, give the wrapper a CSS gradient fallback (`--abyss` to `--tide`) so the hero is never blank if WebGL is unavailable.
5. Mount the shader **only on the landing page**. App pages use a static CSS version of the same gradient plus a faint noise overlay, to keep GPU use low during the demo.
6. If `prefers-reduced-motion: reduce`, do not mount the shader; show the static gradient.

### 11.4 Landing page and hero (the memorable moment — spend the effort here)
Reference: the user's mockup (`Radix_AI_Career_Orbit.png`): centred headline over a wide elliptical orbit with tech logos around a glowing horizon "planet" carrying the RADIX wordmark. **Change from the mockup:** background is the blue shader, not black/purple space.

**Layers (bottom to top)**
1. CSS gradient fallback.
2. `ShaderBackground` (`absolute inset-0`).
3. Scrim: a radial gradient that darkens the centre-top behind the text (about 35% `--abyss`) so the headline stays legible over the bright upper-right of the shader.
4. Orbit stage: decorative SVG ellipse rings (thin strokes, `--cyan` at 20–35% opacity), the planet horizon, the big RADIX wordmark, the orbiting icons, small glowing dots drifting on the inner rings.
5. Content: nav, badge, headline, subcopy, CTA.

**Copy (from the mockup, keep exactly)**
- Nav: logo + "Talent Match" label · Home · Features · About · "Get Started" (pill outline)
- Badge: "AI-POWERED CAREER INTELLIGENCE"
- H1: "Your Skills. Our AI." / second line "A Better Career Tomorrow." (second line uses a violet→pink gradient per the mockup; verify contrast against the shader, fall back to `--mist` if it fails)
- Sub: "RADIX Talent Match helps you understand job requirements, evaluate your skills, find the gaps, and build your path to success."
- CTA: "Get Started" → `/analyze`

**Planet horizon:** a large circle clipped to the lower part of the stage with a thin bright rim light along its top edge (cyan-white instead of the mockup's orange, to suit the blue palette) and a soft outer glow, built from CSS radial/conic gradients. The "RADIX" wordmark sits just above the rim.

**Orbiting logos (required: they must move)**
- 11 icons from `react-icons`: JavaScript, Python, TypeScript, Java (`FaJava`), Node.js, React, C++, Git, Linux, Cloud, SQL (database icon). Each sits in a ~64–72 px glass circle with a 1 px ring tinted with the brand colour and a soft same-colour glow, and a small label beneath (as in the mockup).
- Motion: implement `useOrbit` as **one `requestAnimationFrame` loop** that writes `transform` directly on refs (no React state per frame). Each icon `i` has angle `θ = θ0_i + ω·t` with `θ0_i = 2π·i/11`, `ω = 2π/90 s`. Position on an ellipse: `x = cx + a·cos θ`, `y = cy + b·sin θ`, with `a ≈ 46% of stage width`, `b ≈ 14% of stage width` (tune to match the mockup). Depth cue from `sin θ`: icons at the back are smaller (scale ~0.8) and dimmer (opacity ~0.7) and sit behind the planet wordmark; icons at the front are larger (scale ~1.05) and in front (`z-index`). Icons stay upright.
- Hover on an icon: slow the whole orbit to ~20% (ease the speed, do not jump), scale that icon 1.12, brighten its glow.
- Pause the loop when the stage is off-screen (IntersectionObserver) or the tab is hidden; respect `prefers-reduced-motion` (render icons at fixed positions, no loop).
- Responsive: derive `a`, `b`, icon size and label visibility from the container width (ResizeObserver). Below 640 px hide labels and shrink icons; keep all 11.
- Icons and rings are decorative: `aria-hidden`, with one visually hidden sentence describing them.

**Below the hero (small):** a "Features" section with the five modules as five cards in flow order (this is a real sequence, so numbering is justified), and a short "About" block. Nav links scroll to these. Keep it minimal.

### 11.5 App flow (stepper), routes and screens
Routes: `/` Landing · `/analyze` JD · `/resume` Resume · `/profile` Profile · `/talent-check` · `/match`. A persistent stepper shows the five steps with state (not started / done). `flowState.tsx` keeps `jdExtractionId`, `resumeExtractionId`, `profileId` in context and `localStorage` so a refresh does not lose the demo.

| Screen | What the user does | What it shows |
|---|---|---|
| Analyze JD | Pick a sample JD from a list or upload PDF/DOCX | Skills grouped by the 12 categories as chips (confidence shown, evidence on hover/expand), required vs preferred, company and role, a "Using saved extraction" badge if fallback |
| Parse resume | Pick a sample resume or upload | Extracted skills by category, plus education, projects, experience |
| Profile | Edit the form pre-filled from the resume extraction: basic details, skills (add/remove/edit category), hackathons, internships, certifications, projects (each with a `skills_used` multi-select drawn from the skills list), preferred roles, CV upload | Validation messages inline; "Save profile" confirms with a toast ("Profile saved") |
| Talent Check | Choose a company, press "Run Talent Check" | Readiness score ring, **radar chart** (12 categories, required vs candidate), per-category table with gap highlighted and an evidence label (estimated / claimed only / none); "Placeholder company data" banner when dummy |
| Skill Match | Choose the analyzed JD, press "Match" | Match score ring (secondary), then the **missing-skills list first and largest**, required before preferred, then matched skills with match type chips (exact / alias / fuzzy) |

All screens need loading skeletons, empty states that say what to do next, and errors that say what went wrong and how to fix it (no apologies, no vague text). Button labels name the action ("Run Talent Check", "Save profile"). Keep the same action name in toasts.

---

## 12. Logging, errors, security (keep it light)
- Structured logs with a request id; log module, latency, status, prompt version; **never** log document text or emails.
- One exception handler producing the error shape in section 10; no stack traces in responses.
- Validate every request body with Pydantic; validate every LLM response against the contract before storing.
- `.env` files git-ignored; `.env.example` committed; only the backend holds the service-role and LLM keys.
- Deferred (do not build now): rate limiting, caching, authentication, CI/CD, deployment.

---

## 13. Testing (build alongside each module)

**Backend (pytest):**
- `scoring`: the seven checks from section 7 (no skills → level 1 and all gaps; duplicates counted once; monotonic, adding evidence never lowers a level; claims-only never above 5; levels in 1..10 and readiness in 0..100; deterministic; low confidence scores below high) plus the two worked examples.
- `normalization` and `skill_matching`: all cases from section 8.
- Company-data loader: rejects missing categories, levels outside 1..10, duplicate codes.
- File handling: rejects wrong type, oversized file, empty-text PDF; accepts PDF and DOCX.
- API tests with `httpx` and a **mocked LLM**: success path, validation-failure retry then fallback, no key + fixture present, no key + no fixture (502).
- Contract tests: every fixture and every API response validates against the Pydantic models.
- DB tests: run against the real Supabase project only if env is set, otherwise skipped.

**Frontend:** `npm run lint` and `npm run build` must pass. Smoke test the happy path (landing → analyze → resume → profile → talent check → match) at least with Playwright or manually, following `docs/DEMO_SCRIPT.md`.

**Definition-of-Done checks (manual, record results in README):**
1. Each module runs alone on ≥ 2 sample JDs / resumes.
2. One full end-to-end run.
3. Two different candidates give visibly different Talent Check and Skill Match results for the same company/JD. Also sanity-check against the brief's stated fits (entry-level support candidate scores best against the Oracle roles; data-leaning candidate against the data roles). If the ordering is wrong, tune constants in `scoring/config.py` and record the change; do not special-case candidates.

---

## 14. Build order (phases, estimates in person-hours, assumptions: one developer working with Claude Code, familiar stack; double if debugging is heavy)

Stop at the end of each phase, run tests, summarise, wait for approval.

| Phase | Deliverable | Est. | Depends on | Acceptance |
|---|---|---|---|---|
| **0 Setup** | Repo, `docs/DECISIONS.md`, backend skeleton + `/health`, frontend (Vite + TS + Tailwind + shadcn init, `@` alias), `kk.tsx` in place, `.env.example` files, Supabase migration applied | 1.5–2 | Supabase project + keys | `/health` returns OK; frontend builds; migration applied; RLS enabled |
| **1 Contract & fixtures** | Pydantic models, TS types, `docs/CONTRACT.md`, placeholder company JSON + loader with validation, alias file, hand-written **dummy** profile for unblocking Roles 4–5 | 1–1.5 | 0 | Contract tests pass; loader rejects bad data |
| **2 Landing hero** (can run in parallel with 3–6) | Section 11.3–11.4 complete: logo, shader, orbit, copy, nav, features/about | 2.5–3.5 | 0, logo + `kk.tsx` | Icons visibly orbit; shader reacts to hover; reduced-motion and mobile behave; no console errors; Lighthouse/contrast sanity check |
| **3 Modules 1 & 2** | File text extraction, prompts v1, LLM factory, extraction endpoints, validation + retry + fixtures fallback, JD and Resume screens | 3–4 | 1, LLM key | ≥ 2 JDs and ≥ 2 resumes extract correctly (PDF and DOCX); failure paths tested |
| **4 Module 3** | Profile CRUD endpoints, form with pre-fill, `skills_used` multi-select, CV upload, save/load | 2–2.5 | 1 (3 for pre-fill) | Round-trips through the DB; validation works |
| **5 Module 4** | Talent Check service + endpoint + screen (radar, table, banner) + all scoring tests | 2–2.5 | 1, 4 | Section 7 tests pass; worked examples reproduce |
| **6 Module 5** | Normalization, matcher tiers, optional LLM judge (off), endpoint, screen with missing-first layout | 2.5–3 | 1, 3, 4 | Section 8 tests pass. **Flag D7 to the user** |
| **7 Integration** | Stepper, flow state, wiring across all five, README run instructions | 2 | 3–6 | Full flow works from the UI for one company/JD/candidate |
| **8 Hardening & demo** | Seed fixtures from real extractor output, error/empty/loading polish, DoD checks, `docs/DEMO_SCRIPT.md`, rehearsal notes | 2–3 | 7 | Section 13 DoD checks recorded; demo runs offline-safe with fixtures |

Rough total: 17–23 hours. Phase 2 and phases 3–6 are independent after Phase 1, so they can be split between people. **If time runs short, protect in this order:** 7 (working end to end) > 5 and 6 (different results per candidate) > 3 > 4 > 2 polish.

---

## 15. Demo script outline (write the full version in `docs/DEMO_SCRIPT.md` in Phase 8)

Timings differ by round (section 1): **29 Oct peer round 30 min + 15 min Q&A; 30 Oct expert panel 45 min; the Milestone Checklist mentions a 5–8 min script.** Write one script with a **5–8 minute core** and add-on blocks, so it can be run at any length.

**Core (5–8 min)**
1. **Problem (1 min):** candidates cannot tell how ready they are for a specific job; RADIX data is company-side, this flips it.
2. **Architecture (1–2 min):** the diagram in section 4, the shared contract, plain code vs LLM per module and why.
3. **Live demo (3–4 min):** pick a JD → parse a resume → build the profile → Talent Check → Skill Match. Use pre-picked combinations with clear contrast (for example the data-leaning candidate against a Data Scientist JD, then the systems candidate against the same JD). Have the fixture fallback ready in case the LLM or network misbehaves.
4. **One challenge (1 min):** a real one from the build, for example turning confidence labels into a defensible 1–10 level, or "Java" vs "JavaScript" in fuzzy matching.

**Add-ons for the 30 and 45 minute slots:** a second candidate/company pair, the scoring formula walkthrough with the worked example, the data contract, failure handling (fallback badge), the tests, and the limits stated plainly (estimates are evidence-based, not verified proficiency). Leave about a third of a slot for Q&A.

---

## 16. Post-hackathon backlog [Proposal, not for now]
Authentication and per-user data · skill-alias dictionary growth and normalization review · evidence-quality and duration-weighted experience scoring · small labelled evaluation set and baseline-vs-improved matcher comparison · skill-gap action plans (projects, learning) · assessment history and progress tracking · caching and rate limiting · CI and deployment · evidence-quote verification against the source text · `company_skill_levels` table and an admin import.

---

## 17. Open items summary
- **[Open]** LLM provider/model and API key.
- **[Open]** Real company data export and its exact column layout.
- **[Open]** Presentation length (30+15, 45, or 5–8 minutes): confirm with the organizers; the script is modular.
- **[Open]** PDF versions of the sample files were not supplied; DOCX only.
- **[Open]** Category descriptions (section 6) confirmed against RADIX's competency dictionary, if available.
- **[Open]** Skill Matching score v0.1 (D7) needs the user's review.
- **[Open]** Tuned values for scoring constants after seeing real sample results.
