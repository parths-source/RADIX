import { Link } from "react-router"

import { RadixLogo } from "@/components/hero/RadixLogo"

const LINKS = [
  { href: "#top", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
]

export function Nav() {
  return (
    <header className="relative z-40 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <a href="#top" className="rounded focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none">
        <RadixLogo label labelClassName="hidden sm:inline" />
      </a>
      <nav aria-label="Main" className="flex items-center gap-1 sm:gap-6">
        {LINKS.map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            className={`hidden rounded px-1 py-1 text-sm text-mist/85 hover:text-mist focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none sm:inline ${
              i === 0 ? "border-b-2 border-cyan text-mist" : ""
            }`}
          >
            {link.label}
          </a>
        ))}
        <Link
          to="/analyze"
          className="rounded-full border border-mist/50 px-4 py-2 text-sm font-medium whitespace-nowrap text-mist hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none sm:ml-2"
        >
          Get Started
        </Link>
      </nav>
    </header>
  )
}
