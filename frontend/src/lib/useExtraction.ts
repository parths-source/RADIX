import { useEffect, useState } from "react"

import type { Source } from "@/components/app/SourcePicker"
import { api, ApiError } from "@/lib/api"
import type { ExtractedSkillList, SourceType } from "@/types/contract"

type State =
  | { status: "idle" }
  | { status: "loading"; name: string; restoring?: boolean }
  | { status: "done"; result: ExtractedSkillList }
  | { status: "error"; name: string; message: string }

/**
 * Runs an extraction. With savedId (from the flow state), the last result is reloaded on mount,
 * so a page refresh keeps it on screen. onDone receives every new result.
 */
export function useExtraction(kind: SourceType, savedId: string | undefined, onDone: (result: ExtractedSkillList) => void) {
  const [state, setState] = useState<State>(() => (savedId ? { status: "loading", name: "the last result", restoring: true } : { status: "idle" }))

  useEffect(() => {
    if (!savedId) return
    let cancelled = false
    api.extraction(savedId).then(
      (result) => !cancelled && setState({ status: "done", result }),
      () => !cancelled && setState({ status: "idle" }), // e.g. the row was deleted; start fresh
    )
    return () => {
      cancelled = true
    }
    // Only on mount: later results arrive through run().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(source: Source) {
    const name = source.kind === "sample" ? source.sample.file_name : source.file.name
    setState({ status: "loading", name })
    try {
      const result =
        source.kind === "sample"
          ? await api.extractSample(kind, source.sample.sample_id, source.mode)
          : await api.extractFile(kind, source.file)
      setState({ status: "done", result })
      onDone(result)
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Unexpected error. Check the browser console and the backend logs."
      setState({ status: "error", name, message })
    }
  }

  return { state, run }
}
