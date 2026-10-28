import type { ComponentType } from "react"
import { ChartNoAxesCombined, FileSearch, FileUser, Target, UserRoundPlus } from "lucide-react"

import type { Flow } from "@/lib/flowState"

export type Step = {
  to: string
  label: string // short name for the navbar
  module: string // module name used in page headings
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  done: (f: Flow) => boolean
}

/** The five modules in flow order. */
export const STEPS: Step[] = [
  { to: "/analyze", label: "Analyze JD", module: "JD Analytics", icon: FileSearch, done: (f) => !!f.jdExtractionId },
  { to: "/resume", label: "Parse resume", module: "Resume Parsing", icon: FileUser, done: (f) => !!f.resumeExtractionId },
  { to: "/profile", label: "Build profile", module: "Profile Builder", icon: UserRoundPlus, done: (f) => !!f.profileId },
  { to: "/talent-check", label: "Talent Check", module: "Talent Check", icon: Target, done: (f) => !!f.talentCheckDone },
  { to: "/match", label: "Skill Match", module: "Skill Matching", icon: ChartNoAxesCombined, done: (f) => !!f.skillMatchDone },
]

/** Shared button and form styles for the light pages. */
export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4338ca] via-accent to-sky px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(31_86_224/0.8)] transition duration-200 hover:-translate-y-px hover:shadow-[0_14px_28px_-12px_rgb(31_86_224/0.9)] hover:brightness-110 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"

export const labelClass = "mb-1.5 block text-sm font-semibold text-ink"
