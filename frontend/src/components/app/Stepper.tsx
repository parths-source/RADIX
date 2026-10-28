import { Check } from "lucide-react"
import { NavLink } from "react-router"

import { useFlow, type Flow } from "@/lib/flowState"

const STEPS: { to: string; label: string; done: (f: Flow) => boolean }[] = [
  { to: "/analyze", label: "Analyze JD", done: (f) => !!f.jdExtractionId },
  { to: "/resume", label: "Parse resume", done: (f) => !!f.resumeExtractionId },
  { to: "/profile", label: "Build profile", done: (f) => !!f.profileId },
  { to: "/talent-check", label: "Talent Check", done: (f) => !!f.talentCheckDone },
  { to: "/match", label: "Skill Match", done: (f) => !!f.skillMatchDone },
]

/** The five modules in flow order, each marked done or not started; the current page is highlighted. */
export function Stepper() {
  const { flow } = useFlow()
  return (
    <nav aria-label="Steps">
      <ol className="flex flex-wrap gap-1">
        {STEPS.map((step, i) => {
          const done = step.done(flow)
          return (
            <li key={step.to}>
              <NavLink
                to={step.to}
                aria-label={`${step.label}${done ? " (done)" : " (not started)"}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none ${
                    isActive ? "bg-brand text-white" : "text-mist/75 hover:bg-white/10"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                        done ? "bg-cyan text-abyss" : isActive ? "bg-white/25 text-white" : "border border-white/25"
                      }`}
                      aria-hidden
                    >
                      {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                    </span>
                    {/* On phones only the current step shows its label; the others keep it in aria-label. */}
                    <span className={isActive ? undefined : "hidden sm:inline"}>{step.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
