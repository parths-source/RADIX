import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

import { CoreSpinLoader } from "@/components/ui/core-spin-loader"

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur ${className}`}>{children}</section>
}

/** Shown while data is fetched or a background job runs: the animated loader plus what is happening. */
export function LoadingState({ label, className = "" }: { label: string; className?: string }) {
  return (
    <Panel className={className}>
      {/* aria-hidden: the loader's text changes every second and would be re-announced inside aria-live regions. */}
      <div aria-hidden className="motion-reduce:[&_*]:animate-none">
        <CoreSpinLoader />
      </div>
      <p className="text-center text-sm text-mist/70" role="status">{label}</p>
    </Panel>
  )
}

export function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-mist">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-mist/80">{message}</p>
      </div>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-mist/70">{children}</div>
  )
}
