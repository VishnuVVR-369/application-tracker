"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { Save } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  REFERRAL_OUTREACH_SOURCE_LABELS,
  REFERRAL_OUTREACH_SOURCES,
  REFERRAL_OUTREACH_STATUS_LABELS,
  REFERRAL_OUTREACH_STATUSES,
  type ReferralOutreachSource,
  type ReferralOutreachStatus,
} from "@/lib/application-model"
import { Field, FormError, SectionLabel } from "./form-kit"
import { OptionalSelect, RequiredSelect } from "./target-form-sheet"

type OutreachFormSheetProps = {
  trigger?: React.ReactNode
  outreach?: Doc<"referralOutreach">
  targets: Doc<"targetCompanies">[]
  applications: Doc<"applications">[]
  defaultTargetCompanyId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function trimmed(value: string) {
  return value.trim()
}

function buildInitialForm(outreach?: Doc<"referralOutreach">, defaultTargetCompanyId?: string) {
  return {
    targetCompanyId: outreach?.targetCompanyId ?? defaultTargetCompanyId ?? "",
    applicationId: outreach?.applicationId ?? "",
    contactName: outreach?.contactName ?? "",
    contactRole: outreach?.contactRole ?? "",
    source: outreach?.source ?? ("linkedin" as ReferralOutreachSource),
    status: outreach?.status ?? ("not_contacted" as ReferralOutreachStatus),
    linkedinUrl: outreach?.linkedinUrl ?? "",
    email: outreach?.email ?? "",
    firstContactedDate: outreach?.firstContactedDate ?? "",
    lastContactedDate: outreach?.lastContactedDate ?? "",
    followUpDate: outreach?.followUpDate ?? "",
    messageTemplate: outreach?.messageTemplate ?? "",
    notes: outreach?.notes ?? "",
  }
}

export function OutreachFormSheet({
  trigger,
  outreach,
  targets,
  applications,
  defaultTargetCompanyId,
  open: controlledOpen,
  onOpenChange,
}: OutreachFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const createOutreach = useMutation(api.targets.createOutreach)
  const updateOutreach = useMutation(api.targets.updateOutreach)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")
  const [form, setForm] = React.useState(() => buildInitialForm(outreach, defaultTargetCompanyId))

  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(buildInitialForm(outreach, defaultTargetCompanyId))
      setError("")
    }
    setOpen(next)
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const contactName = trimmed(form.contactName)
    if (!contactName) {
      setError("Contact name is required.")
      return
    }
    setPending(true)
    setError("")

    const payload = {
      contactName,
      source: form.source,
      status: form.status,
      targetCompanyId: form.targetCompanyId ? (form.targetCompanyId as Id<"targetCompanies">) : undefined,
      applicationId: form.applicationId ? (form.applicationId as Id<"applications">) : undefined,
      contactRole: trimmed(form.contactRole) || undefined,
      linkedinUrl: trimmed(form.linkedinUrl) || undefined,
      email: trimmed(form.email) || undefined,
      firstContactedDate: form.firstContactedDate || undefined,
      lastContactedDate: form.lastContactedDate || undefined,
      followUpDate: form.followUpDate || undefined,
      messageTemplate: trimmed(form.messageTemplate) || undefined,
      notes: trimmed(form.notes) || undefined,
    }

    try {
      if (outreach) {
        await updateOutreach({
          id: outreach._id as Id<"referralOutreach">,
          ...payload,
          targetCompanyId: payload.targetCompanyId ?? null,
          applicationId: payload.applicationId ?? null,
          contactRole: payload.contactRole ?? null,
          linkedinUrl: payload.linkedinUrl ?? null,
          email: payload.email ?? null,
          firstContactedDate: payload.firstContactedDate ?? null,
          lastContactedDate: payload.lastContactedDate ?? null,
          followUpDate: payload.followUpDate ?? null,
          messageTemplate: payload.messageTemplate ?? null,
          notes: payload.notes ?? null,
        })
        toast.success(`${contactName} updated`)
      } else {
        await createOutreach(payload)
        toast.success(`${contactName} added to your referral pipeline`)
      }
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save referral lead")
    } finally {
      setPending(false)
    }
  }

  const activeTargets = targets.filter((target) => !target.archived)
  const activeApplications = applications.filter((application) => !application.archived)

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{outreach ? "Edit referral lead" : "Log outreach"}</SheetTitle>
          <SheetDescription>
            Track a contact through the referral funnel — messaged, replied, call booked, referred.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          <SectionLabel>Contact</SectionLabel>
          <Field label="Contact name">
            <Input value={form.contactName} onChange={(event) => update("contactName", event.target.value)} required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role" hint="optional">
              <Input value={form.contactRole} onChange={(event) => update("contactRole", event.target.value)} />
            </Field>
            <Field label="Source">
              <RequiredSelect
                value={form.source}
                onChange={(value) => update("source", value)}
                options={REFERRAL_OUTREACH_SOURCES.map((source) => ({
                  value: source,
                  label: REFERRAL_OUTREACH_SOURCE_LABELS[source],
                }))}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="LinkedIn" hint="optional">
              <Input type="url" value={form.linkedinUrl} onChange={(event) => update("linkedinUrl", event.target.value)} placeholder="https://" />
            </Field>
            <Field label="Email" hint="optional">
              <Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
            </Field>
          </div>

          <SectionLabel>Pipeline</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <RequiredSelect
                value={form.status}
                onChange={(value) => update("status", value)}
                options={REFERRAL_OUTREACH_STATUSES.map((status) => ({
                  value: status,
                  label: REFERRAL_OUTREACH_STATUS_LABELS[status],
                }))}
              />
            </Field>
            <Field label="Follow-up date" hint="optional">
              <Input type="date" value={form.followUpDate} onChange={(event) => update("followUpDate", event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First contacted" hint="optional">
              <Input type="date" value={form.firstContactedDate} onChange={(event) => update("firstContactedDate", event.target.value)} />
            </Field>
            <Field label="Last contacted" hint="optional">
              <Input type="date" value={form.lastContactedDate} onChange={(event) => update("lastContactedDate", event.target.value)} />
            </Field>
          </div>

          <SectionLabel>Links</SectionLabel>
          <Field label="Target company" hint="optional">
            <OptionalSelect
              value={form.targetCompanyId}
              onChange={(value) => update("targetCompanyId", value)}
              placeholder="Unassigned"
              options={activeTargets.map((target) => ({ value: target._id, label: target.companyName }))}
            />
          </Field>
          <Field label="Application" hint="optional">
            <OptionalSelect
              value={form.applicationId}
              onChange={(value) => update("applicationId", value)}
              placeholder="No application"
              options={activeApplications.map((application) => ({
                value: application._id,
                label: `${application.companyName} · ${application.roleTitle}`,
              }))}
            />
          </Field>

          <SectionLabel>Notes</SectionLabel>
          <Field label="Message template" hint="optional">
            <Textarea value={form.messageTemplate} onChange={(event) => update("messageTemplate", event.target.value)} />
          </Field>
          <Field label="Notes" hint="optional">
            <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>

          <FormError message={error} />

          <SheetFooter className="-mx-4 -mb-4 mt-2 flex-row justify-end gap-2 border-t border-line/70 bg-surface-1/40 px-4">
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending ? "Saving…" : outreach ? "Save changes" : "Add referral lead"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
