"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { Award, Send } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
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
  CLOSED_OUTCOMES,
  COMPENSATION_PERIODS,
  COMPENSATION_PERIOD_LABELS,
  OFFER_DECISION_LABELS,
  OFFER_DECISIONS,
  REJECTION_REASONS,
  REJECTION_STAGES,
} from "@/lib/application-model"
import {
  CLOSED_OUTCOME_LABELS,
  REJECTION_REASON_LABELS,
  REJECTION_STAGE_LABELS,
} from "@/lib/rejection-model"
import { Field, FormError, NativeSelect, SectionLabel } from "./form-kit"

type SheetShellProps = {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function useControllable({ open: controlledOpen, onOpenChange }: SheetShellProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )
  return { open, setOpen }
}

/* ── Record offer (creates a new version) ──────────────────────────────── */
export function OfferSheet({
  applicationId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: SheetShellProps & { applicationId: string }) {
  const recordOffer = useMutation(api.applications.recordOffer)
  const { open, setOpen } = useControllable({ open: controlledOpen, onOpenChange })
  const [form, setForm] = React.useState({
    baseAmount: "",
    bonusAmount: "",
    equitySummary: "",
    period: "year",
    responseDeadlineDate: "",
    compensationNotes: "",
    decision: "pending",
  })
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      await recordOffer({
        applicationId: applicationId as Id<"applications">,
        baseAmount: form.baseAmount ? Number(form.baseAmount) : undefined,
        bonusAmount: form.bonusAmount ? Number(form.bonusAmount) : undefined,
        equitySummary: form.equitySummary.trim() || undefined,
        period: form.period as never,
        responseDeadlineDate: form.responseDeadlineDate || undefined,
        compensationNotes: form.compensationNotes.trim() || undefined,
        decision: form.decision as never,
      })
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not record offer")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Record offer</SheetTitle>
          <SheetDescription>Logs a new offer version and moves the application to Offer.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Base">
              <Input type="number" value={form.baseAmount} onChange={(event) => update("baseAmount", event.target.value)} />
            </Field>
            <Field label="Bonus">
              <Input type="number" value={form.bonusAmount} onChange={(event) => update("bonusAmount", event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Period">
              <NativeSelect value={form.period} onChange={(value) => update("period", value)}>
                {COMPENSATION_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {COMPENSATION_PERIOD_LABELS[period]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Decision">
              <NativeSelect value={form.decision} onChange={(value) => update("decision", value)}>
                {OFFER_DECISIONS.map((decision) => (
                  <option key={decision} value={decision}>
                    {OFFER_DECISION_LABELS[decision]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Equity">
            <Input value={form.equitySummary} onChange={(event) => update("equitySummary", event.target.value)} placeholder="e.g. 0.05% over 4y" />
          </Field>
          <Field label="Respond by">
            <Input type="date" value={form.responseDeadlineDate} onChange={(event) => update("responseDeadlineDate", event.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={form.compensationNotes} onChange={(event) => update("compensationNotes", event.target.value)} />
          </Field>
          <FormError message={error} />
          <SheetFooter className="-mx-4 -mb-4 mt-2 flex-row justify-end gap-2 border-t border-line/70 bg-surface-1/40 px-4">
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending}>
              <Award className="size-4" />
              {pending ? "Saving…" : "Record offer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/* ── Record outcome (closes the application) ───────────────────────────── */
export function OutcomeSheet({
  applicationId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: SheetShellProps & { applicationId: string }) {
  const updateApplication = useMutation(api.applications.update)
  const { open, setOpen } = useControllable({ open: controlledOpen, onOpenChange })
  const [form, setForm] = React.useState({
    closedOutcome: "rejected",
    rejectionStage: "application_review",
    rejectionReason: "unknown",
    rejectionFeedback: "",
    rejectionLessons: "",
    reapplyAfterDate: "",
  })
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const isRejection = form.closedOutcome === "rejected"

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      await updateApplication({
        id: applicationId as Id<"applications">,
        stage: "closed",
        closedOutcome: form.closedOutcome as never,
        rejectionStage: isRejection ? (form.rejectionStage as never) : undefined,
        rejectionReason: isRejection ? (form.rejectionReason as never) : undefined,
        rejectionFeedback: form.rejectionFeedback.trim() || undefined,
        rejectionLessons: form.rejectionLessons.trim() || undefined,
        reapplyAfterDate: form.reapplyAfterDate || undefined,
      })
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not record outcome")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Record outcome</SheetTitle>
          <SheetDescription>Close out the application and capture what you learned.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          <Field label="Outcome">
            <NativeSelect value={form.closedOutcome} onChange={(value) => update("closedOutcome", value)}>
              {CLOSED_OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {CLOSED_OUTCOME_LABELS[outcome]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {isRejection && (
            <>
              <SectionLabel>Where & why</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Stage">
                  <NativeSelect value={form.rejectionStage} onChange={(value) => update("rejectionStage", value)}>
                    {REJECTION_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {REJECTION_STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Reason">
                  <NativeSelect value={form.rejectionReason} onChange={(value) => update("rejectionReason", value)}>
                    {REJECTION_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {REJECTION_REASON_LABELS[reason]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
            </>
          )}
          <Field label="Feedback" hint="optional">
            <Textarea value={form.rejectionFeedback} onChange={(event) => update("rejectionFeedback", event.target.value)} />
          </Field>
          <Field label="Lessons learned" hint="optional">
            <Textarea value={form.rejectionLessons} onChange={(event) => update("rejectionLessons", event.target.value)} />
          </Field>
          <Field label="Reapply after" hint="optional">
            <Input type="date" value={form.reapplyAfterDate} onChange={(event) => update("reapplyAfterDate", event.target.value)} />
          </Field>
          <FormError message={error} />
          <SheetFooter className="-mx-4 -mb-4 mt-2 flex-row justify-end gap-2 border-t border-line/70 bg-surface-1/40 px-4">
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending}>
              <Send className="size-4" />
              {pending ? "Saving…" : "Record outcome"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
