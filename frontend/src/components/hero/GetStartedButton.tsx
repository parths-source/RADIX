import { useEffect, useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { INDUCTION_EFFECT, NeuformIsolatedEffect, type EffectDefinition } from "@/components/ui/induction-button"

const LABEL = "GET STARTED"
const TARGET = "/analyze"
const FLASH_MS = 380 // let the click discharge show before leaving the page
const READY_TIMEOUT_MS = 8000
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
        source.replace(">VALENCE CORE</span>", `>${LABEL}</span>`).replace(/<\/body>/i, `${bridgeScript(token)}</body>`),
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
      {status !== "ready" && (
        <Link
          to={TARGET}
          className="inline-flex items-center gap-2 rounded-full border border-mist/40 bg-abyss/60 px-6 py-2.5 font-medium text-mist backdrop-blur hover:bg-abyss/80 focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none"
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
