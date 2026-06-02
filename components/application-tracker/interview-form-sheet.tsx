"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { CalendarClock, Save } from "lucide-react"

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
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_FORMATS,
  INTERVIEW_RESULT_LABELS,
  INTERVIEW_RESULTS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPES,
} from "@/lib/interview-model"
import { CONTACT_RELATIONSHIP_LABELS, type ContactRelationship } from "@/lib/contact-model"
import { cn } from "@/lib/utils"
import { Field, FormError, NativeSelect, SectionLabel } from "./form-kit"

type InterviewFormSheetProps = {
  applications: Doc<"applications">[]
  contacts: Doc<"applicationContacts">[]
  applicationId?: string
  interview?: Doc<"applicationInterviews">
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function splitSchedule(interview?: Doc<"applicationInterviews">) {
  if (interview?.scheduledAt) {
    const date = new Date(interview.scheduledAt)
    const pad = (n: number) => `${n}`.padStart(2, "0")
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    }
  }
  return { date: interview?.scheduledDate ?? "", time: "" }
}

function buildInitialForm(applicationId: string, interview?: Doc<"applicationInterviews">) {
  const schedule = splitSchedule(interview)
  return {
    applicationId: interview?.applicationId ?? applicationId ?? "",
    roundLabel: interview?.roundLabel ?? "",
    interviewType: interview?.interviewType ?? "",
    format: interview?.format ?? "",
    date: schedule.date,
    time: schedule.time,
    durationMinutes: interview?.durationMinutes?.toString() ?? "60",
    prepNotes: interview?.prepNotes ?? "",
    questions: interview?.questions ?? "",
    status: (interview?.status ?? "scheduled") as string,
    result: (interview?.result ?? "pending") as string,
    feedback: interview?.feedback ?? "",
  }
}

export function InterviewFormSheet({
  applications,
  contacts,
  applicationId,
  interview,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: InterviewFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const isEdit = Boolean(interview)
  const createInterview = useMutation(api.interviews.create)
  const updateInterview = useMutation(api.interviews.update)
  const createTask = useMutation(api.tasks.create)

  const [form, setForm] = React.useState(() => buildInitialForm(applicationId ?? "", interview))
  const [attendeeIds, setAttendeeIds] = React.useState<string[]>(interview?.contactIds ?? [])
  const [addPrepTask, setAddPrepTask] = React.useState(false)
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
      setForm(buildInitialForm(applicationId ?? "", interview))
      setAttendeeIds(interview?.contactIds ?? [])
      setAddPrepTask(false)
      setError("")
    }
    setOpen(next)
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const appContacts = contacts.filter((contact) => contact.applicationId === form.applicationId)

  function toggleAttendee(id: string) {
    setAttendeeIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.applicationId) {
      setError("Pick an application for this interview.")
      return
    }
    setPending(true)
    setError("")

    const scheduledAt =
      form.date && form.time ? new Date(`${form.date}T${form.time}`).getTime() : undefined
    const duration = form.durationMinutes ? Number(form.durationMinutes) : undefined
    const contactIds = attendeeIds.filter((id) => appContacts.some((contact) => contact._id === id))

    try {
      if (interview) {
        await updateInterview({
          id: interview._id,
          roundLabel: form.roundLabel || undefined,
          interviewType: (form.interviewType || undefined) as never,
          format: (form.format || undefined) as never,
          scheduledAt,
          scheduledDate: form.date || undefined,
          durationMinutes: duration,
          prepNotes: form.prepNotes || undefined,
          questions: form.questions || undefined,
          status: form.status as never,
          result: form.result as never,
          feedback: form.feedback || undefined,
          contactIds: contactIds as Id<"applicationContacts">[],
        })
      } else {
        const interviewId = await createInterview({
          applicationId: form.applicationId as Id<"applications">,
          roundLabel: form.roundLabel || undefined,
          interviewType: (form.interviewType || undefined) as never,
          format: (form.format || undefined) as never,
          scheduledAt,
          scheduledDate: form.date || undefined,
          durationMinutes: duration,
          prepNotes: form.prepNotes || undefined,
          questions: form.questions || undefined,
          contactIds: contactIds as Id<"applicationContacts">[],
        })
        if (addPrepTask && form.date) {
          const due = new Date(`${form.date}T00:00:00`)
          due.setDate(due.getDate() - 1)
          const pad = (n: number) => `${n}`.padStart(2, "0")
          await createTask({
            applicationId: form.applicationId as Id<"applications">,
            relatedInterviewId: interviewId,
            kind: "interview_prep",
            title: `Prep: ${form.roundLabel || "interview"}`,
            dueDate: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`,
          })
        }
      }
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save interview")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit interview" : "Schedule interview"}</SheetTitle>
          <SheetDescription>
            Round details, format, prep notes, and who you&apos;re meeting — all attached to the
            application.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          {!applicationId && !isEdit && (
            <Field label="Application">
              <NativeSelect
                value={form.applicationId}
                onChange={(value) => {
                  update("applicationId", value)
                  setAttendeeIds([])
                }}
              >
                <option value="">Select application…</option>
                {applications
                  .filter((application) => !application.archived)
                  .map((application) => (
                    <option key={application._id} value={application._id}>
                      {application.companyName} · {application.roleTitle}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
          )}

          <SectionLabel>Round</SectionLabel>
          <Field label="Label" hint="e.g. System design">
            <Input
              value={form.roundLabel}
              onChange={(event) => update("roundLabel", event.target.value)}
              placeholder="Round label"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <NativeSelect value={form.interviewType} onChange={(value) => update("interviewType", value)}>
                <option value="">Not set</option>
                {INTERVIEW_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {INTERVIEW_TYPE_LABELS[type]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Format">
              <NativeSelect value={form.format} onChange={(value) => update("format", value)}>
                <option value="">Not set</option>
                {INTERVIEW_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {INTERVIEW_FORMAT_LABELS[format]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <SectionLabel>Schedule</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
            </Field>
            <Field label="Time">
              <Input type="time" value={form.time} onChange={(event) => update("time", event.target.value)} />
            </Field>
            <Field label="Mins">
              <Input
                type="number"
                min={0}
                className="w-20"
                value={form.durationMinutes}
                onChange={(event) => update("durationMinutes", event.target.value)}
              />
            </Field>
          </div>

          {appContacts.length > 0 && (
            <Field label="Who you're meeting">
              <div className="flex flex-wrap gap-1.5">
                {appContacts.map((contact) => {
                  const active = attendeeIds.includes(contact._id)
                  return (
                    <button
                      key={contact._id}
                      type="button"
                      onClick={() => toggleAttendee(contact._id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-brand/40 bg-brand-weak text-brand"
                          : "border-line bg-surface-1 text-ink-300 hover:border-line-strong"
                      )}
                    >
                      {contact.name}
                      <span className="ml-1 text-ink-500">
                        {CONTACT_RELATIONSHIP_LABELS[contact.relationshipType as ContactRelationship]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          <SectionLabel>Prep</SectionLabel>
          <Field label="Prep notes">
            <Textarea
              value={form.prepNotes}
              onChange={(event) => update("prepNotes", event.target.value)}
              placeholder="Topics to review, stories to prepare…"
            />
          </Field>
          <Field label="Question bank" hint="one per line">
            <Textarea
              value={form.questions}
              onChange={(event) => update("questions", event.target.value)}
              placeholder="Questions to ask them…"
            />
          </Field>

          {isEdit && (
            <>
              <SectionLabel>Outcome</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Status">
                  <NativeSelect value={form.status} onChange={(value) => update("status", value)}>
                    {INTERVIEW_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {INTERVIEW_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Result">
                  <NativeSelect value={form.result} onChange={(value) => update("result", value)}>
                    {INTERVIEW_RESULTS.map((result) => (
                      <option key={result} value={result}>
                        {INTERVIEW_RESULT_LABELS[result]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Feedback">
                <Textarea
                  value={form.feedback}
                  onChange={(event) => update("feedback", event.target.value)}
                  placeholder="How did it go? What did they probe?"
                />
              </Field>
            </>
          )}

          {!isEdit && (
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-surface-1/60 px-3 py-2 text-sm text-ink-300">
              <input
                type="checkbox"
                className="size-4 accent-brand"
                checked={addPrepTask}
                onChange={(event) => setAddPrepTask(event.target.checked)}
              />
              Also create a prep task (due the day before)
            </label>
          )}

          <FormError message={error} />

          <SheetFooter className="-mx-4 -mb-4 mt-2 flex-row justify-end gap-2 border-t border-line/70 bg-surface-1/40 px-4">
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending}>
              {isEdit ? <Save className="size-4" /> : <CalendarClock className="size-4" />}
              {pending ? "Saving…" : isEdit ? "Save interview" : "Schedule"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
