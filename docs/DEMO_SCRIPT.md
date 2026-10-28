# Demo script

For the presenting team. A **5–8 minute core** you can run on its own, plus add-on blocks for the **30 + 15 minute peer round (29 Oct)** and the **45 minute expert panel (30 Oct)**. Leave about a third of any slot for questions.

All numbers below come from the saved extractions in `data/fixtures/` (made by `gemini-3.5-flash`) and the scoring code as committed. With **"Use saved extraction" ticked (the default)** you will see exactly these numbers. Live runs can differ by a few points.

## Before you start (5 minutes, once)

1. Start the backend and frontend (README → Run). Open http://localhost:5173.
2. Check http://localhost:8000/api/health: `db_status` should be `"ok"`. The LLM is not needed for the core demo.
3. Press **Start over** in the header so the stepper is empty.
4. Keep a second tab open on `/match` in case you need to jump.
5. Say out loud at least once: **company levels are placeholder data** (the yellow banner). Never present them as RADIX data.

## Core (5–8 minutes)

### 1. Problem (1 minute)
- RADIX already has company-side hiring data: what each company expects across 12 skillsets.
- A candidate has no way to see how ready they are for one specific job, or what exactly is missing.
- RADIX Talent Match flips the lens: the same 12-skillset framework, built for the candidate.

### 2. Architecture (1–2 minutes)
- One flow, five modules: **JD Analytics → Resume Parsing → Profile Builder → Talent Check → Skill Matching**.
- React frontend → FastAPI backend → Supabase (Postgres + private file storage). The browser never talks to Supabase or the LLM directly.
- **LLM only where it helps:** reading JDs and resumes (Gemini, structured output validated against our data contract). **Plain code where it must be explainable:** Profile Builder, Talent Check scoring and Skill Matching rules.
- One shared JSON contract between all five modules, versioned, with every change logged in `docs/DECISIONS.md`.

### 3. Live demo (3–4 minutes): same JD, two very different candidates

**a. Analyze the JD.** `/analyze` → sample **Google Llc Data Scientist** → **Analyze JD**.
- Point at: skills grouped by skillset, solid = required, dashed = nice to have, click a chip to show the quoted evidence.
- Point at the **"Using saved extraction"** badge: "for the demo we use a saved run of the same extractor so it is instant and repeatable; untick the box and it runs live."

**b. Parse the first resume.** `/resume` → **Karthik Subramaniam** (data-leaning) → **Parse resume**.
- Point at: skills by skillset, projects with the skills each one used, the internship and the competition told apart.
- Mention: the one-line "fit" sentence under his name in the sample file is ignored on purpose; skills come only from evidence.

**c. Build the profile.** **Next: build the profile** → the form is pre-filled → **Save profile** ("Profile saved").

**d. Skill Match first (the headline).** Stepper → **Skill Match** → profile and JD are pre-selected → **Match**.
- **Match score 32.** Matched: A/B Testing, SQL, Statistics.
- **Missing (required, shown first):** Schema Design, Query Optimization, Predictive Modeling, Machine Learning, Quantitative Reasoning, Communication.
- Say: "the gap list matters more than the number: this is what he should work on for this job."

**e. Contrast: a systems candidate against the same JD.** Start over is not needed:
- `/resume` → **Ananya Rao** (systems-leaning) → **Parse resume** → **Next: build a new profile** (not "Merge into the current profile", which would add her skills to Karthik) → **Save profile**.
- `/match` → choose Ananya and the same Google Data Scientist JD → **Match**.
- **Match score 0.** Every required skill is missing. Same JD, same scoring, completely different answer: the scoring is not a constant.

**f. Talent Check, in one sentence.** `/talent-check` → Karthik → **Google LLC** → **Run Talent Check**: estimated readiness ring, radar of required vs estimated level per skillset, gaps-first table. Say: "levels are estimated from evidence in the documents; the company bars here are placeholder values until we receive RADIX's export."

### 4. One challenge (1 minute), pick one
- **Java is not JavaScript.** Fuzzy matching happily says "Java" ≈ "JavaScript". We match in tiers (exact → alias → near-identical name with a strict similarity threshold) and test the false matches explicitly: Java/JavaScript, C/C++, SQL/NoSQL never match.
- **Turning documents into a defensible 1–10 level.** A skill listed on a resume is a claim; a skill used in an internship is evidence. Talent Check weights evidence over claims and caps claims-only skillsets at level 5.

## Add-on blocks

Use these in order of value until the slot is full.

### A. The evidence story: link skills to experience, then re-run Talent Check (4 minutes)
This is the strongest add-on; it shows why Profile Builder exists.
1. `/profile` → Karthik. Point at **Internships → Data Analytics Intern**: no skills linked, because the resume line ("built two recurring dashboards used by the growth team") names none, and the extractor never guesses.
2. `/talent-check` → Karthik → Google LLC → **Run Talent Check**: readiness **42**; Coding **4**, SQL **5**, AI **4**.
3. Back to `/profile`. On the internship, tick **SQL** and **Python** under "Skills used" (the candidate knows what they used). On **Inter-College Data Visualization Competition**, tick **Python** and **pandas**. **Save profile**.
4. Re-run Talent Check: readiness **45**; Coding **7**, SQL **7**, AI **6**.
5. Say: "the same skills, now backed by experience, are worth more. Readiness only moves 3 points because the placeholder bar is a flat 5 in every skillset and we give no bonus for exceeding a bar; with real company bars the movement would show where it matters."

### B. Second contrasting pair (3 minutes)
- Oracle Financial Services **Application Support Analyst** JD vs **Priya Menon** (entry-level, support-oriented): match **44**, the highest of the four candidates for that JD.
- Same JD vs **Ananya Rao**: **38**. Ask the room why they are close: both cover operating systems, Linux and networking; Priya's edge is SQL and ticketing.

### C. The scoring, walked through (5 minutes)
- **Talent Check, per skillset:** strength = confidence × where the skill appears (internship 1.0, project or hackathon 0.7, certification 0.6, skills list only 0.3); depth and experience combine into a 1–10 level; claims-only skillsets cap at 5.
- Worked example (it is a unit test): Data Structures used in a project, Algorithms used in a hackathon, Dynamic Programming listed → **level 7**. Four strong skills only listed → **level 4**.
- **Skill Matching:** per JD skill, first tier wins: exact name 1.0, alias 1.0, near-identical name 0.8, optional AI judge 0.6. Required skills weigh 1.0, nice-to-haves 0.5.
- Every constant is in one file, `backend/app/scoring/config.py`.

### D. The data contract (3 minutes)
- Open `docs/CONTRACT.md`: Skill, Entry, extracted skill list, profile, Talent Check result, Skill Match result.
- Show `docs/DECISIONS.md`: every change (D10–D16) is logged with the reason.

### E. Failure handling (3 minutes)
- On `/analyze` untick **Use saved extraction** and analyze a JD live (10–25 seconds).
- Explain: if Gemini is overloaded or down, the backend tries the fallback model, then the saved extraction (badge appears), and only then shows a clear error. Uploads that are scanned PDFs or the wrong type get a specific message.
- Optional: upload one of the converted PDFs from `data/samples/` to show PDF support.

### F. Tests and quality (2 minutes)
- 326 backend tests: scoring checks, the Java/JavaScript-style false matches, file handling, API, and live database round trips.
- Show `cd backend && .venv/bin/pytest -q` finishing in under 15 seconds.

### G. Limits, said plainly (2 minutes)
Read the "Limits" list in the README. In short: estimates from documents, not verified proficiency; placeholder company data; extraction quality drives everything; live runs vary; some synonyms were added after looking at the samples.

## Timing plans

| Slot | Plan |
|---|---|
| 5–8 min (milestone checklist) | Core only |
| 29 Oct peer round: 30 min + 15 min Q&A | Core (8) + A (4) + B (3) + C (5) + E (3) + G (2) = 25 min, buffer 5 |
| 30 Oct expert panel: 45 min | Core (8) + A + B + C + D + E + F + G (22) = 30 min, then ~15 min questions |

## If something goes wrong

| Problem | Do this |
|---|---|
| Page shows "Cannot reach the backend" | Start the backend; refresh. The flow state survives the refresh. |
| `/api/health` shows `db_status` not `"ok"` | Check `backend/.env`; the demo cannot save profiles without the database. |
| A live extraction is slow or fails | Tick **Use saved extraction** again; it needs no LLM. |
| Numbers differ from this script | Someone ran live. Re-run with **Use saved extraction** ticked. |
| Wrong profile pre-selected | Pick it from the dropdown, or press **Start over** and repeat from the JD. |
