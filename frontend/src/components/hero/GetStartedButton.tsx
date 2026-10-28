import { useEffect, useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { INDUCTION_EFFECT, NeuformIsolatedEffect, type EffectDefinition } from "@/components/ui/induction-button"

const LABEL = "GET STARTED"
const TARGET = "/analyze"
const FLASH_MS = 380 // let the click discharge show before leaving the page
const READY_TIMEOUT_MS = 4000 // no word from the iframe by then: show the plain button
const MESSAGE_SOURCE = "radix-induction-button"

/**
 * Runs inside the button's sandboxed iframe. Reports "ready" once the button is laid out
 * (its Tailwind CDN classes applied), "failed" otherwise, and "click" on activation.
 */
const bridgeScript = (token: string) => `<script>
(function () {
  function post(type) { parent.postMessage({ source: ${JSON.stringify(MESSAGE_SOURCE)}, token: ${JSON.stringify(token)}, type: type }, "*"); }
  window.addEventListener("load", function () {
    setTimeout(function () {
      var btn = document.getElementById("btn");
      // 280x96 only when the Tailwind CDN classes applied; without them (offline) the button renders broken.
      var ok = !!btn && btn.offsetWidth === 280 && btn.offsetHeight === 96 && document.body.hasAttribute("data-threeui-ready");
      post(ok ? "ready" : "failed");
      if (btn) btn.addEventListener("click", function () { post("click"); });
    }, 300);
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

function applyEdits(source: string, edits: [string, string][]) {
  return edits.reduce((text, [from, to]) => {
    if (!text.includes(from)) console.warn(`GetStartedButton: scene changed, could not apply edit for: ${from}`)
    return text.replace(from, to)
  }, source)
}

/** The landing "Get Started" call to action: the WebGL induction button, with a plain button as fallback. */
export function GetStartedButton() {
  const navigate = useNavigate()
  const token = useMemo(() => crypto.randomUUID(), [])
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading")

  const definition = useMemo<EffectDefinition>(
    () => ({
      ...INDUCTION_EFFECT,
      title: "Get Started",
      background: "transparent",
      theme: { ...INDUCTION_EFFECT.theme!, darkBackground: "transparent" },
      // Only the button: no ambient background canvas, so the hero shader shows through.
      targets: [{ selector: "#btn", role: "button" }],
      transformSource: (source) =>
        applyEdits(source, TRANSPARENT_PLATE_EDITS)
          .replace(">VALENCE CORE</span>", `>${LABEL}</span>`)
          .replace(/<\/body>/i, `${bridgeScript(token)}</body>`),
    }),
    [token],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setStatus((s) => (s === "loading" ? "failed" : s)), READY_TIMEOUT_MS)
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; token?: string; type?: string } | null
      if (data?.source !== MESSAGE_SOURCE || data.token !== token) return
      if (data.type === "ready") setStatus("ready")
      else if (data.type === "failed") setStatus("failed")
      else if (data.type === "click") window.setTimeout(() => navigate(TARGET), FLASH_MS)
    }
    window.addEventListener("message", onMessage)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("message", onMessage)
    }
  }, [token, navigate])

  return (
    <div className="relative mt-2 flex h-[112px] w-[320px] max-w-full items-center justify-center">
      {/* Plain fallback: kept invisible while the electric button loads (no flash of the old button,
          no layout jump), shown only if the electric button fails, e.g. CDNs unreachable. */}
      {status !== "ready" && (
        <Link
          to={TARGET}
          className={`inline-flex items-center gap-2 rounded-full border border-mist/40 bg-abyss/60 px-6 py-2.5 font-medium text-mist backdrop-blur hover:bg-abyss/80 focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none ${
            status === "loading" ? "invisible" : ""
          }`}
        >
          Get Started <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
      {status !== "failed" && (
        <NeuformIsolatedEffect
          definition={definition}
          className={`absolute inset-0 transition-opacity duration-300 ${status === "ready" ? "opacity-100" : "pointer-events-none opacity-0"}`}
          style={{ colorScheme: "dark" }}
        />
      )}
    </div>
  )
}
