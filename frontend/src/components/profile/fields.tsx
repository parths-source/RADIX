import type { ReactNode } from "react"

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none aria-[invalid=true]:border-danger"

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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
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
    <section className="rounded-2xl border border-line bg-surface p-5 backdrop-blur">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
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
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
        tone === "danger" ? "border-danger/30 text-danger-ink hover:bg-danger/10" : "border-line text-ink hover:bg-tint"
      }`}
    >
      {children}
    </button>
  )
}
