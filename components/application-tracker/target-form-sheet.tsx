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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  TARGET_COMPANY_STATUS_LABELS,
  TARGET_COMPANY_STATUSES,
  TARGET_COMPANY_TIER_LABELS,
  TARGET_COMPANY_TIERS,
  WORK_ARRANGEMENT_LABELS,
  WORK_ARRANGEMENTS,
  type TargetCompanyStatus,
  type TargetCompanyTier,
  type WorkArrangement,
} from "@/lib/application-model"
import { Field, FormError, SectionLabel } from "./form-kit"

type TargetFormSheetProps = {
  trigger?: React.ReactNode
  target?: Doc<"targetCompanies">
  defaultTier?: TargetCompanyTier
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const UNSET = "__unset__"

function trimmed(value: string) {
  return value.trim()
}

function optionalNumber(value: string) {
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) && value.trim() !== "" ? parsed : undefined
}

function buildInitialForm(target?: Doc<"targetCompanies">, defaultTier: TargetCompanyTier = "dream") {
  return {
    companyName: target?.companyName ?? "",
    tier: target?.tier ?? defaultTier,
    status: target?.status ?? ("researching" as TargetCompanyStatus),
    website: target?.website ?? "",
    targetRoles: target?.targetRoles.join(", ") ?? "",
    targetLevel: target?.targetLevel ?? "",
    locationPreference: target?.locationPreference ?? "",
    workArrangement: target?.workArrangement ?? "",
    priorityScore: target?.priorityScore?.toString() ?? "80",
    roleFitScore: target?.roleFitScore?.toString() ?? "70",
    referralGoal: target?.referralGoal?.toString() ?? "2",
    applicationWindowStartDate: target?.applicationWindowStartDate ?? "",
    applicationWindowEndDate: target?.applicationWindowEndDate ?? "",
    researchNotes: target?.researchNotes ?? "",
    hiringBarNotes: target?.hiringBarNotes ?? "",
    interviewProcessNotes: target?.interviewProcessNotes ?? "",
    compensationNotes: target?.compensationNotes ?? "",
    notes: target?.notes ?? "",
  }
}

export function TargetFormSheet({
  trigger,
  target,
  defaultTier = "dream",
  open: controlledOpen,
  onOpenChange,
}: TargetFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const createCompany = useMutation(api.targets.createCompany)
  const updateCompany = useMutation(api.targets.updateCompany)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")
  const [form, setForm] = React.useState(() => buildInitialForm(target, defaultTier))

  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(buildInitialForm(target, defaultTier))
      setError("")
    }
    setOpen(next)
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const companyName = trimmed(form.companyName)
    if (!companyName) {
      setError("Company name is required.")
      return
    }
    setPending(true)
    setError("")

    const payload = {
      companyName,
      tier: form.tier,
      status: form.status,
      targetRoles: form.targetRoles
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean),
      targetLevel: trimmed(form.targetLevel) || undefined,
      locationPreference: trimmed(form.locationPreference) || undefined,
      workArrangement: (form.workArrangement || undefined) as WorkArrangement | undefined,
      priorityScore: optionalNumber(form.priorityScore) ?? 50,
      roleFitScore: optionalNumber(form.roleFitScore) ?? 50,
      referralGoal: optionalNumber(form.referralGoal) ?? 1,
      applicationWindowStartDate: form.applicationWindowStartDate || undefined,
      applicationWindowEndDate: form.applicationWindowEndDate || undefined,
      website: trimmed(form.website) || undefined,
      researchNotes: trimmed(form.researchNotes) || undefined,
      hiringBarNotes: trimmed(form.hiringBarNotes) || undefined,
      interviewProcessNotes: trimmed(form.interviewProcessNotes) || undefined,
      compensationNotes: trimmed(form.compensationNotes) || undefined,
      notes: trimmed(form.notes) || undefined,
    }

    try {
      if (target) {
        await updateCompany({
          id: target._id as Id<"targetCompanies">,
          ...payload,
          website: payload.website ?? null,
          targetLevel: payload.targetLevel ?? null,
          locationPreference: payload.locationPreference ?? null,
          workArrangement: payload.workArrangement ?? null,
          applicationWindowStartDate: payload.applicationWindowStartDate ?? null,
          applicationWindowEndDate: payload.applicationWindowEndDate ?? null,
          researchNotes: payload.researchNotes ?? null,
          hiringBarNotes: payload.hiringBarNotes ?? null,
          interviewProcessNotes: payload.interviewProcessNotes ?? null,
          compensationNotes: payload.compensationNotes ?? null,
          notes: payload.notes ?? null,
        })
        toast.success(`${companyName} updated`)
      } else {
        await createCompany(payload)
        toast.success(`${companyName} added to targets`)
      }
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save target company")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{target ? "Edit target company" : "New target company"}</SheetTitle>
          <SheetDescription>
            Track priority, fit, referral goals, and everything you learn before you apply.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          <SectionLabel>Basics</SectionLabel>
          <Field label="Company">
            <Input value={form.companyName} onChange={(event) => update("companyName", event.target.value)} required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tier">
              <RequiredSelect
                value={form.tier}
                onChange={(value) => update("tier", value)}
                options={TARGET_COMPANY_TIERS.map((tier) => ({ value: tier, label: TARGET_COMPANY_TIER_LABELS[tier] }))}
              />
            </Field>
            <Field label="Status">
              <RequiredSelect
                value={form.status}
                onChange={(value) => update("status", value)}
                options={TARGET_COMPANY_STATUSES.map((status) => ({
                  value: status,
                  label: TARGET_COMPANY_STATUS_LABELS[status],
                }))}
              />
            </Field>
          </div>
          <Field label="Website">
            <Input type="url" value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="https://" />
          </Field>

          <SectionLabel>Role fit</SectionLabel>
          <Field label="Target roles" hint="comma-separated">
            <Input value={form.targetRoles} onChange={(event) => update("targetRoles", event.target.value)} placeholder="Staff Engineer, Eng Manager" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Target level">
              <Input value={form.targetLevel} onChange={(event) => update("targetLevel", event.target.value)} placeholder="L5 / Senior" />
            </Field>
            <Field label="Work arrangement">
              <OptionalSelect
                value={form.workArrangement}
                onChange={(value) => update("workArrangement", value)}
                placeholder="Not set"
                options={WORK_ARRANGEMENTS.map((value) => ({ value, label: WORK_ARRANGEMENT_LABELS[value] }))}
              />
            </Field>
          </div>
          <Field label="Location preference">
            <Input value={form.locationPreference} onChange={(event) => update("locationPreference", event.target.value)} />
          </Field>

          <SectionLabel>Scoring &amp; goals</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Priority" hint="0-100">
              <Input type="number" min="0" max="100" value={form.priorityScore} onChange={(event) => update("priorityScore", event.target.value)} />
            </Field>
            <Field label="Role fit" hint="0-100">
              <Input type="number" min="0" max="100" value={form.roleFitScore} onChange={(event) => update("roleFitScore", event.target.value)} />
            </Field>
            <Field label="Referral goal">
              <Input type="number" min="1" value={form.referralGoal} onChange={(event) => update("referralGoal", event.target.value)} />
            </Field>
          </div>

          <SectionLabel>Application window</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Opens">
              <Input type="date" value={form.applicationWindowStartDate} onChange={(event) => update("applicationWindowStartDate", event.target.value)} />
            </Field>
            <Field label="Closes">
              <Input type="date" value={form.applicationWindowEndDate} onChange={(event) => update("applicationWindowEndDate", event.target.value)} />
            </Field>
          </div>

          <SectionLabel>Research</SectionLabel>
          <Field label="Research notes">
            <Textarea value={form.researchNotes} onChange={(event) => update("researchNotes", event.target.value)} />
          </Field>
          <Field label="Hiring bar notes">
            <Textarea value={form.hiringBarNotes} onChange={(event) => update("hiringBarNotes", event.target.value)} />
          </Field>
          <Field label="Interview process notes">
            <Textarea value={form.interviewProcessNotes} onChange={(event) => update("interviewProcessNotes", event.target.value)} />
          </Field>
          <Field label="Compensation notes">
            <Textarea value={form.compensationNotes} onChange={(event) => update("compensationNotes", event.target.value)} />
          </Field>
          <Field label="General notes">
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
              {pending ? "Saving…" : target ? "Save changes" : "Add target"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export function RequiredSelect<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  className?: string
  ariaLabel?: string
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger aria-label={ariaLabel} className={className ?? "w-full bg-surface-1"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function OptionalSelect({
  value,
  onChange,
  placeholder,
  options,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: Array<{ value: string; label: string }>
  className?: string
}) {
  return (
    <Select value={value === "" ? UNSET : value} onValueChange={(next) => onChange(next === UNSET ? "" : next)}>
      <SelectTrigger className={className ?? "w-full bg-surface-1"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNSET}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
