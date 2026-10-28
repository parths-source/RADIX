import { useRef } from "react"
import { FaCloud, FaDatabase, FaJava } from "react-icons/fa"
import { SiCplusplus, SiGit, SiJavascript, SiLinux, SiNodedotjs, SiPython, SiReact, SiTypescript } from "react-icons/si"

import wordmark from "@/assets/radix-wordmark.svg"
import { OrbitIcon, type OrbitTech } from "@/components/hero/OrbitIcon"
import { DOTS, useOrbit } from "@/components/hero/useOrbit"
import { useReducedMotion } from "@/lib/useReducedMotion"

const TECH: OrbitTech[] = [
  { label: "JavaScript", icon: SiJavascript, color: "#F7DF1E" },
  { label: "TypeScript", icon: SiTypescript, color: "#4B9BFF" },
  { label: "Java", icon: FaJava, color: "#F0743E" },
  { label: "Node.js", icon: SiNodedotjs, color: "#6CC24A" },
  { label: "React", icon: SiReact, color: "#61DAFB" },
  { label: "SQL", icon: FaDatabase, color: "#B58CFF" },
  { label: "Cloud", icon: FaCloud, color: "#5AD2F4" },
  { label: "Linux", icon: SiLinux, color: "#FCC624" },
  { label: "Git", icon: SiGit, color: "#F05032" },
  { label: "C++", icon: SiCplusplus, color: "#6FA8FF" },
  { label: "Python", icon: SiPython, color: "#FFD43B" },
]

const WORDMARK_ASPECT = 119 / 718 // height / width of radix-wordmark.svg
const wordmarkWidth = (stageWidth: number) => Math.min(stageWidth * 0.22, 320)

/** Elliptical orbit of tech logos around a glowing planet horizon carrying the RADIX wordmark. Decorative. */
export function OrbitStage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const { iconRefs, dotRefs, hovered, layout } = useOrbit(stageRef, TECH.length, reducedMotion)
  const g = layout

  return (
    <div ref={stageRef} className="pointer-events-none relative h-[clamp(260px,32vw,440px)] w-full overflow-hidden">
      <p className="sr-only">Decorative animation: logos of common technologies (JavaScript, Python, Java, SQL and others) orbit the RADIX wordmark.</p>
      <div aria-hidden className="absolute inset-0">
        {g && (
          <>
            <svg className="absolute inset-0 z-[5]" width={g.width} height={g.height}>
              {[1, 0.72, 0.5].map((ring, i) => (
                <ellipse key={ring} cx={g.cx} cy={g.cy} rx={g.a * ring} ry={g.b * ring} fill="none" stroke="var(--color-cyan)" strokeOpacity={[0.35, 0.25, 0.2][i]} strokeWidth={1} />
              ))}
            </svg>
            <div
              className="hero-planet absolute z-[15] rounded-full"
              style={{ width: g.width * 0.52, height: g.width * 0.52, left: g.cx - g.width * 0.26, top: g.cy - g.b * 0.25 }}
            />
            <img
              src={wordmark}
              alt=""
              className="hero-wordmark absolute z-20"
              style={{ width: wordmarkWidth(g.width), left: g.cx - wordmarkWidth(g.width) / 2, top: g.cy - g.b * 0.25 - wordmarkWidth(g.width) * WORDMARK_ASPECT - g.width * 0.01 }}
            />
            {DOTS.map((_, j) => (
              <span key={j} ref={(el) => { dotRefs.current[j] = el }} className="hero-dot absolute top-0 left-0 z-[12] -mt-[3px] -ml-[3px] size-1.5 rounded-full" />
            ))}
            {TECH.map((tech, i) => (
              <OrbitIcon
                key={tech.label}
                tech={tech}
                size={g.iconSize}
                showLabel={g.showLabels}
                setRef={(el) => { iconRefs.current[i] = el }}
                onHover={(on) => { hovered.current = on ? i : hovered.current === i ? null : hovered.current }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
