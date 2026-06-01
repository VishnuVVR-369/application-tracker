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
  trigger: React.ReactNode
  resumes: Doc<"resumes">[]
  application?: Doc<"applications">
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== "" && entry[1] !== undefined)
  ) as T
}

export function ApplicationFormSheet({
  trigger,
  resumes,
  application,
}: ApplicationFormSheetProps) {
  const [open, setOpen] = React.useState(false)
  const createApplication = useMutation(api.applications.create)
  const updateApplication = useMutation(api.applications.update)
  const [pending, setPending] = React.useState(false)
  const [form, setForm] = React.useState({
    companyName: application?.companyName ?? "",
    roleTitle: application?.roleTitle ?? "",
    location: application?.location ?? "",
    workArrangement: application?.workArrangement ?? "",
    salaryMin: application?.salaryMin?.toString() ?? "",
    salaryMax: application?.salaryMax?.toString() ?? "",
    currency: application?.currency ?? "USD",
    postingUrl: application?.postingUrl ?? "",
    source: application?.source ?? "",
    dateApplied: application?.dateApplied ?? "",
    stage: application?.stage ?? ("saved" as ApplicationStage),
    referralStatus: application?.referralStatus ?? "not_checked",
    applicationType: application?.applicationType ?? "",
    resumeId: application?.resumeId ?? "",
    applicationDeadlineAt: application?.applicationDeadlineAt?.slice(0, 10) ?? "",
    takeHomeDeadlineAt: application?.takeHomeDeadlineAt?.slice(0, 10) ?? "",
    offerResponseDeadlineAt: application?.offerResponseDeadlineAt?.slice(0, 10) ?? "",
    offerComp: application?.offerComp ?? "",
    offerDecision: application?.offerDecision ?? "",
    jobDescriptionSnapshot: application?.jobDescriptionSnapshot ?? "",
    notes: application?.notes ?? "",
  })

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)

    const payload = compact({
      companyName: form.companyName,
      roleTitle: form.roleTitle,
      location: form.location,
      workArrangement: form.workArrangement,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      currency: form.currency,
      postingUrl: form.postingUrl,
      source: form.source,
      dateApplied: form.dateApplied,
      stage: form.stage,
      referralStatus: form.referralStatus,
      applicationType: form.applicationType,
      resumeId: form.resumeId ? (form.resumeId as Id<"resumes">) : undefined,
      applicationDeadlineAt: form.applicationDeadlineAt
        ? new Date(`${form.applicationDeadlineAt}T12:00:00`).toISOString()
        : undefined,
      takeHomeDeadlineAt: form.takeHomeDeadlineAt
        ? new Date(`${form.takeHomeDeadlineAt}T12:00:00`).toISOString()
        : undefined,
      offerResponseDeadlineAt: form.offerResponseDeadlineAt
        ? new Date(`${form.offerResponseDeadlineAt}T12:00:00`).toISOString()
        : undefined,
      offerComp: form.offerComp,
      offerDecision: form.offerDecision,
      jobDescriptionSnapshot: form.jobDescriptionSnapshot,
      notes: form.notes,
    }) as Parameters<typeof createApplication>[0]

    try {
      if (application) {
        await updateApplication({
          id: application._id,
          ...payload,
        } as Parameters<typeof updateApplication>[0])
      } else {
        await createApplication(payload)
      }
      setOpen(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{application ? "Edit application" : "New application"}</SheetTitle>
          <SheetDescription>
            Keep the application as the source of truth for stage, resume, quality, deadlines,
            and outcomes.
          </SheetDescription>
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
              <Select value={form.resumeId} onChange={(value) => updateField("resumeId", value)}>
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
            <Field label="Salary min">
              <Input
                type="number"
                value={form.salaryMin}
                onChange={(event) => updateField("salaryMin", event.target.value)}
              />
            </Field>
            <Field label="Salary max">
              <Input
                type="number"
                value={form.salaryMax}
                onChange={(event) => updateField("salaryMax", event.target.value)}
              />
            </Field>
            <Field label="Currency">
              <Input
                value={form.currency}
                onChange={(event) => updateField("currency", event.target.value)}
              />
            </Field>
          </div>

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
                value={form.dateApplied}
                onChange={(event) => updateField("dateApplied", event.target.value)}
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
                value={form.applicationDeadlineAt}
                onChange={(event) => updateField("applicationDeadlineAt", event.target.value)}
              />
            </Field>
            <Field label="Take-home by">
              <Input
                type="date"
                value={form.takeHomeDeadlineAt}
                onChange={(event) => updateField("takeHomeDeadlineAt", event.target.value)}
              />
            </Field>
            <Field label="Offer response by">
              <Input
                type="date"
                value={form.offerResponseDeadlineAt}
                onChange={(event) => updateField("offerResponseDeadlineAt", event.target.value)}
              />
            </Field>
          </div>

          <SectionLabel>Offer</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Offer comp">
              <Input
                value={form.offerComp}
                onChange={(event) => updateField("offerComp", event.target.value)}
              />
            </Field>
            <Field label="Offer decision">
              <Select
                value={form.offerDecision}
                onChange={(value) => updateField("offerDecision", value)}
              >
                <option value="">Not set</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="negotiating">Negotiating</option>
              </Select>
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
