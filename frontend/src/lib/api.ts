import type {
  ApiError as ApiErrorBody,
  CandidateProfile,
  CompaniesResponse,
  ExtractedSkillList,
  SkillMatchResult,
  SourceType,
  TalentCheckResult,
} from "@/types/contract"

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000/api"

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch {
    throw new ApiError(0, "network_error", `Cannot reach the backend at ${BASE_URL}. Start it with "cd backend && .venv/bin/uvicorn app.main:app --reload".`)
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error
    throw new ApiError(response.status, error?.code ?? `http_${response.status}`, error?.message ?? `Request failed with status ${response.status}.`)
  }
  return body as T
}

export interface Sample {
  sample_id: string
  source_type: SourceType
  file_name: string
  label: string
  format: "docx" | "pdf"
  converted: boolean
}

export interface ExtractionSummary {
  id: string
  source_file: string
  company: string | null
  role: string | null
  status: string
  created_at?: string
}

export interface ProfileSummary {
  id: string
  name: string
  email: string | null
  updated_at: string
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

export const api = {
  samples: () => request<{ samples: Sample[] }>("/samples").then((r) => r.samples),
  companies: () => request<CompaniesResponse>("/companies"),
  /** mode "saved" serves the saved extraction of the sample (no LLM call); "live" runs Gemini. */
  extractSample: (kind: SourceType, sampleId: string, mode: "saved" | "live") =>
    request<ExtractedSkillList>(`/extractions/${kind}`, json("POST", { sample_id: sampleId, mode })),
  extractFile: (kind: SourceType, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return request<ExtractedSkillList>(`/extractions/${kind}`, { method: "POST", body: form })
  },
  extraction: (id: string) => request<ExtractedSkillList>(`/extractions/${id}`),

  profiles: () => request<{ profiles: ProfileSummary[] }>("/profiles").then((r) => r.profiles),
  profile: (id: string) => request<CandidateProfile>(`/profiles/${id}`),
  /** Pre-filled draft from a resume extraction; with baseProfileId, merged into that saved profile. Not saved. */
  profileDraft: (resumeExtractionId: string, baseProfileId?: string) =>
    request<CandidateProfile>("/profiles/draft", json("POST", { resume_extraction_id: resumeExtractionId, base_profile_id: baseProfileId ?? null })),
  createProfile: (profile: CandidateProfile, sourceExtractionId?: string) =>
    request<CandidateProfile>(
      `/profiles${sourceExtractionId ? `?source_extraction_id=${encodeURIComponent(sourceExtractionId)}` : ""}`,
      json("POST", profile),
    ),
  updateProfile: (id: string, profile: CandidateProfile) => request<CandidateProfile>(`/profiles/${id}`, json("PUT", profile)),
  extractions: (sourceType: SourceType) =>
    request<{ extractions: ExtractionSummary[] }>(`/extractions?source_type=${sourceType}`).then((r) => r.extractions),
  skillMatch: (profileId: string, jdExtractionId: string) =>
    request<SkillMatchResult>(`/profiles/${profileId}/skill-match`, json("POST", { jd_extraction_id: jdExtractionId })),
  talentCheck: (profileId: string, companyKey: string) =>
    request<TalentCheckResult>(`/profiles/${profileId}/talent-check`, json("POST", { company_key: companyKey })),
  uploadCv: (file: File) => {
    const form = new FormData()
    form.append("file", file)
    return request<{ cv_file: string }>("/profiles/cv", { method: "POST", body: form })
  },
}
