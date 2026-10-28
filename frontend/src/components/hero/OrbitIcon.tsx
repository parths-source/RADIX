import type { IconType } from "react-icons"

export interface OrbitTech {
  label: string
  icon: IconType
  color: string // brand colour for the icon, its ring and glow
}

/** One orbiting logo: a glass circle with a brand-tinted ring and glow, and a label below. Positioned by useOrbit. */
export function OrbitIcon({
  tech,
  size,
  showLabel,
  setRef,
  onHover,
}: {
  tech: OrbitTech
  size: number
  showLabel: boolean
  setRef: (el: HTMLDivElement | null) => void
  onHover: (hovering: boolean) => void
}) {
  const Icon = tech.icon
  return (
    <div
      ref={setRef}
      className="orbit-icon pointer-events-auto absolute top-0 left-0 flex flex-col items-center will-change-transform"
      style={{ width: size, transformOrigin: `50% ${size / 2}px`, "--brand": tech.color } as React.CSSProperties}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <span className="orbit-icon__disc flex items-center justify-center rounded-full" style={{ width: size, height: size }}>
        <Icon style={{ color: tech.color, width: size * 0.46, height: size * 0.46 }} />
      </span>
      {showLabel && <span className="mt-1.5 text-xs whitespace-nowrap text-mist/85">{tech.label}</span>}
    </div>
  )
}
