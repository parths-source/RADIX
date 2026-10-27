# Data contract v0.1

Copied from PLAN.md section 6. **Locked:** any change needs the user's approval and a row in [DECISIONS.md](DECISIONS.md).

**Approved changes since the copy:**
- **D10 (2026-10-28):** `Entry` gains optional `kind` (`"hackathon" | "internship"`). Resume extraction sets it on each `details.experience` entry so Profile Builder can sort them. If `kind` is missing, Talent Check scores the entry at the hackathon tier (0.7), not the internship tier.

Implementation: [backend/app/models/contract.py](../backend/app/models/contract.py) (Pydantic, the source of truth) and [frontend/src/types/contract.ts](../frontend/src/types/contract.ts) (TypeScript mirror). Tests: `backend/tests/test_contract.py`.

How the validation rules are enforced:
- Unknown fields are rejected on every contract object.
- `skill_name`, `title` and `name` are trimmed and must be non-empty.
- `details` is accepted only when `source_type` is `resume`.
- In a candidate profile, every `skills_used` name must match a name in `skills` (case and spacing ignored).
- `email` is optional; a blank string becomes `null`.


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
  "duration_months": 1,              // (+) optional, internships mainly
  "kind": "internship"               // (+) D10: hackathon | internship, set on resume details.experience entries
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
