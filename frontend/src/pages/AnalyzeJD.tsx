import { AppShell, FallbackBadge, PageHeading } from "@/components/app/AppShell"
import { SkillChips, SkillLegend } from "@/components/app/SkillChips"
import { SourcePicker } from "@/components/app/SourcePicker"
import { EmptyState, ErrorPanel, LoadingSkeleton, Panel } from "@/components/app/StateViews"
import { useExtraction } from "@/lib/useExtraction"

export default function AnalyzeJD() {
  const { state, run } = useExtraction("jd")
  const busy = state.status === "loading"

  return (
    <AppShell>
      <PageHeading
        title="Analyze a job description"
        description="Pick a sample JD or upload one. RADIX extracts the skills it asks for, sorted into the 12 skillsets, and marks which are required and which are nice to have."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <SourcePicker sourceType="jd" actionLabel="Analyze JD" busy={busy} onRun={run} />
        <div aria-live="polite">
          {state.status === "idle" && <EmptyState>Choose a JD on the left and press “Analyze JD” to see its skills here.</EmptyState>}
          {state.status === "loading" && <LoadingSkeleton label={`Analyzing ${state.name}… this takes 5–20 seconds.`} />}
          {state.status === "error" && <ErrorPanel title={`Could not analyze ${state.name}`} message={state.message} />}
          {state.status === "done" && (
            <Panel className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-mist/60">{state.result.company ?? "Company not found in the JD"}</p>
                  <h2 className="text-xl font-semibold">{state.result.role ?? state.result.source_file}</h2>
                </div>
                {state.result.status === "fallback" && <FallbackBadge />}
              </div>
              <Counts skills={state.result.skills} />
              {state.result.skills.length === 0 ? (
                <EmptyState>No skills were found in this JD. Check that the file is a job description.</EmptyState>
              ) : (
                <>
                  <SkillChips skills={state.result.skills} showRequirement />
                  <SkillLegend showRequirement />
                </>
              )}
            </Panel>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function Counts({ skills }: { skills: { requirement_type?: string | null }[] }) {
  const preferred = skills.filter((s) => s.requirement_type === "preferred").length
  return (
    <p className="text-sm text-mist/70">
      <strong className="text-mist">{skills.length - preferred}</strong> required · <strong className="text-mist">{preferred}</strong> nice to have
    </p>
  )
}
