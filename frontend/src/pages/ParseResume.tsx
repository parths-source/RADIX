import { AppShell, FallbackBadge, PageHeading } from "@/components/app/AppShell"
import { SkillChips, SkillLegend } from "@/components/app/SkillChips"
import { SourcePicker } from "@/components/app/SourcePicker"
import { EmptyState, ErrorPanel, LoadingSkeleton, Panel } from "@/components/app/StateViews"
import { useExtraction } from "@/lib/useExtraction"
import type { Entry } from "@/types/contract"

export default function ParseResume() {
  const { state, run } = useExtraction("resume")
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
          {state.status === "loading" && <LoadingSkeleton label={`Parsing ${state.name}… this takes 5–20 seconds.`} />}
          {state.status === "error" && <ErrorPanel title={`Could not parse ${state.name}`} message={state.message} />}
          {state.status === "done" && (
            <>
              <Panel className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-mist/60">{state.result.source_file}</p>
                    <h2 className="text-xl font-semibold">{state.result.skills.length} skills found</h2>
                  </div>
                  {state.result.status === "fallback" && <FallbackBadge />}
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
                    <p className="text-sm text-mist/80">{state.result.details.education || "Not found in the resume."}</p>
                  </Section>
                  <Section title="Projects">
                    <Entries entries={state.result.details.projects} empty="No projects found." />
                  </Section>
                  <Section title="Hackathons and internships">
                    <Entries entries={state.result.details.experience} empty="No hackathons or internships found." />
                  </Section>
                </Panel>
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
      <h3 className="mb-2 text-xs font-medium tracking-wide text-mist/60 uppercase">{title}</h3>
      {children}
    </div>
  )
}

function Entries({ entries, empty }: { entries: Entry[]; empty: string }) {
  if (entries.length === 0) return <p className="text-sm text-mist/60">{empty}</p>
  return (
    <ul className="space-y-3">
      {entries.map((entry, i) => (
        <li key={`${entry.title}-${i}`} className="rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{entry.title}</span>
            {entry.kind && (
              <span className="rounded-full bg-tide/30 px-2 py-0.5 text-xs text-cyan">{entry.kind === "internship" ? "Internship" : "Hackathon"}</span>
            )}
            {entry.duration_months != null && <span className="text-xs text-mist/60">{entry.duration_months} months</span>}
          </div>
          {entry.description && <p className="mt-1 text-sm text-mist/70">{entry.description}</p>}
          {entry.skills_used && entry.skills_used.length > 0 && (
            <p className="mt-2 text-xs text-mist/60">
              Skills used: <span className="text-mist/85">{entry.skills_used.join(", ")}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
