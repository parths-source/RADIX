// Type-only stand-in for src/components/ui/kk.tsx, which must stay verbatim.
// That file fails strictNullChecks (a hoisted `function render` loses the
// `if (!gl) return` narrowing), so tsconfig.app.json maps the import here and
// excludes the file from type checking. Vite still bundles the real component.
import type { JSX } from "react"

export function ShaderBackground(props: { className?: string }): JSX.Element
