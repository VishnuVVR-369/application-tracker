"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { ChevronDown, ChevronUp, Save } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { Field, FormError, NativeSelect, SectionLabel } from "./form-kit"

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
  const [showDetails, setShowDetails] = React.useState(Boolean(application))

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
      setShowDetails(Boolean(application))
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-line/70 px-4 py-3 pr-12">
          <DialogTitle>{application ? "Edit application" : "Quick capture"}</DialogTitle>
          <DialogDescription className="sr-only">
            {application
              ? "Update the details for this application."
              : "Add the posting URL, company, role, and pipeline stage, with optional additional details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid min-h-0 gap-4 overflow-y-auto px-4 pb-4 pt-3">
          <SectionLabel>{application ? "Basics" : "Start with the essentials"}</SectionLabel>
          <Field label="Posting URL" hint="Optional">
            <Input
              type="url"
              autoFocus={!application}
              placeholder="https://company.com/jobs/…"
              value={form.postingUrl}
              onChange={(event) => updateField("postingUrl", event.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company">
              <Input
                required
                placeholder="Company name"
                value={form.companyName}
                onChange={(event) => updateField("companyName", event.target.value)}
              />
            </Field>
            <Field label="Role">
              <Input
                required
                placeholder="Role title"
                value={form.roleTitle}
                onChange={(event) => updateField("roleTitle", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Stage">
            <NativeSelect value={form.stage} onChange={(value) => updateField("stage", value)}>
              {APPLICATION_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {!application && (
            <Button
              type="button"
              variant="secondary"
              aria-expanded={showDetails}
              aria-controls="application-extra-details"
              onClick={() => setShowDetails((current) => !current)}
              className="w-full justify-between"
            >
              {showDetails ? "Hide details" : "Add details"}
              {showDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          )}

          {showDetails && (
            <div id="application-extra-details" className="grid gap-4">
              <SectionLabel>Pipeline details</SectionLabel>
              <Field label="Linked resume">
                <NativeSelect
                  value={form.currentResumeId}
                  onChange={(value) => updateField("currentResumeId", value)}
                >
                  <option value="">Use default resume</option>
                  {resumes
                    .filter((resume) => !resume.archived)
                    .map((resume) => (
                      <option key={resume._id} value={resume._id}>
                        {resume.label}
                      </option>
                    ))}
                </NativeSelect>
              </Field>

              <SectionLabel>Logistics &amp; compensation</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Location">
                  <Input
                    value={form.location}
                    onChange={(event) => updateField("location", event.target.value)}
                  />
                </Field>
                <Field label="Work arrangement">
                  <NativeSelect
                    value={form.workArrangement}
                    onChange={(value) => updateField("workArrangement", value)}
                  >
                    <option value="">Not set</option>
                    {WORK_ARRANGEMENTS.map((value) => (
                      <option key={value} value={value}>
                        {WORK_ARRANGEMENT_LABELS[value]}
                      </option>
                    ))}
                  </NativeSelect>
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
                  <NativeSelect value={form.source} onChange={(value) => updateField("source", value)}>
                    <option value="">Not set</option>
                    {SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {SOURCE_LABELS[source]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Referral">
                  <NativeSelect value={form.referralStatus} onChange={(value) => updateField("referralStatus", value)}>
                    {REFERRAL_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {REFERRAL_LABELS[status]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Application type">
                  <NativeSelect
                    value={form.applicationType}
                    onChange={(value) => updateField("applicationType", value)}
                  >
                    <option value="">Not set</option>
                    {APPLICATION_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {APPLICATION_TYPE_LABELS[value]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Date applied">
                  <Input
                    type="date"
                    value={form.dateAppliedDate}
                    onChange={(event) => updateField("dateAppliedDate", event.target.value)}
                  />
                </Field>
              </div>

              <SectionLabel>Deadlines</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Apply by">
                  <Input
                    type="date"
                    value={form.applicationDeadlineDate}
                    onChange={(event) =>
                      updateField("applicationDeadlineDate", event.target.value)
                    }
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
                    onChange={(event) =>
                      updateField("offerResponseDeadlineDate", event.target.value)
                    }
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
            </div>
          )}

          <FormError message={formError} />

          <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 mt-2 flex-row justify-end gap-2 border-t border-line/70 bg-surface-1/95 px-4 supports-backdrop-filter:backdrop-blur-sm">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending ? "Saving…" : application ? "Save application" : "Add application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
