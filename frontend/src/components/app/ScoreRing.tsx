/** A 0–100 score as a ring with the number in the middle. */
export function ScoreRing({ score, label, caption }: { score: number; label: string; caption?: string }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 128 128" className="size-36" role="img" aria-label={`${label}: ${score} out of 100`}>
        <defs>
          <linearGradient id="score-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-sky)" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--color-tint)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#score-ring-gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="64" textAnchor="middle" dominantBaseline="central" className="fill-ink text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          {score}
        </text>
      </svg>
      <figcaption className="text-center">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {caption && <span className="block text-xs text-ink-muted">{caption}</span>}
      </figcaption>
    </figure>
  )
}
