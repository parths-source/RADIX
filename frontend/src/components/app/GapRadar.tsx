import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts"

import { CATEGORIES } from "@/lib/categories"
import type { SkillsetGap } from "@/types/contract"

const label = (code: string) => CATEGORIES.find((c) => c.code === code)?.label ?? code

const SHORT: Record<string, string> = {
  DSA: "DSA", OOD: "OO Design", SWE: "Software Eng.", SYSD: "System Design", OS: "Op. Systems", APTI: "Aptitude", COMM: "Communication",
}

type Row = { code: string; required: number; candidate: number; gap: boolean }

function RadarTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="rounded-lg border border-white/15 bg-abyss/95 px-3 py-2 text-xs text-mist shadow-lg">
      <p className="mb-1 font-medium">{label(row.code)}</p>
      <p className="flex items-center gap-2">
        <span className="h-0.5 w-4 bg-series-candidate" aria-hidden /> Estimated level <strong className="ml-auto">{row.candidate}</strong>
      </p>
      <p className="flex items-center gap-2">
        <span className="h-0 w-4 border-t-2 border-dashed border-series-required" aria-hidden /> Required <strong className="ml-auto">{row.required}</strong>
      </p>
      {row.gap && <p className="mt-1 text-warn">Gap of {row.required - row.candidate}</p>}
    </div>
  )
}

/** 12 skillsets on one radar: company bar (dashed) vs the candidate's estimated level (filled). */
export function GapRadar({ gaps }: { gaps: SkillsetGap[] }) {
  const data: Row[] = gaps.map((g) => ({ code: g.category_code, required: g.required_level, candidate: g.candidate_level, gap: g.gap }))
  return (
    <figure>
      <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mist/70" aria-hidden>
        <span className="flex items-center gap-2"><span className="h-2.5 w-5 rounded-sm border-2 border-series-candidate bg-series-candidate/30" /> Candidate (estimated)</span>
        <span className="flex items-center gap-2"><span className="h-0 w-5 border-t-2 border-dashed border-series-required" /> Company requirement</span>
      </div>
      <div className="h-80 w-full sm:h-96">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="72%" accessibilityLayer>
            <PolarGrid stroke="rgb(255 255 255 / 0.12)" />
            <PolarAngleAxis dataKey="code" tickFormatter={(c: string) => SHORT[c] ?? label(c)} tick={{ fill: "rgb(234 249 255 / 0.75)", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 10]} tickCount={6} angle={90} tick={{ fill: "rgb(234 249 255 / 0.45)", fontSize: 10 }} axisLine={false} />
            <Radar name="Company requirement" dataKey="required" stroke="var(--color-series-required)" strokeWidth={2} strokeDasharray="5 4" fill="none" isAnimationActive={false} />
            <Radar name="Candidate (estimated)" dataKey="candidate" stroke="var(--color-series-candidate)" strokeWidth={2} fill="var(--color-series-candidate)" fillOpacity={0.3} dot={{ r: 3, fill: "var(--color-series-candidate)", stroke: "var(--color-abyss)", strokeWidth: 2 }} isAnimationActive={false} />
            <Tooltip content={<RadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">Radar chart of the 12 skillsets. The table below lists the same values.</figcaption>
    </figure>
  )
}
