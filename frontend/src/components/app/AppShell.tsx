import type { ReactNode } from "react"
import { ArrowRight, RotateCcw } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router"

import { RadixLogo } from "@/components/hero/RadixLogo"
import { Stepper } from "@/components/app/Stepper"
import { useFlow } from "@/lib/flowState"
import { primaryButton, STEPS } from "@/lib/steps"

function StartOver() {
  const { reset } = useFlow()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => {
        reset()
        navigate("/analyze")
      }}
      className="group flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink-soft shadow-sm transition duration-200 hover:-translate-y-px hover:border-danger/40 hover:text-danger-ink hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      title="Forget the JD, resume, profile and results chosen in this flow (saved data stays in the database)"
      aria-label="Start over"
    >
      <RotateCcw className="size-3.5 transition-transform duration-500 group-hover:-rotate-180 motion-reduce:transition-none" aria-hidden />
      <span className="hidden sm:inline">Start over</span>
    </button>
  )
}

/** "Next step" call to action shown when a step is done. */
export function NextStep({ to, label }: { to: string; label: string }) {
  return (
    <div className="mt-6 flex justify-end">
      <Link to={to} className={`group ${primaryButton} rounded-full px-6`}>
        {label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden />
      </Link>
    </div>
  )
}

/** Layout for app pages: off-white paper backdrop, header with logo, stepper and start over. */
export function AppShell({ children }: { children: ReactNode }) {
  const { flow } = useFlow()
  const progress = STEPS.filter((s) => s.done(flow)).length / STEPS.length
  return (
    <div className="paper relative min-h-svh">
      <header className="relative z-30 border-b border-line bg-surface/80 backdrop-blur-md sm:sticky sm:top-0">
        {/* Phones: logo and Start over on the first row, the steps on a full row below. */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3">
          <Link to="/" className="mr-auto flex items-center gap-3 rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
            <RadixLogo label tone="ink" labelClassName="hidden sm:inline" />
          </Link>
          <div className="order-last flex w-full justify-center sm:order-none sm:w-auto">
            <Stepper />
          </div>
          <StartOver />
        </div>
        {/* Flow progress: how many of the five steps are done. */}
        <div aria-hidden className="absolute inset-x-0 -bottom-px h-0.5">
          <div className="h-full bg-gradient-to-r from-[#4338ca] via-accent to-sky transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${progress * 100}%` }} />
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}

/** Page banner: the step's icon, "Step n of 5", the title with its last word in blue, and the description. */
export function PageHeading({ title, description }: { title: string; description: string }) {
  const { pathname } = useLocation()
  const index = STEPS.findIndex((s) => s.to === pathname)
  const step = STEPS[index]
  const Icon = step?.icon
  const words = title.split(" ")
  const lead = words.slice(0, -1).join(" ")
  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-tint p-6 shadow-[0_18px_40px_-28px_rgb(31_86_224/0.45)] sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-accent/10 blur-3xl" />
      <div aria-hidden className="dot-grid pointer-events-none absolute top-5 right-6 hidden h-20 w-28 opacity-20 sm:block" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        {Icon && (
          <div aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4338ca] via-accent to-sky text-white shadow-[0_12px_28px_-10px_rgb(31_86_224/0.75)] sm:size-20">
            <Icon className="size-8 sm:size-10" strokeWidth={1.6} />
          </div>
        )}
        <div className="min-w-0">
          {step && (
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              Step {index + 1} of {STEPS.length} · {step.module}
            </p>
          )}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {lead && <>{lead} </>}
            <span className="blue-gradient">{words[words.length - 1]}</span>
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-soft sm:text-lg">{description}</p>
        </div>
      </div>
    </div>
  )
}

export function FallbackBadge() {
  return (
    <span className="rounded-full border border-warn/50 bg-warn/15 px-2.5 py-0.5 text-xs font-medium text-warn-ink" title="Loaded from a saved extraction of this file, made earlier by the same extractor (gemini-3.5-flash). Used by default for sample files, and automatically if the AI is unavailable.">
      Using saved extraction
    </span>
  )
}
