import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"

import { AppShell, NextStep, PageHeading } from "@/components/app/AppShell"
import { FileDrop } from "@/components/app/FileDrop"
import { ErrorPanel, LoadingState } from "@/components/app/StateViews"
import { EntriesEditor } from "@/components/profile/EntriesEditor"
import { Field, FormSection, inputClass } from "@/components/profile/fields"
import { SkillsEditor } from "@/components/profile/SkillsEditor"
import { Button } from "@/components/ui/button"
import { api, ApiError, type ProfileSummary } from "@/lib/api"
import { useFlow } from "@/lib/flowState"
import { labelClass, primaryButton } from "@/lib/steps"
import { fromForm, profileSchema, toForm, type ProfileForm } from "@/lib/profileForm"

type Load = { status: "loading" } | { status: "ready"; note?: string } | { status: "error"; message: string }

const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Unexpected error. Check the backend logs.")

export default function Profile() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { flow, update } = useFlow()
  // URL first, then the flow state; ?new starts an empty profile.
  const isNew = params.has("new")
  const profileId = params.get("id") ?? (isNew || params.has("from") ? null : (flow.profileId ?? null))
  const fromId = params.get("from") ?? (isNew ? null : (flow.resumeExtractionId ?? null)) // resume extraction to pre-fill or merge from
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), defaultValues: toForm(), mode: "onBlur" })
  const { register, handleSubmit, reset, setValue, control, formState } = form
  // Loading is derived: the stored result belongs to one URL; a different URL means "loading".
  const loadKey = `${profileId ?? ""}|${fromId ?? ""}`
  const [loaded, setLoaded] = useState<{ key: string; load: Load }>({ key: "", load: { status: "loading" } })
  const load: Load = loaded.key === loadKey ? loaded.load : { status: "loading" }
  const [saving, setSaving] = useState(false)
  const [merging, setMerging] = useState(false)
  const [saved, setSaved] = useState<ProfileSummary[]>([])

  useEffect(() => {
    api.profiles().then(setSaved, () => setSaved([]))
  }, [profileId])

  useEffect(() => {
    let cancelled = false
    const job = profileId
      ? api.profile(profileId).then((p) => ({ profile: p, note: undefined }))
      : fromId
        ? api.profileDraft(fromId).then((p) => ({ profile: p, note: "Pre-filled from the parsed resume. Check every field, then save." }))
        : Promise.resolve({ profile: undefined, note: undefined })
    job.then(
      ({ profile, note }) => {
        if (cancelled) return
        reset(toForm(profile))
        setLoaded({ key: loadKey, load: { status: "ready", note } })
      },
      (e) => !cancelled && setLoaded({ key: loadKey, load: { status: "error", message: errorMessage(e) } }),
    )
    return () => {
      cancelled = true
    }
  }, [profileId, fromId, loadKey, reset])

  async function onSubmit(values: ProfileForm) {
    setSaving(true)
    try {
      const body = fromForm(values)
      const result = profileId ? await api.updateProfile(profileId, body) : await api.createProfile(body, fromId ?? undefined)
      reset(toForm(result))
      toast.success("Profile saved")
      // Saved changes make earlier Talent Check / Skill Match results stale.
      update({ profileId: result.id ?? undefined, talentCheckDone: false, skillMatchDone: false })
      if (!profileId && result.id) setParams({ id: result.id })
    } catch (e) {
      toast.error(`Save profile failed: ${errorMessage(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function mergeResume() {
    if (!profileId || !fromId) return
    setMerging(true)
    try {
      const merged = await api.profileDraft(fromId, profileId)
      reset(toForm(merged), { keepDefaultValues: true }) // stays "unsaved" until Save profile
      toast.success("Resume merged into the form. Review it, then save profile.")
    } catch (e) {
      toast.error(`Merge failed: ${errorMessage(e)}`)
    } finally {
      setMerging(false)
    }
  }

  async function uploadCv(file: File) {
    try {
      const { cv_file } = await api.uploadCv(file)
      setValue("cv_file", cv_file, { shouldDirty: true })
      toast.success("CV uploaded. Save profile to keep it.")
    } catch (e) {
      toast.error(`CV upload failed: ${errorMessage(e)}`)
    }
  }

  const cvFile = useWatch({ control, name: "cv_file" })
  const errors = formState.errors

  return (
    <AppShell>
      <PageHeading
        title={profileId ? "Edit profile" : "Build a profile"}
        description="Everything here feeds Talent Check and Skill Matching. Link each project, internship and hackathon to the skills it used: experience counts for more than a skills list."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="saved-profile" className={labelClass}>Saved profiles</label>
          <select
            id="saved-profile"
            className={inputClass}
            value={profileId ?? ""}
            onChange={(e) => {
              if (e.target.value) {
                update({ profileId: e.target.value, talentCheckDone: false, skillMatchDone: false })
                navigate(`/profile?id=${e.target.value}`)
              } else navigate("/profile?new=1")
            }}
          >
            <option value="">{saved.length ? "New profile" : "No saved profiles yet"}</option>
            {saved.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.email ? ` (${p.email})` : ""}
              </option>
            ))}
          </select>
        </div>
        {profileId && fromId && (
          <Button type="button" variant="outline" disabled={merging || load.status !== "ready"} onClick={mergeResume} className="h-11 rounded-xl px-4">
            {merging ? "Merging…" : "Merge parsed resume"}
          </Button>
        )}
      </div>

      {load.status === "loading" && <LoadingState label="Loading profile…" />}
      {load.status === "error" && <ErrorPanel title="Could not load the profile" message={load.message} />}
      {load.status === "ready" && (
        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit, () => toast.error("Fix the highlighted fields, then save profile."))} noValidate className="space-y-6">
            {load.note && <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-ink">{load.note}</p>}
            {!profileId && !fromId && (
              <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-soft">
                Starting from scratch. To pre-fill this form, parse a resume first and choose “Build profile from this resume”.
              </p>
            )}

            <FormSection title="Basic details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="name" label="Name" error={errors.name?.message}>
                  <input id="name" autoComplete="name" className={inputClass} aria-invalid={!!errors.name} {...register("name")} />
                </Field>
                <Field id="email" label="Email" hint="Optional. Each saved profile needs a different email." error={errors.email?.message}>
                  <input id="email" type="email" autoComplete="email" className={inputClass} aria-invalid={!!errors.email} {...register("email")} />
                </Field>
                <div className="sm:col-span-2">
                  <Field id="education" label="Education">
                    <input id="education" className={inputClass} {...register("education")} />
                  </Field>
                </div>
              </div>
            </FormSection>

            <SkillsEditor />
            <EntriesEditor group="projects" title="Projects" singular="project" description="Things the candidate built." />
            <EntriesEditor group="internships" title="Internships" singular="internship" description="Work experience counts most in Talent Check." showDuration />
            <EntriesEditor group="hackathons" title="Hackathons" singular="hackathon" description="Competitions and hackathons." />
            <EntriesEditor group="certifications" title="Certifications" singular="certification" description="Courses and certificates." />

            <FormSection title="Preferred roles and CV">
              <div className="space-y-4">
                <Field id="roles" label="Preferred roles" hint="Separate roles with commas, e.g. Data Analyst, Data Scientist.">
                  <input id="roles" className={inputClass} {...register("preferred_roles")} />
                </Field>
                <div>
                  <p className={labelClass}>CV</p>
                  {cvFile && <p className="mb-2 text-sm text-ink-soft">Stored: {cvFile.split("/").pop()}</p>}
                  <FileDrop onFile={uploadCv} disabled={saving} />
                </div>
              </div>
            </FormSection>

            <div className="sticky bottom-4 z-20 flex items-center justify-end gap-3 rounded-2xl border border-line bg-surface/90 p-3 shadow-[0_16px_40px_-20px_rgb(31_86_224/0.5)] backdrop-blur-md">
              <span className="text-sm text-ink-muted">{formState.isDirty ? "Unsaved changes" : profileId ? "All changes saved" : ""}</span>
              <Button type="submit" disabled={saving} className={primaryButton}>
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </div>
            {profileId && !formState.isDirty && <NextStep to="/talent-check" label="Next: run Talent Check" />}
          </form>
        </FormProvider>
      )}
    </AppShell>
  )
}
