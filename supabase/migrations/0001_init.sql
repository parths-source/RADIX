-- RADIX Talent Match: initial schema (PLAN.md section 9, decision D3).
-- RLS is enabled on every table with NO policies: the anon key can read/write
-- nothing; the backend uses the service-role key, which bypasses RLS.

create table extractions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  source_type text not null check (source_type in ('jd', 'resume')),
  source_file text not null,
  file_path   text,
  company     text,
  role        text,
  skills      jsonb not null default '[]',
  details     jsonb,
  status      text not null default 'ok' check (status in ('ok', 'fallback', 'llm_failed'))
);

create table candidate_profiles (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz default now(),
  name                 text not null,
  email                text unique,
  education            text,
  skills               jsonb not null default '[]',
  hackathons           jsonb default '[]',
  internships          jsonb default '[]',
  certifications       jsonb default '[]',
  projects             jsonb default '[]',
  preferred_roles      jsonb default '[]',
  cv_file              text,
  source_extraction_id uuid references extractions(id) on delete set null,
  updated_at           timestamptz default now()
);

create table talent_check_results (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  profile_id      uuid not null references candidate_profiles(id) on delete cascade,
  company         text not null,
  skillset_gap    jsonb not null,
  readiness_score int not null check (readiness_score between 0 and 100),
  scoring_version text not null
);

create table skill_match_results (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz default now(),
  profile_id       uuid not null references candidate_profiles(id) on delete cascade,
  jd_extraction_id uuid not null references extractions(id) on delete cascade,
  jd_source_file   text not null,
  match_score      int not null check (match_score between 0 and 100),
  matched_skills   jsonb not null default '[]',
  missing_skills   jsonb not null default '[]',
  scoring_version  text not null
);

-- candidate_profiles(email) is already indexed by its unique constraint.
create index talent_check_results_profile_id_idx on talent_check_results (profile_id);
create index skill_match_results_profile_id_idx on skill_match_results (profile_id);
create index skill_match_results_jd_extraction_id_idx on skill_match_results (jd_extraction_id);

alter table extractions          enable row level security;
alter table candidate_profiles   enable row level security;
alter table talent_check_results enable row level security;
alter table skill_match_results  enable row level security;

-- Private bucket for uploaded JDs, resumes and CVs: {jd|resume|cv}/{uuid}/{sanitized_filename}
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;
