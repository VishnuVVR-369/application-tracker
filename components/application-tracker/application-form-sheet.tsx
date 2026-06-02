"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { Save } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  APPLICATION_STAGES,
  APPLICATION_TYPE_LABELS,
  APPLICATION_TYPES,
  REFERRAL_LABELS,
  REFERRAL_STATUSES,
  SOURCE_LABELS,
  SOURCES,
  STAGE_LABELS,
  WORK_ARRANGEMENT_LABELS,
  WORK_ARRANGEMENTS,
  type ApplicationStage,
} from "@/lib/application-model"

type ApplicationFormSheetProps = {
  trigger?: React.ReactNode
  resumes: Doc<"resumes">[]
  application?: Doc<"applications">
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== "" && entry[1] !== undefined)
  ) as T
}

function optionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function trimmedValue(value: string) {
  return value.trim()
}

function buildInitialForm(application?: Doc<"applications">) {
  return {
    companyName: application?.companyName ?? "",
    roleTitle: application?.roleTitle ?? "",
    companyWebsite: application?.companyWebsite ?? "",
    location: application?.location ?? "",
    workArrangement: application?.workArrangement ?? "",
    compensationMin: application?.compensationMin?.toString() ?? "",
    compensationMax: application?.compensationMax?.toString() ?? "",
    compensationCurrency: application?.compensationCurrency ?? "USD",
    postingUrl: application?.postingUrl ?? "",
    source: application?.source ?? "",
    sourceDetail: application?.sourceDetail ?? "",
    dateAppliedDate: application?.dateAppliedDate ?? "",
    stage: application?.stage ?? ("saved" as ApplicationStage),
    referralStatus: application?.referralStatus ?? "not_checked",
    applicationType: application?.applicationType ?? "",
    currentResumeId: application?.currentResumeId ?? "",
    applicationDeadlineDate: application?.applicationDeadlineDate ?? "",
    takeHomeDeadlineDate: application?.takeHomeDeadlineDate ?? "",
    offerResponseDeadlineDate: application?.offerResponseDeadlineDate ?? "",
    jobDescriptionSnapshot: application?.jobDescriptionSnapshot ?? "",
    notes: application?.notes ?? "",
  }
}

export function ApplicationFormSheet({
  trigger,
  resumes,
  application,
  open: controlledOpen,
  onOpenChange,
}: ApplicationFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const createApplication = useMutation(api.applications.create)
  const updateApplication = useMutation(api.applications.update)
  const [pending, setPending] = React.useState(false)
  const [formError, setFormError] = React.useState("")
  const [form, setForm] = React.useState(() => buildInitialForm(application))

  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setForm(buildInitialForm(application))
      setFormError("")
    }
    setOpen(nextOpen)
  }

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFormError("")
    const companyName = trimmedValue(form.companyName)
    const roleTitle = trimmedValue(form.roleTitle)

    if (!companyName || !roleTitle) {
      setFormError("Company and role are required.")
      setPending(false)
      return
    }

    const payload = compact({
      companyName,
      roleTitle,
      companyWebsite: trimmedValue(form.companyWebsite),
      location: trimmedValue(form.location),
      workArrangement: form.workArrangement,
      compensationMin: optionalNumber(form.compensationMin),
      compensationMax: optionalNumber(form.compensationMax),
      compensationCurrency: trimmedValue(form.compensationCurrency).toUpperCase() || undefined,
      postingUrl: trimmedValue(form.postingUrl),
      source: form.source,
      sourceDetail: trimmedValue(form.sourceDetail),
      dateAppliedDate: form.dateAppliedDate,
      stage: form.stage,
      referralStatus: form.referralStatus,
      applicationType: form.applicationType,
      currentResumeId: form.currentResumeId ? (form.currentResumeId as Id<"resumes">) : undefined,
      applicationDeadlineDate: form.applicationDeadlineDate,
      takeHomeDeadlineDate: form.takeHomeDeadlineDate,
      offerResponseDeadlineDate: form.offerResponseDeadlineDate,
      jobDescriptionSnapshot: trimmedValue(form.jobDescriptionSnapshot),
      notes: trimmedValue(form.notes),
    }) as Parameters<typeof createApplication>[0]

    try {
      if (application) {
        await updateApplication({
          id: application._id,
          ...payload,
        } as Parameters<typeof updateApplication>[0])
      } else {
        await createApplication(payload)
        setForm(buildInitialForm())
      }
      setOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save application")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{application ? "Edit application" : "New application"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          <SectionLabel>Basics</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company">
              <Input
                required
                value={form.companyName}
                onChange={(event) => updateField("companyName", event.target.value)}
              />
            </Field>
            <Field label="Role">
              <Input
                required
                value={form.roleTitle}
                onChange={(event) => updateField("roleTitle", event.target.value)}
              />
            </Field>
          </div>

          <SectionLabel>Pipeline</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Stage">
              <Select value={form.stage} onChange={(value) => updateField("stage", value)}>
                {APPLICATION_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Linked resume">
              <Select value={form.currentResumeId} onChange={(value) => updateField("currentResumeId", value)}>
                <option value="">Use default resume</option>
                {resumes
                  .filter((resume) => !resume.archived)
                  .map((resume) => (
                    <option key={resume._id} value={resume._id}>
                      {resume.label}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>

          <SectionLabel>Logistics &amp; compensation</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
              />
            </Field>
            <Field label="Work arrangement">
              <Select
                value={form.workArrangement}
                onChange={(value) => updateField("workArrangement", value)}
              >
                <option value="">Not set</option>
                {WORK_ARRANGEMENTS.map((value) => (
                  <option key={value} value={value}>
                    {WORK_ARRANGEMENT_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Comp min">
              <Input
                type="number"
                value={form.compensationMin}
                onChange={(event) => updateField("compensationMin", event.target.value)}
              />
            </Field>
            <Field label="Comp max">
              <Input
                type="number"
                value={form.compensationMax}
                onChange={(event) => updateField("compensationMax", event.target.value)}
              />
            </Field>
            <Field label="Currency">
              <Input
                value={form.compensationCurrency}
                onChange={(event) => updateField("compensationCurrency", event.target.value)}
              />
            </Field>
          </div>

          <Field label="Company website">
            <Input
              type="url"
              value={form.companyWebsite}
              onChange={(event) => updateField("companyWebsite", event.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Source">
              <Select value={form.source} onChange={(value) => updateField("source", value)}>
                <option value="">Not set</option>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {SOURCE_LABELS[source]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Referral">
              <Select
                value={form.referralStatus}
                onChange={(value) => updateField("referralStatus", value)}
              >
                {REFERRAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {REFERRAL_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Application type">
              <Select
                value={form.applicationType}
                onChange={(value) => updateField("applicationType", value)}
              >
                <option value="">Not set</option>
                {APPLICATION_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {APPLICATION_TYPE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date applied">
              <Input
                type="date"
                value={form.dateAppliedDate}
                onChange={(event) => updateField("dateAppliedDate", event.target.value)}
              />
            </Field>
          </div>

          <Field label="Posting URL">
            <Input
              type="url"
              value={form.postingUrl}
              onChange={(event) => updateField("postingUrl", event.target.value)}
            />
          </Field>

          <SectionLabel>Deadlines</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Apply by">
              <Input
                type="date"
                value={form.applicationDeadlineDate}
                onChange={(event) => updateField("applicationDeadlineDate", event.target.value)}
              />
            </Field>
            <Field label="Take-home by">
              <Input
                type="date"
                value={form.takeHomeDeadlineDate}
                onChange={(event) => updateField("takeHomeDeadlineDate", event.target.value)}
              />
            </Field>
            <Field label="Offer response by">
              <Input
                type="date"
                value={form.offerResponseDeadlineDate}
                onChange={(event) => updateField("offerResponseDeadlineDate", event.target.value)}
              />
            </Field>
          </div>

          <SectionLabel>Content</SectionLabel>
          <Field label="Job description snapshot">
            <Textarea
              value={form.jobDescriptionSnapshot}
              onChange={(event) => updateField("jobDescriptionSnapshot", event.target.value)}
            />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </Field>

          {formError && (
            <p className="rounded-md border border-status-down/30 bg-status-down/10 px-3 py-2 text-sm text-status-down">
              {formError}
            </p>
          )}

          <SheetFooter className="-mx-4 -mb-4 mt-2 flex-row justify-end gap-2 border-t border-line/70 bg-surface-1/40 px-4">
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending ? "Saving…" : "Save application"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border border-line bg-surface-1 px-2 text-sm text-ink-100 outline-none transition-colors hover:border-line-strong focus:ring-3 focus:ring-ring/50"
    >
      {children}
    </select>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="micro-label mt-2 flex items-center gap-2 first:mt-0">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </p>
  )
}
