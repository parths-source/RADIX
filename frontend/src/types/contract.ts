// Shared data contract v0.1: TypeScript mirror of backend/app/models/contract.py
// (PLAN.md section 6, docs/CONTRACT.md). Fields marked (+) are the approved
// optional additions (D5). Keep both files in step; never change one alone.

export const SKILLSET_CODES = [
  "COD", "DSA", "OOD", "APTI", "COMM", "AI", "CLOUD", "SQL", "SWE", "SYSD", "NETW", "OS",
] as const

export type SkillsetCode = (typeof SKILLSET_CODES)[number]
export type CategoryCode = SkillsetCode | "OTHER"

export type Confidence = "high" | "medium" | "low"
export type RequirementType = "required" | "preferred"
export type SourceType = "jd" | "resume"
export type ExtractionStatus = "ok" | "fallback" | "llm_failed"
export type MatchType = "exact" | "alias" | "fuzzy" | "llm"
export type EvidenceStatus = "none" | "claimed_only" | "evidenced"

export interface Skill {
  skill_name: string
  category_code: CategoryCode
  evidence: string
  confidence: Confidence
  requirement_type?: RequirementType | null // (+) JD skills only; absent means required
}

// (+) A hackathon, internship, project or certification.
export interface Entry {
  title: string
  description?: string
  skills_used?: string[] // (+) names must exist in the profile's skills list
  duration_months?: number | null // (+)
}

export interface ResumeDetails {
  education: string
  projects: Entry[]
  experience: Entry[]
}

export interface ExtractedSkillList {
  id?: string | null // assigned on save
  source_type: SourceType
  source_file: string
  company?: string | null // JD only
  role?: string | null // JD only
  skills: Skill[]
  details?: ResumeDetails | null // (+) resume only
  status?: ExtractionStatus // (+)
}

export interface CandidateProfile {
  id?: string | null
  name: string
  email?: string | null
  education?: string
  skills: Skill[]
  hackathons: Entry[]
  internships: Entry[]
  certifications: Entry[]
  projects?: Entry[] // (+)
  preferred_roles: string[]
  cv_file?: string | null
}

export interface SkillsetGap {
  category_code: CategoryCode
  required_level: number // 1–10
  candidate_level: number // 1–10
  gap: boolean
  evidence_status?: EvidenceStatus | null // (+)
}

export interface TalentCheckResult {
  company: string
  skillset_gap: SkillsetGap[]
  readiness_score: number // 0–100
  scoring_version?: string | null // (+)
}

export interface MatchedSkill {
  jd_skill: string
  candidate_skill: string
  category_code: CategoryCode
  match_type: MatchType
  evidence: string
}

export interface MissingSkill {
  skill_name: string
  category_code: CategoryCode
  reason: string
  requirement_type?: RequirementType | null
}

export interface SkillMatchResult {
  jd_source_file: string
  match_score: number // 0–100
  matched_skills: MatchedSkill[]
  missing_skills: MissingSkill[]
  scoring_version?: string | null // (+)
}

// API envelopes that are not part of the module contract.
export interface CompaniesResponse {
  dummy: boolean // true -> show the "Placeholder company data" banner
  companies: { company_key: string; display_name: string }[]
}

export interface ApiError {
  error: { code: string; message: string; details: Record<string, unknown> }
}
