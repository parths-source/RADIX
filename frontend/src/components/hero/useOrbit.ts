import { useEffect, useRef, useState, type RefObject } from "react"

// Orbit motion for the hero (PLAN.md section 11.4). One requestAnimationFrame loop writes
// transforms straight to the elements; React state changes only when the stage is resized.

const PERIOD_SECONDS = 90 // one full orbit
const HOVER_SPEED = 0.2 // orbit slows to 20% while an icon is hovered
const SPEED_EASING = 4 // per second; eases the speed change instead of jumping
const BACK_SCALE = 0.8
const FRONT_SCALE = 1.05
const BACK_OPACITY = 0.7
const HOVER_SCALE = 1.12
const Z_BACK = 10 // behind the planet (15) and the wordmark (20)
const Z_FRONT = 30

export interface OrbitLayout {
  width: number
  height: number
  cx: number
  cy: number
  a: number // ellipse radii
  b: number
  iconSize: number
  showLabels: boolean
}

function computeLayout(width: number, height: number): OrbitLayout {
  const iconSize = width < 640 ? 44 : width < 1024 ? 56 : 68
  const a = width * 0.46 - iconSize / 2
  const cy = height * 0.5
  // b is about 14% of the width, but never so tall that icons leave the stage.
  const b = Math.min(width * 0.14, cy - iconSize * 0.75, height - cy - iconSize * 1.1)
  return { width, height, cx: width / 2, cy, a, b, iconSize, showLabels: width >= 640 }
}

/** Dots drifting on the inner rings: [ring scale, start angle, period in seconds]. */
export const DOTS: [number, number, number][] = [
  [0.72, 0.4, 55], [0.72, 2.6, 55], [0.72, 4.5, 55],
  [0.5, 1.2, 38], [0.5, 3.9, 38],
  [1, 5.4, 120], [1, 2.2, 120],
]

export function useOrbit(stageRef: RefObject<HTMLDivElement | null>, count: number, reducedMotion: boolean) {
  const iconRefs = useRef<(HTMLDivElement | null)[]>([])
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([])
  const hovered = useRef<number | null>(null)
  const placeRef = useRef<(() => void) | null>(null)
  const [layout, setLayout] = useState<OrbitLayout | null>(null)

  // Icons mount only after the first layout; place them once React has committed them
  // (with reduced motion there is no animation loop to do it later).
  useEffect(() => {
    placeRef.current?.()
  }, [layout])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let geo = computeLayout(stage.clientWidth, stage.clientHeight)
    let raf = 0
    let last = 0
    let t = 0
    let speed = 1
    let onScreen = true

    const place = () => {
      const omega = (2 * Math.PI) / PERIOD_SECONDS
      for (let i = 0; i < count; i++) {
        const el = iconRefs.current[i]
        if (!el) continue
        const theta = (2 * Math.PI * i) / count + omega * t
        const x = geo.cx + geo.a * Math.cos(theta)
        const y = geo.cy + geo.b * Math.sin(theta)
        const depth = (Math.sin(theta) + 1) / 2 // 0 = back of the orbit, 1 = front
        let scale = BACK_SCALE + (FRONT_SCALE - BACK_SCALE) * depth
        if (hovered.current === i) scale *= HOVER_SCALE
        el.style.transform = `translate3d(${x - geo.iconSize / 2}px, ${y - geo.iconSize / 2}px, 0) scale(${scale})`
        el.style.opacity = String(BACK_OPACITY + (1 - BACK_OPACITY) * depth)
        el.style.zIndex = String(depth > 0.5 ? Z_FRONT : Z_BACK)
      }
      DOTS.forEach(([ring, start, period], j) => {
        const el = dotRefs.current[j]
        if (!el) return
        const theta = start + ((2 * Math.PI) / period) * t
        const x = geo.cx + geo.a * ring * Math.cos(theta)
        const y = geo.cy + geo.b * ring * Math.sin(theta)
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
        el.style.opacity = String(0.35 + 0.65 * ((Math.sin(theta) + 1) / 2))
      })
    }

    placeRef.current = place

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0
      last = now
      const target = hovered.current === null ? 1 : HOVER_SPEED
      speed += (target - speed) * (1 - Math.exp(-SPEED_EASING * dt))
      t += dt * speed
      place()
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (raf || reducedMotion || !onScreen || document.hidden) return
      last = 0
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    const resize = new ResizeObserver(() => {
      geo = computeLayout(stage.clientWidth, stage.clientHeight)
      setLayout(geo)
      place()
    })
    resize.observe(stage)
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen) start()
      else stop()
    })
    visibility.observe(stage)
    const onVisibilityChange = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", onVisibilityChange)

    place()
    start()
    return () => {
      stop()
      placeRef.current = null
      resize.disconnect()
      visibility.disconnect()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [stageRef, count, reducedMotion])

  return { iconRefs, dotRefs, hovered, layout }
}
