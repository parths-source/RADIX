import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"

import { AppShell, PageHeading } from "@/components/app/AppShell"
import { MatchedList, MissingList } from "@/components/app/MatchLists"
import { ScoreRing } from "@/components/app/ScoreRing"
import { EmptyState, ErrorPanel, LoadingState, Panel } from "@/components/app/StateViews"
import { inputClass } from "@/components/profile/fields"
import { Button } from "@/components/ui/button"
import { api, ApiError, type ExtractionSummary, type ProfileSummary } from "@/lib/api"
import { useFlow } from "@/lib/flowState"
import type { SkillMatchResult } from "@/types/contract"

type Run = { status: "idle" } | { status: "loading" } | { status: "done"; result: SkillMatchResult } | { status: "error"; message: string }

const jdLabel = (e: ExtractionSummary) => [e.company, e.role].filter(Boolean).join(" — ") || e.source_file

export default function SkillMatch() {
  const [params, setParams] = useSearchParams()
  const [profiles, setProfiles] = useState<ProfileSummary[] | null>(null)
  const [jds, setJds] = useState<ExtractionSummary[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [run, setRun] = useState<Run>({ status: "idle" })
  const { flow, update } = useFlow()
  const profileId = params.get("id") ?? flow.profileId ?? profiles?.[0]?.id ?? ""
  const jdId = params.get("jd") ?? flow.jdExtractionId ?? jds?.[0]?.id ?? ""

  useEffect(() => {
    Promise.all([api.profiles(), api.extractions("jd")]).then(
      ([p, j]) => {
        setProfiles(p)
        setJds(j)
      },
      (e) => setLoadError(e instanceof ApiError ? e.message : "Could not load profiles and JDs."),
    )
  }, [])

  function choose(key: "id" | "jd", value: string) {
    setParams({ id: profileId, jd: jdId, [key]: value })
    update(key === "id" ? { profileId: value, talentCheckDone: false, skillMatchDone: false } : { jdExtractionId: value, skillMatchDone: false })
    setRun({ status: "idle" })
  }

  async function runMatch() {
    setRun({ status: "loading" })
    try {
      setRun({ status: "done", result: await api.skillMatch(profileId, jdId) })
      update({ profileId, jdExtractionId: jdId, skillMatchDone: true })
    } catch (e) {
      setRun({ status: "error", message: e instanceof ApiError ? e.message : "Unexpected error. Check the backend logs." })
    }
  }

  const missingRequired = run.status === "done" ? run.result.missing_skills.filter((m) => (m.requirement_type ?? "required") === "required").length : 0
  const nothingToChoose = (profiles && profiles.length === 0) || (jds && jds.length === 0)

  return (
    <AppShell>
      <PageHeading
        title="Skill Match"
        description="See exactly which skills one job posting asks for that the profile does not show yet, and which it already covers."
      />
      {loadError && <ErrorPanel title="Could not load the page" message={loadError} />}

      {nothingToChoose ? (
        <EmptyState>
          {profiles?.length === 0 ? <>No saved profiles yet. <Link to="/resume" className="text-cyan underline">Parse a resume</Link> and save a profile first.</> : null}{" "}
          {jds?.length === 0 ? <>No analyzed JDs yet. <Link to="/analyze" className="text-cyan underline">Analyze a JD</Link> first.</> : null}
        </EmptyState>
      ) : (
        <Panel className="mb-6">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label htmlFor="sm-profile" className="mb-1.5 block text-sm font-medium">Profile</label>
              <select id="sm-profile" className={inputClass} value={profileId} disabled={!profiles} onChange={(e) => choose("id", e.target.value)}>
                {!profiles && <option>Loading…</option>}
                {profiles?.map((p) => <option key={p.id} value={p.id}>{p.name}{p.email ? ` (${p.email})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sm-jd" className="mb-1.5 block text-sm font-medium">Analyzed JD</label>
              <select id="sm-jd" className={inputClass} value={jdId} disabled={!jds} onChange={(e) => choose("jd", e.target.value)}>
                {!jds && <option>Loading…</option>}
                {jds?.map((j) => <option key={j.id} value={j.id}>{jdLabel(j)}{j.status === "fallback" ? " (saved extraction)" : ""}</option>)}
              </select>
            </div>
            <Button onClick={runMatch} disabled={!profileId || !jdId || run.status === "loading"} className="bg-brand text-white hover:bg-brand/90">
              {run.status === "loading" ? "Matching…" : "Match"}
            </Button>
          </div>
        </Panel>
      )}

      <div aria-live="polite">
        {run.status === "idle" && !nothingToChoose && profiles && <EmptyState>Choose a profile and an analyzed JD, then press “Match”.</EmptyState>}
        {run.status === "loading" && <LoadingState label="Matching skills…" />}
        {run.status === "error" && <ErrorPanel title="Match failed" message={run.message} />}
        {run.status === "done" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel className="lg:row-span-2">
              {run.result.llm_judge === "failed" && (
                <p role="note" className="mb-4 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-mist">
                  The AI judge was unavailable, so this is the rule-based score only (exact, alias and similar-name matches).
                </p>
              )}
              <h2 className="text-xl font-semibold">Missing skills</h2>
              <p className="mt-1 mb-4 text-sm text-mist/70">
                {missingRequired > 0 ? `${missingRequired} required skill${missingRequired === 1 ? "" : "s"} not shown in the profile. Close these first.` : "Every required skill is covered."}
              </p>
              <MissingList missing={run.result.missing_skills} />
            </Panel>
            <Panel className="flex justify-center">
              <ScoreRing score={run.result.match_score} label="Match score" caption={`Scoring ${run.result.scoring_version}`} />
            </Panel>
            <Panel>
              <h2 className="mb-2 text-lg font-semibold">Matched · {run.result.matched_skills.length}</h2>
              <MatchedList matched={run.result.matched_skills} />
            </Panel>
          </div>
        )}
      </div>
    </AppShell>
  )
}
