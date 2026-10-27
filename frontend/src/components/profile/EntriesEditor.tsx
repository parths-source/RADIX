import { Plus, Trash2 } from "lucide-react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"

import { Field, FormSection, inputClass, SmallButton } from "@/components/profile/fields"
import { emptyEntry, type EntryGroup, type ProfileForm } from "@/lib/profileForm"

const nameKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()

/** One list of entries (projects, internships, hackathons or certifications) with a skills_used picker. */
export function EntriesEditor({ group, title, description, singular, showDuration = false }: {
  group: EntryGroup
  title: string
  description: string
  singular: string
  showDuration?: boolean
}) {
  const { control, register, formState } = useFormContext<ProfileForm>()
  const { fields, append, remove } = useFieldArray({ control, name: group })
  const errors = formState.errors[group]

  return (
    <FormSection
      title={title}
      description={description}
      action={
        <SmallButton onClick={() => append(emptyEntry())}>
          <Plus className="size-4" aria-hidden /> Add {singular}
        </SmallButton>
      }
    >
      {fields.length === 0 ? (
        <p className="text-sm text-mist/60">None yet.</p>
      ) : (
        <ul className="space-y-4">
          {fields.map((field, i) => (
            <li key={field.id} className="space-y-3 rounded-xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Field id={`${group}-${i}-title`} label={`${singular[0].toUpperCase()}${singular.slice(1)} title`} error={errors?.[i]?.title?.message}>
                    <input id={`${group}-${i}-title`} className={inputClass} aria-invalid={!!errors?.[i]?.title} {...register(`${group}.${i}.title`)} />
                  </Field>
                </div>
                <div className="pt-7">
                  <SmallButton tone="danger" onClick={() => remove(i)} label={`Remove ${singular} ${i + 1}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </SmallButton>
                </div>
              </div>
              <Field id={`${group}-${i}-description`} label="Description">
                <textarea id={`${group}-${i}-description`} rows={2} className={inputClass} {...register(`${group}.${i}.description`)} />
              </Field>
              {showDuration && (
                <Field id={`${group}-${i}-duration`} label="Duration (months)" hint="Leave empty if the resume does not say." error={errors?.[i]?.duration?.message}>
                  <input id={`${group}-${i}-duration`} inputMode="numeric" className={`${inputClass} sm:w-32`} aria-invalid={!!errors?.[i]?.duration} {...register(`${group}.${i}.duration`)} />
                </Field>
              )}
              <SkillsUsedPicker group={group} index={i} error={errors?.[i]?.skills_used?.message} />
            </li>
          ))}
        </ul>
      )}
    </FormSection>
  )
}

function SkillsUsedPicker({ group, index, error }: { group: EntryGroup; index: number; error?: string }) {
  const { control, setValue } = useFormContext<ProfileForm>()
  const skills = useWatch({ control, name: "skills" })
  const used = useWatch({ control, name: `${group}.${index}.skills_used` }) ?? []
  const names = skills.map((s) => s.skill_name.trim()).filter(Boolean)
  const usedKeys = new Set(used.map(nameKey))
  const unknown = used.filter((u) => !names.some((n) => nameKey(n) === nameKey(u)))

  function toggle(name: string) {
    const next = usedKeys.has(nameKey(name)) ? used.filter((u) => nameKey(u) !== nameKey(name)) : [...used, name]
    setValue(`${group}.${index}.skills_used`, next, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-mist">Skills used</legend>
      {names.length === 0 ? (
        <p className="text-xs text-mist/50">Add skills above first, then pick the ones used here.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {names.map((name) => {
            const on = usedKeys.has(nameKey(name))
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(name)}
                className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-cyan focus-visible:outline-none ${
                  on ? "border-cyan bg-cyan/20 text-mist" : "border-white/15 text-mist/60 hover:bg-white/10"
                }`}
              >
                {name}
              </button>
            )
          })}
          {unknown.map((name) => (
            <button key={name} type="button" onClick={() => toggle(name)} className="rounded-full border border-danger/50 px-3 py-1 text-xs text-danger" title="Not in the skills list. Click to remove.">
              {name} ×
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </fieldset>
  )
}
