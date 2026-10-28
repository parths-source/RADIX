import { AlertTriangle, Info } from "lucide-react"

import type { CompaniesResponse } from "@/types/contract"

/** Says where the company bars come from: the derived file (D20) or the placeholder. Nothing for a real export. */
export function CompanyDataNote({ data }: { data: CompaniesResponse }) {
  if (data.dummy) return <DummyBanner />
  if (data.method !== "derived_from_jds") return null
  return (
    <div role="note" className="flex gap-3 rounded-2xl border border-accent/30 bg-tint p-4 text-sm text-ink">
      <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      <p>
        <strong className="text-accent">Company bars derived from the sample JDs.</strong> Each company's required level per skillset comes from
        the skills its two job descriptions ask for, not from RADIX's hiring data.
        {data.note && <span className="mt-1 block text-xs text-ink-muted">{data.note}</span>}
      </p>
    </div>
  )
}

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
