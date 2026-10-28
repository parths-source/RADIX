import { useState } from "react"

import { CATEGORIES } from "@/lib/categories"
import type { Confidence, Skill } from "@/types/contract"

const CONFIDENCE_DOTS: Record<Confidence, number> = { high: 3, medium: 2, low: 1 }

function ConfidenceDots({ confidence }: { confidence: Confidence }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`size-1.5 rounded-full ${i <= CONFIDENCE_DOTS[confidence] ? "bg-accent" : "bg-line-strong"}`} />
      ))}
    </span>
  )
}

/** Skills grouped by category. Click a chip to show its evidence; preferred JD skills get a dashed outline. */
export function SkillChips({ skills, showRequirement = false }: { skills: Skill[]; showRequirement?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  const groups = CATEGORIES.map((c) => ({ ...c, skills: skills.filter((s) => s.category_code === c.code) })).filter(
    (g) => g.skills.length > 0,
  )

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.code}>
          <h3 className="mb-2 text-xs font-medium tracking-wider text-accent uppercase">
            {group.label} <span className="text-ink-muted">· {group.skills.length}</span>
          </h3>
          <ul className="flex flex-wrap gap-2">
            {group.skills.map((skill) => {
              const key = `${group.code}:${skill.skill_name}`
              const preferred = showRequirement && skill.requirement_type === "preferred"
              const expanded = open === key
              return (
                <li key={key} className={expanded ? "basis-full" : undefined}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    title={skill.evidence}
                    onClick={() => setOpen(expanded ? null : key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-ink transition-colors hover:bg-tint focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                      preferred ? "border-dashed border-line-strong" : "border-accent/30 bg-tint"
                    }`}
                  >
                    {skill.skill_name}
                    <ConfidenceDots confidence={skill.confidence} />
                    <span className="sr-only">
                      , {skill.confidence} confidence{preferred ? ", nice to have" : ""}
                    </span>
                  </button>
                  {expanded && (
                    <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-sm text-ink-soft">
                      <span className="text-ink-muted">Evidence: </span>“{skill.evidence || "none given"}”
                      <span className="text-ink-muted"> · {skill.confidence} confidence</span>
                      {showRequirement && <span className="text-ink-muted"> · {skill.requirement_type ?? "required"}</span>}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function SkillLegend({ showRequirement = false }: { showRequirement?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
      <span className="flex items-center gap-2"><ConfidenceDots confidence="high" /> confidence: high, medium, low</span>
      {showRequirement && (
        <>
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-full border border-accent/30 bg-tint" /> required</span>
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-full border border-dashed border-line-strong" /> nice to have</span>
        </>
      )}
      <span>Click a skill to see the evidence.</span>
    </div>
  )
}
