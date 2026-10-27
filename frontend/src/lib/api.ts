import type { ApiError as ApiErrorBody, CompaniesResponse, ExtractedSkillList, SourceType } from "@/types/contract"

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

export const api = {
  samples: () => request<{ samples: Sample[] }>("/samples").then((r) => r.samples),
  companies: () => request<CompaniesResponse>("/companies"),
  extractSample: (kind: SourceType, sampleId: string) =>
    request<ExtractedSkillList>(`/extractions/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sample_id: sampleId }),
    }),
  extractFile: (kind: SourceType, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return request<ExtractedSkillList>(`/extractions/${kind}`, { method: "POST", body: form })
  },
  extraction: (id: string) => request<ExtractedSkillList>(`/extractions/${id}`),
}
