import type { CategoryCode } from "@/types/contract"

// Names from the brief's 12-skillset table, in the brief's order, then OTHER.
export const CATEGORIES: { code: CategoryCode; label: string }[] = [
  { code: "COD", label: "Coding" },
  { code: "DSA", label: "Data Structures & Algorithms" },
  { code: "OOD", label: "Object-Oriented Design" },
  { code: "APTI", label: "Aptitude" },
  { code: "COMM", label: "Communication" },
  { code: "AI", label: "AI" },
  { code: "CLOUD", label: "Cloud" },
  { code: "SQL", label: "SQL" },
  { code: "SWE", label: "Software Engineering" },
  { code: "SYSD", label: "System Design" },
  { code: "NETW", label: "Networking" },
  { code: "OS", label: "Operating Systems" },
  { code: "OTHER", label: "Other" },
]
