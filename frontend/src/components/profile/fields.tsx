import type { ReactNode } from "react"

import { labelClass } from "@/lib/steps"

export const inputClass =
  "w-full rounded-xl border border-line-strong/80 bg-surface px-3.5 py-2.5 text-[15px] text-ink shadow-[0_1px_2px_rgb(11_26_58/0.05)] transition duration-150 placeholder:text-ink-muted/70 hover:border-accent/50 focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15"

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger-ink">
          {error}
        </p>
      )}
    </div>
  )
}

export function FormSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_12px_32px_-18px_rgb(31_86_224/0.28)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span aria-hidden className="mt-1 h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-accent to-sky" />
          <div>
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SmallButton({ children, onClick, tone = "default", label }: { children: ReactNode; onClick: () => void; tone?: "default" | "danger"; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium shadow-sm transition duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        tone === "danger" ? "border-danger/30 bg-surface text-danger-ink hover:border-danger/50 hover:bg-danger/5" : "border-accent/25 bg-tint text-accent hover:border-accent/50 hover:bg-accent/10"
      }`}
    >
      {children}
    </button>
  )
}
