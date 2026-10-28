import { Plus, Trash2 } from "lucide-react"
import { useFieldArray, useFormContext } from "react-hook-form"

import { Field, FormSection, inputClass, SmallButton } from "@/components/profile/fields"
import { CATEGORIES } from "@/lib/categories"
import { ENTRY_GROUPS, type ProfileForm } from "@/lib/profileForm"

export function SkillsEditor() {
  const { control, register, getValues, setValue, formState } = useFormContext<ProfileForm>()
  const { fields, append, remove } = useFieldArray({ control, name: "skills" })
  const errors = formState.errors.skills

  function removeSkill(index: number) {
    // Also drop the skill from every entry's skills_used so the profile stays valid.
    const name = getValues(`skills.${index}.skill_name`).trim().toLowerCase()
    for (const group of ENTRY_GROUPS) {
      getValues(group).forEach((entry, i) => {
        const kept = entry.skills_used.filter((s) => s.trim().toLowerCase() !== name)
        if (kept.length !== entry.skills_used.length) setValue(`${group}.${i}.skills_used`, kept, { shouldDirty: true })
      })
    }
    remove(index)
  }

  return (
    <FormSection
      title="Skills"
      description="Each skill belongs to one of the 12 skillsets. Confidence is how strongly the resume supports it."
      action={
        <SmallButton onClick={() => append({ skill_name: "", category_code: "COD", confidence: "medium", evidence: "Added in profile" })}>
          <Plus className="size-4" aria-hidden /> Add skill
        </SmallButton>
      }
    >
      {fields.length === 0 ? (
        <p className="text-sm text-ink-muted">No skills yet. Add them here, or build the profile from a parsed resume.</p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, i) => (
            <li key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-start">
              <Field id={`skill-${i}-name`} label={`Skill ${i + 1}`} error={errors?.[i]?.skill_name?.message}>
                <input id={`skill-${i}-name`} className={inputClass} aria-invalid={!!errors?.[i]?.skill_name} {...register(`skills.${i}.skill_name`)} />
              </Field>
              <Field id={`skill-${i}-category`} label="Skillset">
                <select id={`skill-${i}-category`} className={inputClass} {...register(`skills.${i}.category_code`)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id={`skill-${i}-confidence`} label="Confidence">
                <select id={`skill-${i}-confidence`} className={inputClass} {...register(`skills.${i}.confidence`)}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </Field>
              <div className="sm:pt-7">
                <SmallButton tone="danger" onClick={() => removeSkill(i)} label={`Remove skill ${i + 1}`}>
                  <Trash2 className="size-4" aria-hidden />
                </SmallButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {errors?.root?.message && <p className="mt-2 text-xs text-danger-ink">{errors.root.message}</p>}
    </FormSection>
  )
}
