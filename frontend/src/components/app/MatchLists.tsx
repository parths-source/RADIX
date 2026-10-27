import { AlertTriangle, CheckCircle2 } from "lucide-react"

import { CATEGORIES } from "@/lib/categories"
import type { MatchedSkill, MatchType, MissingSkill } from "@/types/contract"

const category = (code: string) => CATEGORIES.find((c) => c.code === code)?.label ?? code

const MATCH_LABEL: Record<MatchType, string> = { exact: "Exact", alias: "Alias", fuzzy: "Similar name", llm: "AI judged" }

/** The gap list: what the candidate is missing, required first. Given the most visual weight on the page. */
export function MissingList({ missing }: { missing: MissingSkill[] }) {
  if (missing.length === 0) {
    return <p className="flex items-center gap-2 text-mist"><CheckCircle2 className="size-5 text-cyan" aria-hidden /> Nothing missing: the profile covers every skill this JD asks for.</p>
  }
  const required = missing.filter((m) => (m.requirement_type ?? "required") === "required")
  const preferred = missing.filter((m) => m.requirement_type === "preferred")
  return (
    <div className="space-y-5">
      {[{ title: "Required", items: required }, { title: "Nice to have", items: preferred }].map(({ title, items }) =>
        items.length === 0 ? null : (
          <div key={title}>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-mist/60 uppercase">{title} · {items.length}</h3>
            <ul className="space-y-2">
              {items.map((m) => (
                <li key={m.skill_name} className={`flex items-start gap-3 rounded-xl border p-3 ${title === "Required" ? "border-warn/40 bg-warn/10" : "border-white/10 bg-white/5"}`}>
                  <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${title === "Required" ? "text-warn" : "text-mist/50"}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-base font-medium text-mist">{m.skill_name}</p>
                    <p className="text-xs text-mist/60">{category(m.category_code)} · {m.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </div>
  )
}

export function MatchedList({ matched }: { matched: MatchedSkill[] }) {
  if (matched.length === 0) return <p className="text-sm text-mist/60">No skills matched.</p>
  return (
    <ul className="divide-y divide-white/5">
      {matched.map((m) => (
        <li key={m.jd_skill} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
          <span className="font-medium text-mist">{m.jd_skill}</span>
          {m.candidate_skill !== m.jd_skill && <span className="text-mist/60">← {m.candidate_skill}</span>}
          <span className="ml-auto rounded-full border border-cyan/30 bg-tide/20 px-2 py-0.5 text-xs text-cyan" title={m.evidence}>
            {MATCH_LABEL[m.match_type]}
          </span>
        </li>
      ))}
    </ul>
  )
}
