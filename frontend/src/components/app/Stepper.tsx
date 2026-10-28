import { Check } from "lucide-react"
import { NavLink } from "react-router"

import { useFlow } from "@/lib/flowState"
import { STEPS } from "@/lib/steps"

/** The five modules in flow order, each marked done or not started; the current page is highlighted. */
export function Stepper() {
  const { flow } = useFlow()
  return (
    <nav aria-label="Steps">
      <ol className="flex items-center rounded-full border border-line bg-paper/80 p-1 shadow-[inset_0_1px_2px_rgb(11_26_58/0.06)]">
        {STEPS.map((step, i) => {
          const done = step.done(flow)
          return (
            <li key={step.to} className="flex items-center">
              {/* Connector: fills in blue once the step before it is done. */}
              {i > 0 && (
                <span aria-hidden className={`mx-0.5 h-0.5 w-1.5 rounded-full transition-colors duration-500 sm:w-3.5 ${STEPS[i - 1].done(flow) ? "bg-accent" : "bg-line-strong"}`} />
              )}
              <NavLink
                to={step.to}
                aria-label={`${step.label}${done ? " (done)" : " (not started)"}`}
                className={({ isActive }) =>
                  `group flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium transition duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none motion-reduce:transition-none sm:px-3 ${
                    isActive
                      ? "bg-gradient-to-r from-[#4338ca] via-accent to-sky text-white shadow-[0_6px_16px_-6px_rgb(31_86_224/0.7)]"
                      : "text-ink-soft hover:-translate-y-px hover:bg-surface hover:text-ink hover:shadow-[0_4px_12px_-6px_rgb(31_86_224/0.4)] motion-reduce:hover:translate-y-0"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100 ${
                        isActive
                          ? done
                            ? "bg-white text-accent"
                            : "bg-white/25 text-white"
                          : done
                            ? "bg-accent text-white"
                            : "border border-line-strong bg-surface text-ink-muted group-hover:border-accent group-hover:text-accent"
                      }`}
                      aria-hidden
                    >
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    {/* Below 1280 px only the current step shows its label; the others keep it in aria-label. */}
                    <span className={`whitespace-nowrap pr-1 ${isActive ? "" : "hidden xl:inline"}`}>{step.label}</span>
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
