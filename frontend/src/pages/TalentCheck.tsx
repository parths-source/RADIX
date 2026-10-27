import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"

import { AppShell, NextStep, PageHeading } from "@/components/app/AppShell"
import { DummyBanner } from "@/components/app/DummyBanner"
import { GapRadar } from "@/components/app/GapRadar"
import { GapTable } from "@/components/app/GapTable"
import { ScoreRing } from "@/components/app/ScoreRing"
import { EmptyState, ErrorPanel, LoadingSkeleton, Panel } from "@/components/app/StateViews"
import { inputClass } from "@/components/profile/fields"
import { Button } from "@/components/ui/button"
import { api, ApiError, type ProfileSummary } from "@/lib/api"
import { useFlow } from "@/lib/flowState"
import type { CompaniesResponse, TalentCheckResult } from "@/types/contract"

type Run = { status: "idle" } | { status: "loading" } | { status: "done"; result: TalentCheckResult } | { status: "error"; message: string }

export default function TalentCheck() {
  const [params, setParams] = useSearchParams()
  const [profiles, setProfiles] = useState<ProfileSummary[] | null>(null)
  const [companies, setCompanies] = useState<CompaniesResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { flow, update } = useFlow()
  const [run, setRun] = useState<Run>({ status: "idle" })
  const profileId = params.get("id") ?? flow.profileId ?? profiles?.[0]?.id ?? ""
  const companyKey = flow.companyKey ?? ""

  useEffect(() => {
    Promise.all([api.profiles(), api.companies()]).then(
      ([p, c]) => {
        setProfiles(p)
        setCompanies(c)
      },
      (e) => setLoadError(e instanceof ApiError ? e.message : "Could not load profiles and companies."),
    )
  }, [])

  async function runCheck() {
    setRun({ status: "loading" })
    try {
      setRun({ status: "done", result: await api.talentCheck(profileId, companyKey) })
      update({ profileId, talentCheckDone: true })
    } catch (e) {
      setRun({ status: "error", message: e instanceof ApiError ? e.message : "Unexpected error. Check the backend logs." })
    }
  }

  const gaps = run.status === "done" ? run.result.skillset_gap.filter((g) => g.gap).length : 0

  return (
    <AppShell>
      <PageHeading
        title="Talent Check"
        description="See how a saved profile stacks up against a company's bar across all 12 skillsets. Levels are estimated from the evidence in the profile, not verified proficiency."
      />
      {loadError && <ErrorPanel title="Could not load the page" message={loadError} />}
      {companies?.dummy && <div className="mb-6"><DummyBanner /></div>}

      {profiles && profiles.length === 0 ? (
        <EmptyState>
          No saved profiles yet. <Link to="/resume" className="text-cyan underline">Parse a resume</Link> and save a profile first.
        </EmptyState>
      ) : (
        <Panel className="mb-6">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label htmlFor="tc-profile" className="mb-1.5 block text-sm font-medium">Profile</label>
              <select id="tc-profile" className={inputClass} value={profileId} disabled={!profiles} onChange={(e) => { setParams({ id: e.target.value }); update({ profileId: e.target.value, talentCheckDone: false, skillMatchDone: false }); setRun({ status: "idle" }) }}>
                {!profiles && <option>Loading…</option>}
                {profiles?.map((p) => <option key={p.id} value={p.id}>{p.name}{p.email ? ` (${p.email})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="tc-company" className="mb-1.5 block text-sm font-medium">Company</label>
              <select id="tc-company" className={inputClass} value={companyKey} disabled={!companies} onChange={(e) => { update({ companyKey: e.target.value || undefined }); setRun({ status: "idle" }) }}>
                <option value="">{companies ? "Choose a company…" : "Loading…"}</option>
                {companies?.companies.map((c) => <option key={c.company_key} value={c.company_key}>{c.display_name}</option>)}
              </select>
            </div>
            <Button onClick={runCheck} disabled={!profileId || !companyKey || run.status === "loading"} className="bg-brand text-white hover:bg-brand/90">
              {run.status === "loading" ? "Running…" : "Run Talent Check"}
            </Button>
          </div>
        </Panel>
      )}

      <div aria-live="polite">
        {run.status === "idle" && profiles && profiles.length > 0 && <EmptyState>Choose a company and press “Run Talent Check”.</EmptyState>}
        {run.status === "loading" && <LoadingSkeleton label="Running Talent Check…" />}
        {run.status === "error" && <ErrorPanel title="Talent Check failed" message={run.message} />}
        {run.status === "done" && (
          <div className="space-y-6">
            <Panel>
              <div className="grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
                <div className="flex flex-col items-center gap-3">
                  <ScoreRing score={run.result.readiness_score} label="Estimated readiness" caption={run.result.company} />
                  <p className="text-sm text-mist/70">{gaps === 0 ? "Meets the bar in every skillset" : `${gaps} of 12 skillsets below the bar`}</p>
                </div>
                <GapRadar gaps={run.result.skillset_gap} />
              </div>
            </Panel>
            <Panel>
              <h2 className="mb-3 text-lg font-semibold">Skillset gaps</h2>
              <GapTable gaps={run.result.skillset_gap} />
              <p className="mt-3 text-xs text-mist/50">
                Scoring {run.result.scoring_version}. Estimated levels depend on extraction quality and cannot tell a deep project from a small one.
              </p>
            </Panel>
            <NextStep to="/match" label="Next: Skill Match" />
          </div>
        )}
      </div>
    </AppShell>
  )
}
