import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur ${className}`}>{children}</section>
}

export function LoadingSkeleton({ label }: { label: string }) {
  return (
    <Panel>
      <p className="mb-4 text-sm text-mist/70" role="status">{label}</p>
      <div className="space-y-4" aria-hidden>
        {[0, 1, 2].map((row) => (
          <div key={row} className="space-y-2">
            <div className="h-3 w-40 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((chip) => (
                <div key={chip} className="h-7 w-24 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
              ))}
            </div>
          </div>
        ))}
      </div>
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
