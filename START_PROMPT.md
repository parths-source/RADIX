# Paste this into Claude Code (from the repo root)

Read CLAUDE.md and PLAN.md completely before doing anything. Then skim docs/MILESTONES.md.

You are building RADIX Talent Match, a hackathon project (build window closes 28 Oct 2026). PLAN.md is the source of truth for scope, the data contract, scoring, database schema, API, UI and build order. Follow the rules in CLAUDE.md. The hackathon brief PDF in docs/brief/ is the source of truth for requirements; read its pages as images because its text layer is garbled.

The repo already contains the sample JDs and resumes, the logo SVGs, the shader component (kk.tsx) and design references. Use them as they are. Do not recreate or modify them.

Start with Phase 0 only (PLAN.md section 14):
1. Create the repo structure from section 5, keeping the provided files where they are.
2. Copy the decision table from section 2 into docs/DECISIONS.md.
3. Set up the FastAPI backend skeleton with a /health endpoint.
4. Set up the frontend with Vite, React, TypeScript, Tailwind and shadcn (alias @ -> src). kk.tsx must end up importable as "@/components/ui/kk".
5. Create .env.example files and a .gitignore that excludes secrets.
6. Write supabase/migrations/0001_init.sql from section 9, including Row Level Security with no policies.

Missing inputs (tell me what you need, do not invent them): Supabase project URL and service-role key, an LLM provider and key, and the company expectations data (PLAN.md section 3). Continue with everything that does not depend on them.

When Phase 0 is done, run the checks, summarise what you built and anything you skipped, then stop and wait for my approval before Phase 1.

---

# Between phases

Phase N approved. Continue with Phase N+1 from PLAN.md section 14. Same rules: tests alongside, summarise at the end, then stop.

# Phase 2 (hero), add this

Implement the hero exactly as in PLAN.md sections 11.2 to 11.4 using ShaderBackground from kk.tsx and the provided logo files. Verify that the icons orbit, the shader reacts to the pointer, and reduced-motion and mobile behave. Report any contrast problems with the headline over the shader.

# Phase 6 (Skill Matching), add this

Implement the score exactly as in section 8, then tell me clearly that this scoring (D7) was a proposal I have not reviewed yet.
