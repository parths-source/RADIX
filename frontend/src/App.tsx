import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router"
import { Toaster } from "sonner"

import { CoreSpinLoader } from "@/components/ui/core-spin-loader"
import { FlowProvider } from "@/lib/flowState"
import Landing from "@/pages/Landing"

const AnalyzeJD = lazy(() => import("@/pages/AnalyzeJD"))
const ParseResume = lazy(() => import("@/pages/ParseResume"))
const Profile = lazy(() => import("@/pages/Profile"))
const TalentCheck = lazy(() => import("@/pages/TalentCheck"))
const SkillMatch = lazy(() => import("@/pages/SkillMatch"))

function App() {
  return (
    <FlowProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="app-backdrop flex min-h-svh items-center justify-center motion-reduce:[&_*]:animate-none" aria-hidden>
              <CoreSpinLoader />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
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
