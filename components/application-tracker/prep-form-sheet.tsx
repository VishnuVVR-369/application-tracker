"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { CheckCircle2, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  PREP_FOCUS_AREAS,
  PREP_FOCUS_LABELS,
  PREP_PLAN_STATUS_LABELS,
  PREP_PLAN_STATUSES,
  type ApplicationRecord,
  type InterviewPrepPlanRecord,
  type PrepFocusArea,
  type PrepPlanStatus,
  type TargetCompanyRecord,
} from "@/lib/application-model"
import { cn } from "@/lib/utils"
import { Field, FormError, SectionLabel } from "./form-kit"

/* Sentinel for Radix Select's "no selection" state — it forbids an empty
   string item value, so optional relations map through this constant. */
const NONE = "__none__"

type PrepFormSheetProps = {
  applications: ApplicationRecord[]
  targets: TargetCompanyRecord[]
  plan?: InterviewPrepPlanRecord
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function buildInitialForm(plan?: InterviewPrepPlanRecord) {
  return {
    title: plan?.title ?? "",
    applicationId: plan?.applicationId ?? "",
    targetCompanyId: plan?.targetCompanyId ?? "",
    status: (plan?.status ?? "in_progress") as PrepPlanStatus,
    focusAreas: (plan?.focusAreas ?? ["dsa", "system_design", "behavioral"]) as PrepFocusArea[],
    codingDrillsTarget: String(plan?.codingDrillsTarget ?? 30),
    codingDrillsDone: String(plan?.codingDrillsDone ?? 0),
    systemDesignDrillsTarget: String(plan?.systemDesignDrillsTarget ?? 5),
    systemDesignDrillsDone: String(plan?.systemDesignDrillsDone ?? 0),
    behavioralStoriesTarget: String(plan?.behavioralStoriesTarget ?? 6),
    behavioralStoriesReady: String(plan?.behavioralStoriesReady ?? 0),
    mockInterviewsTarget: String(plan?.mockInterviewsTarget ?? 2),
    mockInterviewsDone: String(plan?.mockInterviewsDone ?? 0),
    companyResearchDone: plan?.companyResearchDone ?? false,
    resumeDeepDiveDone: plan?.resumeDeepDiveDone ?? false,
    weaknessTags: plan?.weaknessTags.join(", ") ?? "",
    nextAction: plan?.nextAction ?? "",
    notes: plan?.notes ?? "",
  }
}

export function PrepFormSheet({
  applications,
  targets,
  plan,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: PrepFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const createPlan = useMutation(api.prep.createPlan)
  const updatePlan = useMutation(api.prep.updatePlan)
  const [form, setForm] = React.useState(() => buildInitialForm(plan))
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")

  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(buildInitialForm(plan))
      setError("")
    }
    setOpen(next)
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleFocusArea(area: PrepFocusArea) {
    update(
      "focusAreas",
      form.focusAreas.includes(area)
        ? form.focusAreas.filter((item) => item !== area)
        : [...form.focusAreas, area]
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError("A title is required.")
      return
    }
    setPending(true)
    setError("")

    const payload = {
      title: form.title.trim(),
      applicationId: form.applicationId ? (form.applicationId as Id<"applications">) : undefined,
      targetCompanyId: form.targetCompanyId
        ? (form.targetCompanyId as Id<"targetCompanies">)
        : undefined,
      status: form.status,
      focusAreas: form.focusAreas,
      codingDrillsTarget: Number(form.codingDrillsTarget) || 0,
      codingDrillsDone: Math.max(0, Number(form.codingDrillsDone) || 0),
      systemDesignDrillsTarget: Number(form.systemDesignDrillsTarget) || 0,
      systemDesignDrillsDone: Math.max(0, Number(form.systemDesignDrillsDone) || 0),
      behavioralStoriesTarget: Number(form.behavioralStoriesTarget) || 0,
      behavioralStoriesReady: Math.max(0, Number(form.behavioralStoriesReady) || 0),
      mockInterviewsTarget: Number(form.mockInterviewsTarget) || 0,
      mockInterviewsDone: Math.max(0, Number(form.mockInterviewsDone) || 0),
      companyResearchDone: form.companyResearchDone,
      resumeDeepDiveDone: form.resumeDeepDiveDone,
      weaknessTags: form.weaknessTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      nextAction: form.nextAction.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    try {
      if (plan) {
        await updatePlan({
          id: plan.id as Id<"interviewPrepPlans">,
          ...payload,
          applicationId: payload.applicationId ?? null,
          targetCompanyId: payload.targetCompanyId ?? null,
          nextAction: payload.nextAction ?? null,
          notes: payload.notes ?? null,
        })
        toast.success("Prep plan updated")
      } else {
        await createPlan(payload)
        toast.success("Prep plan created")
      }
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save prep plan")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{plan ? "Edit prep plan" : "New prep plan"}</SheetTitle>
          <SheetDescription>
            Track readiness across DSA, system design, behavioral stories, mocks, research, and
            resume.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          <Field label="Title">
            <Input value={form.title} onChange={(event) => update("title", event.target.value)} required />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Application" hint="optional">
              <Select
                value={form.applicationId || NONE}
                onValueChange={(value) => update("applicationId", value === NONE ? "" : value)}
              >
                <SelectTrigger className="w-full bg-surface-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No application</SelectItem>
                  {applications.map((application) => (
                    <SelectItem key={application.id} value={application.id}>
                      {application.companyName} · {application.roleTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Target company" hint="optional">
              <Select
                value={form.targetCompanyId || NONE}
                onValueChange={(value) => update("targetCompanyId", value === NONE ? "" : value)}
              >
                <SelectTrigger className="w-full bg-surface-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No target</SelectItem>
                  {targets.map((target) => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Status">
            <Select value={form.status} onValueChange={(value) => update("status", value as PrepPlanStatus)}>
              <SelectTrigger className="w-full bg-surface-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREP_PLAN_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {PREP_PLAN_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Focus areas</p>
            <div className="flex flex-wrap gap-1.5">
              {PREP_FOCUS_AREAS.map((area) => {
                const active = form.focusAreas.includes(area)
                return (
                  <button
                    key={area}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleFocusArea(area)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      active
                        ? "border-brand/40 bg-brand-weak text-brand"
                        : "border-line bg-surface-1 text-ink-300 hover:border-line-strong"
                    )}
                  >
                    {PREP_FOCUS_LABELS[area]}
                  </button>
                )
              })}
            </div>
          </div>

          <SectionLabel>Drill counts</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="DSA done / target">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  aria-label="DSA drills completed"
                  value={form.codingDrillsDone}
                  onChange={(event) => update("codingDrillsDone", event.target.value)}
                />
                <span className="text-ink-500">/</span>
                <Input
                  type="number"
                  min={0}
                  aria-label="DSA drills target"
                  value={form.codingDrillsTarget}
                  onChange={(event) => update("codingDrillsTarget", event.target.value)}
                />
              </div>
            </Field>
            <Field label="Design done / target">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  aria-label="System design drills completed"
                  value={form.systemDesignDrillsDone}
                  onChange={(event) => update("systemDesignDrillsDone", event.target.value)}
                />
                <span className="text-ink-500">/</span>
                <Input
                  type="number"
                  min={0}
                  aria-label="System design drills target"
                  value={form.systemDesignDrillsTarget}
                  onChange={(event) => update("systemDesignDrillsTarget", event.target.value)}
                />
              </div>
            </Field>
            <Field label="Stories done / target">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  aria-label="Behavioral stories ready"
                  value={form.behavioralStoriesReady}
                  onChange={(event) => update("behavioralStoriesReady", event.target.value)}
                />
                <span className="text-ink-500">/</span>
                <Input
                  type="number"
                  min={0}
                  aria-label="Behavioral stories target"
                  value={form.behavioralStoriesTarget}
                  onChange={(event) => update("behavioralStoriesTarget", event.target.value)}
                />
              </div>
            </Field>
            <Field label="Mocks done / target">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  aria-label="Mock interviews completed"
                  value={form.mockInterviewsDone}
                  onChange={(event) => update("mockInterviewsDone", event.target.value)}
                />
                <span className="text-ink-500">/</span>
                <Input
                  type="number"
                  min={0}
                  aria-label="Mock interviews target"
                  value={form.mockInterviewsTarget}
                  onChange={(event) => update("mockInterviewsTarget", event.target.value)}
                />
              </div>
            </Field>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => update("companyResearchDone", !form.companyResearchDone)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                form.companyResearchDone
                  ? "border-brand/40 bg-brand-weak text-brand"
                  : "border-line bg-surface-1 text-ink-300 hover:border-line-strong"
              )}
            >
              <CheckCircle2 className="size-4" /> Company research done
            </button>
            <button
              type="button"
              onClick={() => update("resumeDeepDiveDone", !form.resumeDeepDiveDone)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                form.resumeDeepDiveDone
                  ? "border-brand/40 bg-brand-weak text-brand"
                  : "border-line bg-surface-1 text-ink-300 hover:border-line-strong"
              )}
            >
              <CheckCircle2 className="size-4" /> Resume deep dive done
            </button>
          </div>

          <Field label="Weakness tags" hint="comma-separated">
            <Input value={form.weaknessTags} onChange={(event) => update("weaknessTags", event.target.value)} />
          </Field>
          <Field label="Next action" hint="optional">
            <Textarea value={form.nextAction} onChange={(event) => update("nextAction", event.target.value)} />
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
              {pending ? "Saving…" : plan ? "Save changes" : "Create plan"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
