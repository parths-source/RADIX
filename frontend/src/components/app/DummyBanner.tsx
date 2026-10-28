import { AlertTriangle } from "lucide-react"

/** Shown whenever company expectations come from the placeholder file, never real RADIX data. */
export function DummyBanner() {
  return (
    <div role="note" className="flex gap-3 rounded-2xl border border-warn/50 bg-warn/10 p-4 text-sm text-ink">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden />
      <p>
        <strong className="text-warn-ink">Placeholder company data.</strong> Required levels are one flat dummy value for every company and skillset, not RADIX data.
        Readiness scores here are for demonstrating the method only.
      </p>
    </div>
  )
}
