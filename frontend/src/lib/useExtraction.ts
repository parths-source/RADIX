import { useState } from "react"

import type { Source } from "@/components/app/SourcePicker"
import { api, ApiError } from "@/lib/api"
import type { ExtractedSkillList, SourceType } from "@/types/contract"

type State =
  | { status: "idle" }
  | { status: "loading"; name: string }
  | { status: "done"; result: ExtractedSkillList }
  | { status: "error"; name: string; message: string }

export function useExtraction(kind: SourceType) {
  const [state, setState] = useState<State>({ status: "idle" })

  async function run(source: Source) {
    const name = source.kind === "sample" ? source.sample.file_name : source.file.name
    setState({ status: "loading", name })
    try {
      const result =
        source.kind === "sample" ? await api.extractSample(kind, source.sample.sample_id) : await api.extractFile(kind, source.file)
      setState({ status: "done", result })
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Unexpected error. Check the browser console and the backend logs."
      setState({ status: "error", name, message })
    }
  }

  return { state, run }
}
