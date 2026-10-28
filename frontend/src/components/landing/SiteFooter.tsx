import { useEffect, useRef } from "react"
import { Link } from "react-router"

import { RadixLogo } from "@/components/hero/RadixLogo"
import { ShaderBackground } from "@/components/ui/kk"
import { useReducedMotion } from "@/lib/useReducedMotion"

const WORD = "RADIX"
const REST_X = 0.62 // where the light rests when the cursor is away: this far across the footer,
const REST_ABOVE = 0.35 // and this many font sizes above the top of the letters
const FOLLOW = 7 // per second; how quickly the light and letters catch up with the cursor
const LIFT = 0.09 // letter lift at the cursor, as a fraction of the font size
const TILT_DEG = 5
const HOVER_SCALE = 0.05
const REACH = 0.8 // how far the lift spreads to either side, in font sizes

const LINK_CLASS =
  "rounded text-[17px] text-mist/80 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none"

type Column = { title: string; links: { label: string; to: string }[] }

const COLUMNS: Column[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "#features" },
      { label: "Analyze a JD", to: "/analyze" },
      { label: "Parse a resume", to: "/resume" },
      { label: "Talent Check", to: "/talent-check" },
      { label: "Skill Match", to: "/match" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "About", to: "#about" },
      { label: "Build a profile", to: "/profile" },
      { label: "Back to top", to: "#top" },
    ],
  },
]

/**
 * Landing footer: the hero shader as background, a light beam that follows the cursor and a
 * large RADIX wordmark whose letters lift toward the cursor and catch its light.
 */
export function SiteFooter() {
  const reducedMotion = useReducedMotion()
  const footerRef = useRef<HTMLElement>(null)
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const footer = footerRef.current
    if (!footer) return
    const letters = letterRefs.current.filter((el): el is HTMLSpanElement => !!el)
    let width = footer.clientWidth
    let height = footer.clientHeight
    // Letter boxes relative to the footer, untransformed (offset* ignores transforms).
    let boxes = letters.map(() => ({ x: 0, y: 0, w: 1, h: 1 }))
    let fontPx = 1
    const measure = () => {
      width = footer.clientWidth
      height = footer.clientHeight
      const origin = footer.getBoundingClientRect()
      boxes = letters.map((el) => {
        const parent = el.offsetParent as HTMLElement | null
        const p = parent?.getBoundingClientRect() ?? origin
        return { x: p.left - origin.left + el.offsetLeft, y: p.top - origin.top + el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
      })
      fontPx = parseFloat(getComputedStyle(letters[0] ?? footer).fontSize) || 1
    }
    measure()

    const restY = () => (boxes[0]?.y ?? height) - REST_ABOVE * fontPx
    const target = { x: REST_X * width, y: restY(), inside: false }
    const light = { x: target.x, y: target.y }
    const motion = letters.map(() => ({ lift: 0, tilt: 0, scale: 0 }))
    let raf = 0
    let last = 0

    const paint = () => {
      footer.style.setProperty("--fx", `${light.x}px`)
      footer.style.setProperty("--fy", `${light.y}px`)
      letters.forEach((el, i) => {
        const box = boxes[i]
        el.style.setProperty("--lx", `${light.x - box.x}px`)
        el.style.setProperty("--ly", `${light.y - box.y}px`)
        const m = motion[i]
        el.style.transform = reducedMotion
          ? ""
          : `translate3d(0, ${(-m.lift * fontPx).toFixed(2)}px, 0) rotate(${m.tilt.toFixed(2)}deg) scale(${(1 + m.scale).toFixed(4)})`
      })
    }

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60
      last = now
      const k = 1 - Math.exp(-FOLLOW * dt)
      const goalX = target.inside ? target.x : REST_X * width
      const goalY = target.inside ? target.y : restY()
      light.x += (goalX - light.x) * k
      light.y += (goalY - light.y) * k
      let moving = Math.abs(goalX - light.x) + Math.abs(goalY - light.y) > 0.5
      letters.forEach((_, i) => {
        const box = boxes[i]
        // Distance in font sizes, not letter widths, so the narrow I reacts like the others.
        const offset = (target.x - (box.x + box.w / 2)) / fontPx
        const near = target.inside ? Math.exp(-((offset / REACH) ** 2)) : 0
        const m = motion[i]
        const goal = { lift: LIFT * near, tilt: Math.max(-1, Math.min(1, offset / 0.4)) * -TILT_DEG * near, scale: HOVER_SCALE * near }
        m.lift += (goal.lift - m.lift) * k
        m.tilt += (goal.tilt - m.tilt) * k
        m.scale += (goal.scale - m.scale) * k
        if (Math.abs(goal.lift - m.lift) + Math.abs(goal.tilt - m.tilt) / 10 > 0.0005) moving = true
      })
      paint()
      raf = moving ? requestAnimationFrame(frame) : 0
      if (!raf) last = 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    const onMove = (event: PointerEvent) => {
      const r = footer.getBoundingClientRect()
      target.x = event.clientX - r.left
      target.y = event.clientY - r.top
      target.inside = true
      kick()
    }
    const onLeave = () => {
      target.inside = false
      kick()
    }
    const resize = new ResizeObserver(() => {
      measure()
      kick()
    })
    resize.observe(footer)
    footer.addEventListener("pointermove", onMove, { passive: true })
    footer.addEventListener("pointerleave", onLeave)
    // Fonts change the letter widths once they load.
    document.fonts?.ready.then(() => {
      measure()
      kick()
    })
    paint()
    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      footer.removeEventListener("pointermove", onMove)
      footer.removeEventListener("pointerleave", onLeave)
    }
  }, [reducedMotion])

  return (
    <footer ref={footerRef} className="hero-fallback relative isolate overflow-hidden text-mist">
      {!reducedMotion && <ShaderBackground className="absolute inset-0 z-0" />}
      <div aria-hidden className="footer-scrim pointer-events-none absolute inset-0 z-[1]" />
      <div aria-hidden className="footer-stripes pointer-events-none absolute inset-0 z-[1]" />
      <div aria-hidden className="footer-glow pointer-events-none absolute inset-0 z-[2]" />
      <div aria-hidden className="footer-beam pointer-events-none absolute z-[2]" />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 pt-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr] md:gap-12">
        <div className="col-span-2 md:col-span-1">
          <p className="footer-label">© 2026 RADIX</p>
          <div className="mt-6">
            <RadixLogo label className="h-6" />
          </div>
          <p className="mt-5 max-w-sm leading-relaxed text-mist/70">
            Talent Match shows a candidate how ready they are for a specific job: the skills it asks for, the gaps, and what to work on next.
          </p>
          <p className="mt-3 text-sm text-mist/55">
            Built for the <span className="text-mist">RADIX Talent Match Hackathon 2026</span>
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="footer-label">{column.title}</p>
            <ul className="mt-6 space-y-3.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  {/* Section links stay plain anchors so the browser scrolls to them; pages go through the router. */}
                  {link.to.startsWith("#") ? (
                    <a href={link.to} className={LINK_CLASS}>
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className={LINK_CLASS}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div aria-hidden className="footer-wordmark relative z-10 mt-14 flex justify-center px-4 select-none sm:mt-20">
        {WORD.split("").map((ch, i) => (
          <span
            key={i}
            ref={(el) => {
              letterRefs.current[i] = el
            }}
            className="footer-letter inline-block origin-bottom will-change-transform"
          >
            {ch}
          </span>
        ))}
      </div>
    </footer>
  )
}
