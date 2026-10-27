import { ShaderBackground } from "@/components/ui/kk"

// Phase 0 placeholder: proves the "@" alias resolves the provided shader.
// Replaced by the router and landing page in Phase 2.
function App() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-[#031C26] to-[#1B6CA8]">
      <ShaderBackground className="absolute inset-0 z-0" />
      <h1 className="relative z-10 text-4xl font-bold text-[#EAF9FF]">
        RADIX Talent Match
      </h1>
    </main>
  )
}

export default App
