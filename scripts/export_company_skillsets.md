# Company expectations: how to supply the real data

Status: **no export was supplied; the facilitator asked teams to create the file.** The app uses `data/talent_check_company_skillsets.json`, derived from each company's two sample JDs by `scripts/derive_company_skillsets.py` (decision D20): per skillset, `required_level = clamp(2 + round_half_up(weighted), 2, 8)`, where `weighted` counts the distinct skills the company's JDs ask for there (required 1, preferred 0.5). It is labelled "not RADIX hiring data" in the file, the API and the UI. Regenerate it with `cd backend && .venv/bin/python ../scripts/derive_company_skillsets.py --write`. If a real export arrives, write it to the same path in the shape below (it replaces the derived file; delete `method` from `_meta`).

## What to provide

An export of the organizers' `staging_company_skill_levels` table (the brief calls it `talent_check_company_skillsets.json`) for Google LLC, Microsoft Corporation and Oracle Financial Services Software Limited: one required level (integer 1–10) per company for each of the 12 categories `COD, DSA, OOD, APTI, COMM, AI, CLOUD, SQL, SWE, SYSD, NETW, OS`.

## Where it goes

`data/talent_check_company_skillsets.json`, in this shape (see PLAN.md section 9):

```jsonc
{
  "_meta": { "source": "staging_company_skill_levels export", "dummy": false, "exported_at": "YYYY-MM-DD" },
  "companies": [
    { "company_key": "google", "display_name": "Google LLC", "aliases": ["Google", "Google LLC"],
      "skillsets": [ { "category_code": "COD", "required_level": 8 } /* exactly 12 */ ] }
  ]
}
```

When this file exists it replaces the placeholder automatically. The backend refuses to start if it is invalid (missing or duplicate categories, levels outside 1–10, duplicate company keys) and says what is wrong.

## Adapter

The export's column layout is still unknown. When it arrives, a small conversion script will be added here that turns it into the shape above; keep the aliases from the placeholder so JD company names resolve.
