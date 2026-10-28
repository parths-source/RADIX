import type { ReactNode } from "react"
import { ArrowRight, RotateCcw } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { RadixLogo } from "@/components/hero/RadixLogo"
import { Stepper } from "@/components/app/Stepper"
import { useFlow } from "@/lib/flowState"

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
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-muted hover:bg-tint focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      title="Forget the JD, resume, profile and results chosen in this flow (saved data stays in the database)"
    >
      <RotateCcw className="size-3.5" aria-hidden /> Start over
    </button>
  )
}

/** "Next step" call to action shown when a step is done. */
export function NextStep({ to, label }: { to: string; label: string }) {
  return (
    <div className="mt-6 flex justify-end">
      <Link
        to={to}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        {label} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  )
}

/** Layout for app pages: off-white paper backdrop, header with logo, stepper and start over. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="paper relative min-h-svh">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3 rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
            <RadixLogo label tone="ink" />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Stepper />
            <StartOver />
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}

export function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="ink-gradient w-fit text-2xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>
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
