import type { ReactNode } from "react"

export const inputClass =
  "w-full rounded-lg border border-white/15 bg-deep/80 px-3 py-2 text-sm text-mist placeholder:text-mist/40 focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none aria-[invalid=true]:border-danger"

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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-mist">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-mist/50">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function FormSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-mist/60">{description}</p>}
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
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none ${
        tone === "danger" ? "border-danger/30 text-danger hover:bg-danger/10" : "border-white/15 text-mist hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  )
}
