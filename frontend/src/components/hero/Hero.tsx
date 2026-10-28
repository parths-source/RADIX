import "@/components/hero/hero.css"
import { GetStartedButton } from "@/components/hero/GetStartedButton"
import { Nav } from "@/components/hero/Nav"
import { OrbitStage } from "@/components/hero/OrbitStage"
import { ShaderBackground } from "@/components/ui/kk"
import { useReducedMotion } from "@/lib/useReducedMotion"

/**
 * Landing hero. Layers, bottom to top: CSS gradient fallback, the provided WebGL shader
 * (not mounted under reduced motion), a scrim behind the headline, the orbit stage, content.
 */
export function Hero() {
  const reducedMotion = useReducedMotion()
  return (
    <section id="top" className="hero-fallback relative flex min-h-svh flex-col overflow-hidden">
      {!reducedMotion && <ShaderBackground className="absolute inset-0 z-0" />}
      <div aria-hidden className="hero-scrim pointer-events-none absolute inset-0 z-[1]" />

      <div className="relative z-10 flex flex-1 flex-col">
        <Nav />
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pt-2 text-center sm:pt-3">
          <span className="rounded-full border border-mist/30 bg-abyss/40 px-4 py-1.5 text-[11px] font-medium tracking-[0.25em] text-mist/90 backdrop-blur">
            AI-POWERED CAREER INTELLIGENCE
          </span>
          <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight text-mist sm:text-6xl">
            Your Skills. Our AI.
            {/* The mockup's violet->pink gradient measured 1.8-2.5:1 over the shader (3:1 needed), so --mist per PLAN 11.4. */}
            <span className="block">A Better Career Tomorrow.</span>
          </h1>
          <p className="hero-sub mt-4 max-w-xl text-base text-mist sm:text-lg">
            RADIX Talent Match helps you understand job requirements, evaluate your skills, find the gaps, and build your path to success.
          </p>
          <GetStartedButton />
        </div>
        <div className="mt-auto pt-4">
          <OrbitStage />
        </div>
      </div>
    </section>
  )
}
