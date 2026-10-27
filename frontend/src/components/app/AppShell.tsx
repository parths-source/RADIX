import type { ReactNode } from "react"
import { Link, NavLink } from "react-router"

import logo from "@/assets/radix-logo.svg"

const STEPS = [
  { to: "/analyze", label: "Analyze JD" },
  { to: "/resume", label: "Parse resume" },
  { to: "/profile", label: "Profile" },
  { to: "/talent-check", label: "Talent Check" },
  { to: "/match", label: "Skill Match" },
]

/** Layout for app pages: static gradient backdrop, header with logo and step links. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-backdrop relative min-h-svh text-mist">
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3 rounded focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none">
            <img src={logo} alt="RADIX" className="h-6 w-auto" />
            <span className="text-xs font-medium tracking-[0.25em] text-mist/70">TALENT MATCH</span>
          </Link>
          <nav aria-label="Steps" className="flex flex-wrap gap-1">
            {STEPS.map((step) => (
              <NavLink
                key={step.to}
                to={step.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none ${
                    isActive ? "bg-brand text-white" : "text-mist/70 hover:bg-white/10"
                  }`
                }
              >
                {step.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}

export function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-mist/70">{description}</p>
    </div>
  )
}

export function FallbackBadge() {
  return (
    <span className="rounded-full border border-warn/50 bg-warn/15 px-2.5 py-0.5 text-xs font-medium text-warn" title="The LLM was unavailable, so this is a saved extraction of the same file.">
      Using saved extraction
    </span>
  )
}
