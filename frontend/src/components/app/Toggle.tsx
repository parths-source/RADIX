import type { ReactNode } from "react"

/** A checkbox drawn as a switch. The label text is the switch's accessible name. */
export function Toggle({ checked, onChange, disabled, children }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label className={`flex items-start gap-3 text-xs leading-relaxed text-ink-soft ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full bg-line-strong transition-colors duration-200 peer-checked:bg-accent peer-focus-visible:ring-4 peer-focus-visible:ring-accent/25 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-4 motion-reduce:after:transition-none"
      />
      <span>{children}</span>
    </label>
  )
}
