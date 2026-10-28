import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router"

import { INDUCTION_EFFECT, NeuformIsolatedEffect, type EffectDefinition } from "@/components/ui/induction-button"

const FLASH_MS = 380 // let the click discharge show before leaving the page
const READY_TIMEOUT_MS = 6000 // no word from the iframe by then: show the plain button
const MESSAGE_SOURCE = "radix-induction-button"
const LAYOUT_POLL_MS = 100
const LAYOUT_DEADLINE_MS = 3000 // after load; the Tailwind CDN styles the button a moment after the scripts arrive

/**
 * Runs inside the button's sandboxed iframe. Reports "ready" once the button is laid out
 * (its Tailwind CDN classes applied), "failed" if Tailwind never loaded or the layout never
 * settles, and "click" on activation.
 */
const bridgeScript = (token: string, width: number) => `<script>
(function () {
  function post(type) { parent.postMessage({ source: ${JSON.stringify(MESSAGE_SOURCE)}, token: ${JSON.stringify(token)}, type: type }, "*"); }
  window.addEventListener("load", function () {
    var btn = document.getElementById("btn");
    if (btn) btn.addEventListener("click", function () { post("click"); });
    // Offline: the Tailwind script failed, so the button would render broken. Say so at once.
    if (!btn || !window.tailwind) return post("failed");
    var started = Date.now();
    (function check() {
      // The exact size only once the Tailwind CDN classes have applied.
      if (btn.offsetWidth === ${width} && btn.offsetHeight === 96 && document.body.hasAttribute("data-threeui-ready")) return post("ready");
      if (Date.now() - started > ${LAYOUT_DEADLINE_MS}) return post("failed");
      setTimeout(check, ${LAYOUT_POLL_MS});
    })();
  });
})();
</script>`

/**
 * Edits to the button scene so it has no dark box around the plate. The original opens an opaque
 * canvas and paints #0A0A0A outside the plate; here the canvas is transparent, the outside paints
 * nothing, and each pixel's alpha follows its brightness (premultiplied), so the glow and arcs
 * blend over the hero while the plate itself stays solid.
 */
const TRANSPARENT_PLATE_EDITS: [string, string][] = [
  ["canvas.getContext('webgl', { alpha: false, antialias: true })", "canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true })"],
  ["'  vec3 col = vec3(0.039, 0.039, 0.039);',", "'  vec3 col = vec3(0.0);',"],
  [
    "'  gl_FragColor = vec4(col, 1.0);',",
    "'  float alpha = max(plate, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));', '  gl_FragColor = vec4(min(col, vec3(alpha)), alpha);',",
  ],
]

/**
 * The light variant, applied after TRANSPARENT_PLATE_EDITS: a blue plate with black electricity
 * and white text. Arcs are composited by their intensity (dark ink cannot be keyed off
 * brightness the way the glowing dark variant is).
 */
const LIGHT_PLATE_EDITS: [string, string][] = [
  ["'  vec3 plateCol = vec3(0.04, 0.05, 0.055);',", "'  vec3 plateCol = vec3(0.12, 0.34, 0.88);',"],
  ["'  plateCol += vec3(0.014, 0.022, 0.035) * fbm(p * 9.0);',", "'  plateCol -= vec3(0.03, 0.05, 0.08) * fbm(p * 9.0);',"],
  [
    "'  plateCol += vec3(0.0, 0.25, 0.3) * exp(d * 9.0) * (0.25 + hover * 0.6);',",
    "'  plateCol = mix(plateCol, vec3(0.38, 0.62, 1.0), clamp(exp(d * 9.0) * (0.25 + hover * 0.6), 0.0, 1.0));',",
  ],
  // Sample the arc noise on a circle instead of by raw angle, so there is no seam where the angle wraps (left edge).
  [
    "'    float n1 = fbm(vec2(a * 2.4 + fi * 11.3, t * (1.6 + fi * 0.27) + fi * 53.1));',",
    "'    float n1 = fbm(vec2(cos(a) * 1.3 + fi * 11.3, sin(a) * 1.3 + t * (1.6 + fi * 0.27) + fi * 53.1));',",
  ],
  [
    "'    float seg = smoothstep(0.35, 0.75, noise(vec2(a * 1.8 + fi * 7.7, t * (0.9 + fi * 0.13) + fi * 19.0)));',",
    "'    float seg = smoothstep(0.35, 0.75, noise(vec2(cos(a) * 1.0 + fi * 7.7, sin(a) * 1.0 + t * (0.9 + fi * 0.13) + fi * 19.0)));',",
  ],
  // Thinner filaments than the glowing dark variant, so dark strands stay distinct instead of merging into a band.
  ["'    float g = 0.0042 / (abs(d + off) + 0.006);',", "'    float g = 0.0022 / (abs(d + off) + 0.0035);',"],
  // arcCol.x carries the arc intensity, arcCol.y its hot core.
  [
    "'    arcCol += (vec3(0.0, 0.75, 0.9) * g + vec3(0.6, 1.0, 0.95) * g * g * 0.55) * w * seg;',",
    "'    arcCol += vec3(g + g * g * 0.55, g * g * 0.55, 0.0) * w * seg;',",
  ],
  [
    "'  col += arcCol * (0.6 + 0.4 * hover) * outerMask;',",
    "'  float arcA = clamp(arcCol.x * (1.0 + 0.2 * hover) * outerMask, 0.0, 1.0);', '  vec3 arcInk = vec3(0.02, 0.025, 0.04);',",
  ],
  // More arcs at rest than the dark variant (2.4) so the black electricity reads on the light page.
  ["let arcs = 2.4, arcsTarget = 2.4", "let arcs = 4.0, arcsTarget = 4.0"],
  ["btn.addEventListener('mouseleave', () => arcsTarget = 2.4);", "btn.addEventListener('mouseleave', () => arcsTarget = 4.0);"],
  ["btn.addEventListener('blur', () => arcsTarget = 2.4);", "btn.addEventListener('blur', () => arcsTarget = 4.0);"],
  ["'  col += vec3(0.8, 0.98, 1.0) * ring * u_flash * 1.5 * outerMask;',", "'  arcA = clamp(arcA + ring * u_flash * 1.5 * outerMask, 0.0, 1.0);',"],
  ["'  col += vec3(0.7, 0.95, 1.0) * u_flash * 0.16 * outerMask;',", "'  col = mix(col, vec3(0.55, 0.75, 1.0) * plate, u_flash * 0.5);',"],
  [
    "'  float alpha = max(plate, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));', '  gl_FragColor = vec4(min(col, vec3(alpha)), alpha);',",
    "'  gl_FragColor = vec4(arcInk * arcA + col * (1.0 - arcA), arcA + plate * (1.0 - arcA));',",
  ],
  // No WebGL: plain blue plate with a dark blue edge.
  ["btn.style.background = '#062630';", "btn.style.background = '#1f56e0';"],
  ["btn.style.boxShadow = '0 0 0 2px #00f2fe, 0 0 24px rgba(0, 242, 254, .5)';", "btn.style.boxShadow = '0 0 0 2px #1e3a8a, 0 0 24px rgba(30, 58, 138, .35)';"],
  [
    `text-[#e0f7f8]" style="text-shadow: 0 0 12px rgba(0, 210, 255, .6), 0 1px 4px rgba(0, 0, 0, .8);"`,
    `text-white" style="text-shadow: 0 1px 2px rgba(8, 20, 70, .45);"`,
  ],
]

function applyEdits(source: string, edits: [string, string][]) {
  return edits.reduce((text, [from, to]) => {
    if (!text.includes(from)) console.warn(`ElectricButton: scene changed, could not apply edit for: ${from}`)
    return text.replace(from, to)
  }, source)
}

/** Label and size edits. Long labels get tighter letter spacing so they fit on one line. */
function labelEdits(label: string, width: number): [string, string][] {
  const edits: [string, string][] = [
    [">VALENCE CORE</span>", `>${label}</span>`],
    ["w-[280px] h-[96px]", `w-[${width}px] h-[96px]`],
  ]
  if (label.length > 16) edits.push(["font-medium text-sm tracking-[0.3em] indent-[0.3em]", "font-semibold text-[13px] tracking-[0.12em] indent-[0.12em] whitespace-nowrap"])
  return edits
}

/**
 * A call to action drawn by the WebGL induction button, with a plain link as fallback.
 * label: upper-case text on the plate. width: the button's width in px (the plate is 96 px tall).
 * variant: "dark" glows cyan over dark backgrounds; "light" is a blue plate with black electricity, for light backgrounds.
 * children: the fallback link's content.
 */
export function ElectricButton({
  label,
  to,
  width = 280,
  variant = "dark",
  fallbackClassName,
  className = "",
  children,
}: {
  label: string
  to: string
  width?: number
  variant?: "dark" | "light"
  fallbackClassName: string
  className?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const token = useMemo(() => crypto.randomUUID(), [])
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading")

  const definition = useMemo<EffectDefinition>(
    () => ({
      ...INDUCTION_EFFECT,
      title: label,
      background: "transparent",
      theme: { ...INDUCTION_EFFECT.theme!, darkBackground: "transparent" },
      // Only the button: no ambient background canvas, so the hero shader shows through.
      targets: [{ selector: "#btn", role: "button" }],
      transformSource: (source) =>
        applyEdits(source, [...TRANSPARENT_PLATE_EDITS, ...(variant === "light" ? LIGHT_PLATE_EDITS : []), ...labelEdits(label, width)]).replace(
          /<\/body>/i,
          `${bridgeScript(token, width)}</body>`,
        ),
    }),
    [token, label, width, variant],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setStatus((s) => (s === "loading" ? "failed" : s)), READY_TIMEOUT_MS)
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; token?: string; type?: string } | null
      if (data?.source !== MESSAGE_SOURCE || data.token !== token) return
      if (data.type === "ready") setStatus("ready")
      else if (data.type === "failed") setStatus("failed")
      else if (data.type === "click") window.setTimeout(() => navigate(to), FLASH_MS)
    }
    window.addEventListener("message", onMessage)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("message", onMessage)
    }
  }, [token, navigate, to])

  return (
    <div className={`relative flex h-[112px] max-w-full items-center justify-center ${className}`} style={{ width: width + 40 }}>
      {/* Plain fallback: kept invisible while the electric button loads (no flash of the old button,
          no layout jump), shown only if the electric button fails, e.g. CDNs unreachable. */}
      {status !== "ready" && (
        <Link
          to={to}
          className={`${fallbackClassName} ${status === "loading" ? "invisible" : ""}`}
        >
          {children}
        </Link>
      )}
      {status !== "failed" && (
        <NeuformIsolatedEffect
          definition={definition}
          className={`absolute inset-0 transition-opacity duration-300 ${status === "ready" ? "opacity-100" : "pointer-events-none opacity-0"}`}
          // Must match the scene's own (dark) scheme, or the browser paints the iframe opaque.
          style={{ colorScheme: "dark" }}
        />
      )}
    </div>
  )
}
