import { z } from "zod"

import { CATEGORIES } from "@/lib/categories"
import type { CandidateProfile, CategoryCode, Entry } from "@/types/contract"

// Form shape for the profile editor. Mirrors CandidateProfile, but keeps inputs as
// strings (duration, roles) and converts on submit, so validation messages stay simple.

export const ENTRY_GROUPS = ["projects", "internships", "hackathons", "certifications"] as const
export type EntryGroup = (typeof ENTRY_GROUPS)[number]

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const nameKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()

const skillSchema = z.object({
  skill_name: z.string().trim().min(1, "Enter a skill name."),
  category_code: z.enum(CATEGORIES.map((c) => c.code) as [CategoryCode, ...CategoryCode[]]),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.string(),
})

const entrySchema = z.object({
  title: z.string().trim().min(1, "Enter a title."),
  description: z.string(),
  skills_used: z.array(z.string()),
  duration: z.string().regex(/^\d*$/, "Enter whole months, or leave it empty."),
})

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Enter the candidate's name."),
    email: z.string().trim().refine((v) => v === "" || EMAIL.test(v), "Enter a valid email, or leave it empty."),
    education: z.string(),
    skills: z.array(skillSchema).max(100, "A profile can hold at most 100 skills."),
    projects: z.array(entrySchema),
    internships: z.array(entrySchema),
    hackathons: z.array(entrySchema),
    certifications: z.array(entrySchema),
    preferred_roles: z.string(),
    cv_file: z.string().nullable(),
  })
  .superRefine((form, ctx) => {
    const seen = new Set<string>()
    form.skills.forEach((skill, i) => {
      const key = nameKey(skill.skill_name)
      if (key && seen.has(key)) ctx.addIssue({ code: "custom", path: ["skills", i, "skill_name"], message: "This skill is already listed." })
      seen.add(key)
    })
    for (const group of ENTRY_GROUPS) {
      form[group].forEach((entry, i) => {
        const unknown = entry.skills_used.filter((s) => !seen.has(nameKey(s)))
        if (unknown.length > 0)
          ctx.addIssue({
            code: "custom",
            path: [group, i, "skills_used"],
            message: `Not in the skills list: ${unknown.join(", ")}. Add the skill or remove it here.`,
          })
      })
    }
  })

export type ProfileForm = z.infer<typeof profileSchema>
export type EntryForm = ProfileForm["projects"][number]

export const emptyEntry = (): EntryForm => ({ title: "", description: "", skills_used: [], duration: "" })

const entryToForm = (e: Entry): EntryForm => ({
  title: e.title,
  description: e.description ?? "",
  skills_used: e.skills_used ?? [],
  duration: e.duration_months == null ? "" : String(e.duration_months),
})

export function toForm(p?: Partial<CandidateProfile>): ProfileForm {
  return {
    name: p?.name ?? "",
    email: p?.email ?? "",
    education: p?.education ?? "",
    skills: (p?.skills ?? []).map((s) => ({ skill_name: s.skill_name, category_code: s.category_code, confidence: s.confidence, evidence: s.evidence ?? "" })),
    projects: (p?.projects ?? []).map(entryToForm),
    internships: (p?.internships ?? []).map(entryToForm),
    hackathons: (p?.hackathons ?? []).map(entryToForm),
    certifications: (p?.certifications ?? []).map(entryToForm),
    preferred_roles: (p?.preferred_roles ?? []).join(", "),
    cv_file: p?.cv_file ?? null,
  }
}

const entryFromForm = (e: EntryForm): Entry => ({
  title: e.title.trim(),
  description: e.description.trim(),
  skills_used: e.skills_used,
  duration_months: e.duration === "" ? null : Number(e.duration),
})

export function fromForm(f: ProfileForm): CandidateProfile {
  return {
    name: f.name.trim(),
    email: f.email.trim() || null,
    education: f.education.trim(),
    skills: f.skills.map((s) => ({ ...s, skill_name: s.skill_name.trim() })),
    projects: f.projects.map(entryFromForm),
    internships: f.internships.map(entryFromForm),
    hackathons: f.hackathons.map(entryFromForm),
    certifications: f.certifications.map(entryFromForm),
    preferred_roles: f.preferred_roles.split(",").map((r) => r.trim()).filter(Boolean),
    cv_file: f.cv_file,
  }
}
