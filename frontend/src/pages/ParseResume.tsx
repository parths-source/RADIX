import { Link } from "react-router"

import { AppShell, FallbackBadge, NextStep, PageHeading } from "@/components/app/AppShell"
import { SkillChips, SkillLegend } from "@/components/app/SkillChips"
import { SourcePicker } from "@/components/app/SourcePicker"
import { EmptyState, ErrorPanel, LoadingState, Panel } from "@/components/app/StateViews"
import { useFlow } from "@/lib/flowState"
import { useExtraction } from "@/lib/useExtraction"
import type { Entry } from "@/types/contract"

export default function ParseResume() {
  const { flow, update } = useFlow()
  const { state, run } = useExtraction("resume", flow.resumeExtractionId, (r) => update({ resumeExtractionId: r.id ?? undefined }))
  const busy = state.status === "loading"

  return (
    <AppShell>
      <PageHeading
        title="Parse a resume"
        description="Pick a sample resume or upload one. RADIX extracts the skills it shows, plus education, projects, hackathons and internships, ready to build a profile."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <SourcePicker sourceType="resume" actionLabel="Parse resume" busy={busy} onRun={run} />
        <div aria-live="polite" className="space-y-6">
          {state.status === "idle" && <EmptyState>Choose a resume on the left and press “Parse resume” to see what it shows.</EmptyState>}
          {state.status === "loading" && <LoadingState label={state.restoring ? "Loading the last result…" : `Parsing ${state.name}… live runs take 10–25 seconds.`} />}
          {state.status === "error" && <ErrorPanel title={`Could not parse ${state.name}`} message={state.message} />}
          {state.status === "done" && (
            <>
              <Panel className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink-muted">{state.result.source_file}</p>
                    <h2 className="text-xl font-semibold">
                      {state.result.details?.name ?? "Candidate"} · {state.result.skills.length} skills found
                    </h2>
                    {state.result.details?.email && <p className="text-sm text-ink-muted">{state.result.details.email}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {state.result.status === "fallback" && <FallbackBadge />}
                    {state.result.id && (
                      <Link
                        to={`/profile?from=${state.result.id}`}
                        className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                      >
                        {flow.profileId ? "Build a new profile from this resume" : "Build profile from this resume"}
                      </Link>
                    )}
                  </div>
                </div>
                {state.result.skills.length === 0 ? (
                  <EmptyState>No skills were found. Check that the file is a resume with selectable text.</EmptyState>
                ) : (
                  <>
                    <SkillChips skills={state.result.skills} />
                    <SkillLegend />
                  </>
                )}
              </Panel>
              {state.result.details && (
                <Panel className="space-y-6">
                  <Section title="Education">
                    <p className="text-sm text-ink-soft">{state.result.details.education || "Not found in the resume."}</p>
                  </Section>
                  <Section title="Projects">
                    <Entries entries={state.result.details.projects} empty="No projects found." />
                  </Section>
                  <Section title="Hackathons and internships">
                    <Entries entries={state.result.details.experience} empty="No hackathons or internships found." />
                  </Section>
                  <Section title="Certifications">
                    <Entries entries={state.result.details.certifications ?? []} empty="No certifications found." />
                  </Section>
                  <Section title="Preferred roles">
                    <p className="text-sm text-ink-soft">{state.result.details.preferred_roles?.join(", ") || "None listed."}</p>
                  </Section>
                </Panel>
              )}
              {state.result.id && (
                <div className="flex flex-wrap justify-end gap-3">
                  {flow.profileId && (
                    <Link
                      to={`/profile?id=${flow.profileId}&from=${state.result.id}`}
                      className="mt-6 inline-flex items-center rounded-full border border-line-strong px-5 py-2 text-sm text-ink hover:bg-tint focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                    >
                      Merge into the current profile
                    </Link>
                  )}
                  <NextStep to={`/profile?from=${state.result.id}`} label={flow.profileId ? "Next: build a new profile" : "Next: build the profile"} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium tracking-wider text-accent uppercase">{title}</h3>
      {children}
    </div>
  )
}

function Entries({ entries, empty }: { entries: Entry[]; empty: string }) {
  if (entries.length === 0) return <p className="text-sm text-ink-muted">{empty}</p>
  return (
    <ul className="space-y-3">
      {entries.map((entry, i) => (
        <li key={`${entry.title}-${i}`} className="rounded-xl border border-line bg-paper p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{entry.title}</span>
            {entry.kind && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">{entry.kind === "internship" ? "Internship" : "Hackathon"}</span>
            )}
            {entry.duration_months != null && <span className="text-xs text-ink-muted">{entry.duration_months} months</span>}
          </div>
          {entry.description && <p className="mt-1 text-sm text-ink-soft">{entry.description}</p>}
          {entry.skills_used && entry.skills_used.length > 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              Skills used: <span className="text-ink-soft">{entry.skills_used.join(", ")}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
