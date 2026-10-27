import { BrowserRouter, Link, Route, Routes } from "react-router"

import { ShaderBackground } from "@/components/ui/kk"
import AnalyzeJD from "@/pages/AnalyzeJD"
import ParseResume from "@/pages/ParseResume"

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPlaceholder />} />
        <Route path="/analyze" element={<AnalyzeJD />} />
        <Route path="/resume" element={<ParseResume />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
