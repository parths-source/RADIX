import { useEffect, useState } from "react"

import { FileDrop } from "@/components/app/FileDrop"
import { Panel } from "@/components/app/StateViews"
import { Button } from "@/components/ui/button"
import { api, type Sample } from "@/lib/api"
import type { SourceType } from "@/types/contract"

export type Source = { kind: "sample"; sample: Sample; mode: "saved" | "live" } | { kind: "file"; file: File }

/** Pick a sample from the pack (DOCX by default) or upload a file, then run the action. */
export function SourcePicker({
  sourceType,
  actionLabel,
  busy,
  onRun,
}: {
  sourceType: SourceType
  actionLabel: string
  busy: boolean
  onRun: (source: Source) => void
}) {
  const [samples, setSamples] = useState<Sample[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState("")
  const [showPdf, setShowPdf] = useState(false)
  const [useSaved, setUseSaved] = useState(true) // demo default: no LLM call, always the same result

  useEffect(() => {
    api.samples().then(
      (all) => setSamples(all.filter((s) => s.source_type === sourceType)),
      (e: Error) => setLoadError(e.message),
    )
  }, [sourceType])

  const visible = (samples ?? []).filter((s) => (showPdf ? s.format === "pdf" : s.format === "docx"))
  const chosen = visible.find((s) => s.sample_id === selected)

  return (
    <Panel className="space-y-4">
      <div>
        <label htmlFor={`${sourceType}-sample`} className="mb-2 block text-sm font-medium text-ink">
          Sample {sourceType === "jd" ? "job description" : "resume"}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id={`${sourceType}-sample`}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={busy || !samples}
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <option value="">{samples ? "Choose a sample…" : "Loading samples…"}</option>
            {visible.map((s) => (
              <option key={s.sample_id} value={s.sample_id}>
                {s.label}
              </option>
            ))}
          </select>
          <Button disabled={busy || !chosen} onClick={() => chosen && onRun({ kind: "sample", sample: chosen, mode: useSaved ? "saved" : "live" })} className="bg-accent text-white hover:bg-accent/90">
            {actionLabel}
          </Button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={showPdf}
            onChange={(e) => {
              setShowPdf(e.target.checked)
              setSelected("")
            }}
          />
          Use the PDF version (converted from the DOCX, text only)
        </label>
        <label className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" checked={useSaved} onChange={(e) => setUseSaved(e.target.checked)} />
          Use saved extraction (recommended for demos). Untick to run the AI live, which takes 10–25 seconds and can vary.
        </label>
        {loadError && <p className="mt-2 text-sm text-danger-ink" role="alert">{loadError}</p>}
      </div>
      <div className="flex items-center gap-3 text-xs text-ink-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />or upload your own<span className="h-px flex-1 bg-line" />
      </div>
      <FileDrop disabled={busy} onFile={(file) => onRun({ kind: "file", file })} />
    </Panel>
  )
}
