import { lazy, Suspense } from "react"
import { BrowserRouter, Link, Route, Routes } from "react-router"
import { Toaster } from "sonner"

import { ShaderBackground } from "@/components/ui/kk"
import { FlowProvider } from "@/lib/flowState"

const AnalyzeJD = lazy(() => import("@/pages/AnalyzeJD"))
const ParseResume = lazy(() => import("@/pages/ParseResume"))
const Profile = lazy(() => import("@/pages/Profile"))
const TalentCheck = lazy(() => import("@/pages/TalentCheck"))
const SkillMatch = lazy(() => import("@/pages/SkillMatch"))

// The landing page is Phase 2; until then "/" is a minimal placeholder.
function LandingPlaceholder() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-br from-abyss to-tide">
      <ShaderBackground className="absolute inset-0 z-0" />
      <h1 className="relative z-10 text-4xl font-bold text-mist">RADIX Talent Match</h1>
      <Link to="/analyze" className="relative z-10 rounded-full border border-mist/60 px-5 py-2 text-mist hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none">
        Get Started
      </Link>
    </main>
  )
}

function App() {
  return (
    <FlowProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="app-backdrop min-h-svh" />}>
          <Routes>
            <Route path="/" element={<LandingPlaceholder />} />
            <Route path="/analyze" element={<AnalyzeJD />} />
            <Route path="/resume" element={<ParseResume />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/talent-check" element={<TalentCheck />} />
            <Route path="/match" element={<SkillMatch />} />
          </Routes>
        </Suspense>
        <Toaster theme="dark" position="top-center" richColors />
      </BrowserRouter>
    </FlowProvider>
  )
}

export default App
