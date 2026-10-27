import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

// The demo flow's ids, kept in context and localStorage so a refresh does not lose the demo
// (PLAN.md section 11.5). Storage can be unavailable (private mode), so every access is guarded.

export interface Flow {
  jdExtractionId?: string
  resumeExtractionId?: string
  profileId?: string
  companyKey?: string
  talentCheckDone?: boolean
  skillMatchDone?: boolean
}

const STORAGE_KEY = "radix-talent-match:flow:v1"

function readStored(): Flow {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Flow) : {}
  } catch {
    return {}
  }
}

function writeStored(flow: Flow) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flow))
  } catch {
    // Not persisted; the flow still works for this page load.
  }
}

interface FlowContextValue {
  flow: Flow
  update: (patch: Partial<Flow>) => void
  reset: () => void
}

const FlowContext = createContext<FlowContextValue | null>(null)

export function FlowProvider({ children }: { children: ReactNode }) {
  const [flow, setFlow] = useState<Flow>(readStored)

  const update = useCallback((patch: Partial<Flow>) => {
    setFlow((current) => {
      const next = { ...current, ...patch }
      writeStored(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    writeStored({})
    setFlow({})
  }, [])

  const value = useMemo(() => ({ flow, update, reset }), [flow, update, reset])
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFlow(): FlowContextValue {
  const value = useContext(FlowContext)
  if (!value) throw new Error("useFlow must be used inside <FlowProvider>")
  return value
}
