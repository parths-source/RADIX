import logo from "@/assets/radix-logo.svg"
import logoInk from "@/assets/radix-logo-ink.svg"

/** The provided RADIX logo (mark + wordmark), optionally with the product label set in HTML.
 *  tone="ink" is the navy copy for light backgrounds. */
export function RadixLogo({
  label = false,
  className = "h-6",
  labelClassName = "",
  tone = "light",
}: {
  label?: boolean
  className?: string
  labelClassName?: string
  tone?: "light" | "ink"
}) {
  return (
    <span className="flex items-center gap-3">
      <img src={tone === "ink" ? logoInk : logo} alt="RADIX" className={`${className} w-auto`} />
      {label && <span className={`text-xs font-medium tracking-[0.25em] whitespace-nowrap uppercase ${tone === "ink" ? "text-accent" : "text-mist/70"} ${labelClassName}`}>Talent Match</span>}
    </span>
  )
}
