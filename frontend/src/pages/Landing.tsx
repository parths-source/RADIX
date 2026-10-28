import { Link } from "react-router"

import { Hero } from "@/components/hero/Hero"
import { RadixLogo } from "@/components/hero/RadixLogo"

const MODULES = [
  { title: "JD Analytics", text: "Upload a job description and see the skills it actually asks for, sorted into RADIX's 12 skillsets." },
  { title: "Resume Parsing", text: "Upload a resume and see the skills it shows, with projects, internships and hackathons." },
  { title: "Profile Builder", text: "Turn the resume into a full profile and link each skill to the experience that proves it." },
  { title: "Talent Check", text: "See how the profile stacks up against a company's bar across all 12 skillsets." },
  { title: "Skill Matching", text: "Compare the profile with one job posting: a match score and, more importantly, the gap list." },
]

export default function Landing() {
  return (
    <div className="bg-abyss text-mist">
      <Hero />

      <section id="features" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">Five steps, one flow</h2>
        <p className="mt-2 max-w-2xl text-mist/70">Each step feeds the next, so you go from a job posting to a clear list of what to work on.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {MODULES.map((m, i) => (
            <li key={m.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{m.title}</h3>
              <p className="mt-2 text-sm text-mist/70">{m.text}</p>
            </li>
          ))}
        </ol>
        <Link to="/analyze" className="mt-8 inline-flex rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none">
          Start with a job description
        </Link>
      </section>

      <section id="about" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">About</h2>
          <p className="mt-3 max-w-3xl text-mist/75">
            Everything RADIX has built so far serves the company side of hiring: a 12-skillset competency framework and real hiring data.
            Talent Match flips the lens for the candidate. Scores are estimates from the documents you provide, not verified proficiency,
            and the company data shown in this build is a placeholder until RADIX's export is connected.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-mist/50 sm:px-6">
          <RadixLogo label className="h-5" labelClassName="hidden sm:inline" />
          <span>Talent Match Hackathon 2026</span>
        </div>
      </footer>
    </div>
  )
}
