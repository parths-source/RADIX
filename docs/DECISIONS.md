# Decision log

Seeded from PLAN.md section 2. Add a row for every approved change (including any change to the v0.1 data contract) with the date.

| # | Decision | Status |
|---|---|---|
| D1 | Backend framework: FastAPI | Approved |
| D2 | No authentication in the MVP. Backend is the only thing that talks to Supabase | Approved |
| D3 | Four tables: `extractions`, `candidate_profiles`, `talent_check_results`, `skill_match_results` | Approved (provisional) |
| D4 | Company expectations: local JSON file, exported once from the organizers' `staging_company_skill_levels` table (Option 2). No company table in our DB for the MVP | Approved |
| D5 | Contract additions (all optional fields) approved, see PLAN.md section 6 | Approved |
| D6 | Candidate-level formula v0.1 with experience as a criterion (PLAN.md section 7) | Treated as approved for the MVP; constants are tunable in config |
| D7 | Skill Matching score v0.1 (PLAN.md section 8) | **[Proposal] — not yet discussed with the user. Flag it in the Phase 6 summary** |
| D8 | UI: hero uses the supplied WebGL shader as background and orbiting tech logos (PLAN.md section 11) | Approved |
| D9 | Demo runs locally (localhost), not from a deployed URL | [Proposal] |
| D10 | Contract change (2026-10-28, option A): `Entry` gains optional `kind` (`hackathon` \| `internship`), set on resume `details.experience` entries. If `kind` is missing, Talent Check scores the entry at the hackathon tier. Reason: resume extraction merges the samples' combined "Hackathons / Internships" section into one list, and Talent Check scores the two differently | Approved |
