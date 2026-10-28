import logo from "@/assets/radix-logo.svg"

/** The provided RADIX logo (mark + wordmark), optionally with the product label set in HTML. */
export function RadixLogo({
  label = false,
  className = "h-6",
  labelClassName = "",
}: {
  label?: boolean
  className?: string
  labelClassName?: string
}) {
  return (
    <span className="flex items-center gap-3">
      <img src={logo} alt="RADIX" className={`${className} w-auto`} />
      {label && <span className={`text-xs font-medium tracking-[0.25em] whitespace-nowrap text-mist/70 uppercase ${labelClassName}`}>Talent Match</span>}
    </span>
  )
}
