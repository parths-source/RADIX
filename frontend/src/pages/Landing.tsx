import { ArrowRight, Sparkles } from "lucide-react"

import { ElectricButton } from "@/components/hero/ElectricButton"
import { Hero } from "@/components/hero/Hero"
import { SiteFooter } from "@/components/landing/SiteFooter"
import { StepsFlow } from "@/components/landing/StepsFlow"

export default function Landing() {
  return (
    <div className="bg-paper">
      <div className="bg-abyss text-mist">
        <Hero />
      </div>

      <div className="paper">
        <section id="features" className="relative scroll-mt-6 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-accent/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-sky/10 blur-3xl" />
          <div aria-hidden className="dot-grid pointer-events-none absolute bottom-16 left-6 hidden h-24 w-24 opacity-25 lg:block" />
          <div aria-hidden className="dot-grid pointer-events-none absolute top-24 right-8 hidden h-20 w-20 opacity-20 lg:block" />

          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-tint px-3 py-1 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                <Sparkles className="size-3.5" aria-hidden /> How it works
              </span>
              <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
                Five steps, <span className="blue-gradient">one flow</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-balance text-ink-soft">
                Each step feeds the next, so you go from a job posting to a clear list of what to work on.
              </p>
            </div>

            <div className="mt-16 sm:mt-20">
              <StepsFlow />
            </div>

            <div className="relative mt-14 flex justify-center">
              {/* Soft blue halo under the electric button. */}
              <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 h-16 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-accent/25 via-[#1e3a8a]/30 to-accent/25 blur-2xl" />
              <ElectricButton
                label="START WITH A JOB DESCRIPTION"
                to="/analyze"
                width={340}
                variant="light"
                fallbackClassName="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#4338ca] via-accent to-sky px-7 py-3.5 text-base font-semibold text-white shadow-[0_14px_32px_-12px_rgb(31_86_224/0.7)] transition hover:brightness-110 focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:outline-none"
              >
                Start with a job description
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden />
              </ElectricButton>
            </div>
          </div>
        </section>

        <section id="about" className="relative scroll-mt-6 border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr] lg:items-start">
            <div>
              <span className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">About</span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                The candidate's side of <span className="blue-gradient">hiring</span>
              </h2>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-6 text-ink-soft shadow-[0_18px_40px_-28px_rgb(31_86_224/0.35)] sm:p-8">
              <p className="text-lg leading-relaxed">
                Everything RADIX has built so far serves the company side of hiring: a 12-skillset competency framework and real hiring data.
                <strong className="font-semibold text-accent"> Talent Match flips the lens for the candidate.</strong>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                Scores are estimates from the documents you provide, not verified proficiency, and the company data shown in this build is a placeholder
                until RADIX's export is connected.
              </p>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </div>
  )
}
