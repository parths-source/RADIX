import { useLayoutEffect, useRef, useState, type ComponentType } from "react"
import { ChartNoAxesCombined, FileSearch, FileUser, Target, UserRoundPlus } from "lucide-react"

type Step = { title: string; text: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; place: string }

// place: grid position on wide screens (12 columns): a zig-zag of 1 → 2, down to 3, down to 4 → 5.
const STEPS: Step[] = [
  { title: "JD Analytics", text: "Upload a job description and see the skills it actually asks for, sorted into RADIX's 12 skillsets.", icon: FileSearch, place: "lg:col-start-1 lg:col-end-6 lg:row-start-1" },
  { title: "Resume Parsing", text: "Upload a resume and see the skills it shows, with projects, internships and hackathons.", icon: FileUser, place: "lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:mt-8" },
  { title: "Profile Builder", text: "Turn the resume into a full profile and link each skill to the experience that proves it.", icon: UserRoundPlus, place: "lg:col-start-4 lg:col-end-10 lg:row-start-2" },
  { title: "Talent Check", text: "See how the profile stacks up against a company's bar across all 12 skillsets.", icon: Target, place: "lg:col-start-1 lg:col-end-6 lg:row-start-3" },
  { title: "Skill Matching", text: "Compare the profile with one job posting: a match score and, more importantly, the gap list.", icon: ChartNoAxesCombined, place: "lg:col-start-8 lg:col-end-13 lg:row-start-3 lg:mt-8" },
]

const LOOP = 40 // how far the 2 → 3 connector swings out past the cards
const BEND = 22 // corner radius of the connectors
const GAP = 8 // space left between an arrowhead and the card it points at

type Box = { l: number; r: number; t: number; b: number; cx: number; cy: number }

/** A soft S-curve between two points at different heights. */
const sCurve = (x1: number, y1: number, x2: number, y2: number) => {
  const mid = (x1 + x2) / 2
  return `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`
}

/** Connector paths between consecutive cards, from their measured boxes. */
function connectorPaths(boxes: Box[]): string[] {
  const [c1, c2, c3, c4, c5] = boxes
  const stacked = c2.t >= c1.b - 1
  if (stacked) return boxes.slice(1).map((next, i) => `M${boxes[i].cx} ${boxes[i].b} V${next.t - GAP}`)

  const loopX = c2.r + LOOP
  const downX = c4.l + (c4.r - c4.l) * 0.22
  return [
    sCurve(c1.r, c1.t + (c1.b - c1.t) * 0.4, c2.l - GAP, c2.t + (c2.b - c2.t) * 0.4),
    `M${c2.r} ${c2.cy} H${loopX - BEND} Q${loopX} ${c2.cy} ${loopX} ${c2.cy + BEND} V${c3.cy - BEND} Q${loopX} ${c3.cy} ${loopX - BEND} ${c3.cy} H${c3.r + GAP}`,
    `M${c3.l} ${c3.cy} H${downX + BEND} Q${downX} ${c3.cy} ${downX} ${c3.cy + BEND} V${c4.t - GAP}`,
    sCurve(c4.r, c4.cy, c5.l - GAP, c5.cy),
  ]
}

/** The five modules as connected cards: a zig-zag with curved arrows on wide screens, a column on phones. */
export function StepsFlow() {
  const wrap = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLLIElement | null)[]>([])
  const [paths, setPaths] = useState<string[]>([])
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => {
      const origin = el.getBoundingClientRect()
      const boxes = cards.current.map((card) => {
        const r = card!.getBoundingClientRect()
        const box = { l: r.left - origin.left, r: r.right - origin.left, t: r.top - origin.top, b: r.bottom - origin.top }
        return { ...box, cx: (box.l + box.r) / 2, cy: (box.t + box.b) / 2 }
      })
      setWidth(origin.width)
      setPaths(connectorPaths(boxes))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    cards.current.forEach((card) => card && observer.observe(card))
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrap} className="relative lg:px-12">
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="steps-flow-stroke" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width || 1} y2="0">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-sky)" />
          </linearGradient>
          <marker id="steps-flow-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M2 2 L10 6 L2 10" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        {paths.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke="var(--color-accent)" strokeOpacity="0.12" strokeWidth="8" strokeLinecap="round" />
            <path d={d} fill="none" stroke="url(#steps-flow-stroke)" strokeWidth="2" strokeLinecap="round" markerEnd="url(#steps-flow-arrow)" />
            <path d={d} fill="none" className="steps-flow-pulse" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeDasharray="14 186" />
          </g>
        ))}
      </svg>

      <ol className="relative grid gap-12 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-14">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <li
              key={step.title}
              ref={(el) => {
                cards.current[i] = el
              }}
              className={`group relative rounded-2xl border border-line bg-surface/95 p-6 shadow-[0_18px_40px_-24px_rgb(31_86_224/0.35)] transition duration-300 lg:self-start hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_24px_48px_-20px_rgb(31_86_224/0.45)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${step.place}`}
            >
              <span
                className="absolute -top-5 -left-3 flex size-11 sm:-left-5 items-center justify-center rounded-full bg-gradient-to-br from-[#4338ca] via-accent to-sky text-lg font-bold text-white shadow-lg ring-4 shadow-accent/30 ring-paper"
                style={{ fontFamily: "var(--font-display)" }}
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="flex gap-5">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-accent/15 bg-gradient-to-br from-[#dfe8ff] to-[#f4f7ff] text-accent shadow-[inset_0_1px_0_white] transition-colors duration-300 group-hover:from-accent group-hover:to-sky group-hover:text-white">
                  <Icon className="size-9" strokeWidth={1.7} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.text}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
