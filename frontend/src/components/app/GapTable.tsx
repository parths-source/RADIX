import { AlertTriangle, Check } from "lucide-react"

import { CATEGORIES } from "@/lib/categories"
import type { EvidenceStatus, SkillsetGap } from "@/types/contract"

const EVIDENCE: Record<EvidenceStatus, { text: string; hint: string }> = {
  evidenced: { text: "Estimated", hint: "Backed by projects, internships, hackathons or certifications" },
  claimed_only: { text: "Claimed only", hint: "Only in the skills list, so the level is capped at 5" },
  none: { text: "None", hint: "No skills in this skillset" },
}

/** Per-skillset table; gaps first so the most important rows are on top. */
export function GapTable({ gaps }: { gaps: SkillsetGap[] }) {
  const rows = [...gaps].sort((a, b) => Number(b.gap) - Number(a.gap) || (b.required_level - b.candidate_level) - (a.required_level - a.candidate_level))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="sr-only">Required and estimated level for each of the 12 skillsets</caption>
        <thead className="text-xs text-mist/60 uppercase">
          <tr className="border-b border-white/10">
            <th scope="col" className="py-2 pr-3 font-medium">Skillset</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Required</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Estimated</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="py-2 pl-3 font-medium">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => {
            const evidence = EVIDENCE[g.evidence_status ?? "evidenced"]
            return (
              <tr key={g.category_code} className={`border-b border-white/5 ${g.gap ? "bg-warn/5" : ""}`}>
                <th scope="row" className="py-2 pr-3 font-medium text-mist">{CATEGORIES.find((c) => c.code === g.category_code)?.label}</th>
                <td className="px-3 py-2 text-right tabular-nums text-mist/80">{g.required_level}</td>
                <td className="px-3 py-2 text-right tabular-nums text-mist">{g.candidate_level}</td>
                <td className="px-3 py-2">
                  {g.gap ? (
                    <span className="inline-flex items-center gap-1.5 text-warn"><AlertTriangle className="size-3.5" aria-hidden /> Gap of {g.required_level - g.candidate_level}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-mist/70"><Check className="size-3.5 text-cyan" aria-hidden /> Meets the bar</span>
                  )}
                </td>
                <td className="py-2 pl-3 text-mist/70" title={evidence.hint}>{evidence.text}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
