"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import { ArrowLeft, Archive, Plus, Save } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CLOSED_OUTCOMES,
  OFFER_DECISION_LABELS,
  OFFER_DECISIONS,
  REFERRAL_LABELS,
  REJECTION_REASONS,
  REJECTION_STAGES,
  SOURCE_LABELS,
  WORK_ARRANGEMENT_LABELS,
} from "@/lib/application-model"
import { formatApplicationSalary } from "@/lib/application-model"
import { formatShortDate } from "@/lib/date-model"
import {
  CLOSED_OUTCOME_LABELS,
  REJECTION_REASON_LABELS,
  REJECTION_STAGE_LABELS,
} from "@/lib/rejection-model"
import { calculateQualityScore } from "@/lib/quality-model"
import { ApplicationFormSheet } from "./application-form-sheet"
import { EmptyState, LoadingPanels, PageHeader, Panel, ProgressBar, StageBadge, StageSelect } from "./common"
import { mapActivity, mapApplication, mapReminder, mapResume } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function ApplicationDetailPage({ id }: { id: string }) {
  const { data, isLoading } = useAppData()
  const updateApplication = useMutation(api.applications.update)
  const moveStage = useMutation(api.applications.moveStage)
  const updateQualityCheck = useMutation(api.applications.updateQualityCheck)
  const addManualActivity = useMutation(api.activity.addManual)
  const createReminder = useMutation(api.reminders.create)
  const completeReminder = useMutation(api.reminders.complete)

  const [note, setNote] = React.useState("")
  const [noteDescription, setNoteDescription] = React.useState("")
  const [reminderTitle, setReminderTitle] = React.useState("")
  const [reminderDue, setReminderDue] = React.useState("")
  const [reminderType, setReminderType] = React.useState<"follow_up" | "deadline" | "general">("follow_up")
  const [outcome, setOutcome] = React.useState({
    closedOutcome: "rejected",
    rejectionStage: "application_review",
    rejectionReason: "unknown",
    rejectionFeedback: "",
    rejectionLessons: "",
    reapplyAfter: "",
  })
  const [offer, setOffer] = React.useState({
    offerComp: "",
    offerDecision: "",
    offerResponseDeadlineAt: "",
  })

  if (isLoading) {
    return <LoadingPanels />
  }

  if (!data) {
    return <EmptyState title="Application unavailable" description="Sign in to load this application from Convex." />
  }

  const applicationDoc = data.applications.find((application) => application._id === id)
  if (!applicationDoc) {
    return (
      <EmptyState
        title="Application not found"
        description="This record is not in the current Convex-backed account."
        href="/app/applications"
        actionLabel="Back to applications"
      />
    )
  }

  const application = mapApplication(applicationDoc)
  const applicationId = applicationDoc._id
  const resumes = data.resumes.map(mapResume)
  const linkedResume = resumes.find((resume) => resume.id === application.resumeId)
  const activity = data.activityEvents
    .filter((event) => event.applicationId === applicationId)
    .map(mapActivity)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
  const reminders = data.reminders
    .filter((reminder) => reminder.applicationId === applicationId)
    .map(mapReminder)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  const qualityScore = calculateQualityScore(application.qualityChecks)

  async function saveManualActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!note.trim()) return
    await addManualActivity({
      applicationId,
      title: note,
      description: noteDescription || undefined,
    })
    setNote("")
    setNoteDescription("")
  }

  async function saveReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reminderTitle.trim() || !reminderDue) return
    await createReminder({
      applicationId,
      title: reminderTitle,
      dueAt: new Date(`${reminderDue}T12:00:00`).toISOString(),
      reminderType,
    })
    setReminderTitle("")
    setReminderDue("")
  }

  async function saveOutcome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateApplication({
      id: applicationId,
      stage: "closed",
      closedAt: new Date().toISOString(),
      closedOutcome: outcome.closedOutcome as (typeof CLOSED_OUTCOMES)[number],
      rejectionStage: outcome.rejectionStage as (typeof REJECTION_STAGES)[number],
      rejectionReason: outcome.rejectionReason as (typeof REJECTION_REASONS)[number],
      rejectionFeedback: outcome.rejectionFeedback || undefined,
      rejectionLessons: outcome.rejectionLessons || undefined,
      reapplyAfter: outcome.reapplyAfter || undefined,
    })
  }

  async function saveOffer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateApplication({
      id: applicationId,
      stage: "offer",
      offerComp: offer.offerComp || undefined,
      offerDecision: offer.offerDecision
        ? (offer.offerDecision as (typeof OFFER_DECISIONS)[number])
        : undefined,
      offerResponseDeadlineAt: offer.offerResponseDeadlineAt
        ? new Date(`${offer.offerResponseDeadlineAt}T12:00:00`).toISOString()
        : undefined,
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Application detail"
        title={`${application.companyName} / ${application.roleTitle}`}
        description="Everything that matters stays attached to this application."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/app/applications">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <ApplicationFormSheet
                application={applicationDoc}
              resumes={data.resumes}
              trigger={<Button variant="secondary">Edit</Button>}
            />
            <Button
              variant="secondary"
              onClick={() =>
                void updateApplication({
                  id: applicationId,
                  archived: !application.archived,
                })
              }
            >
              <Archive className="size-4" />
              {application.archived ? "Restore" : "Archive"}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StageBadge stage={application.stage} />
        {application.workArrangement && (
          <span className="rounded-md border border-line bg-surface-1 px-2 py-0.5 text-xs">
            {WORK_ARRANGEMENT_LABELS[application.workArrangement]}
          </span>
        )}
        {application.referralStatus && (
          <span className="rounded-md border border-line bg-surface-1 px-2 py-0.5 text-xs">
            {REFERRAL_LABELS[application.referralStatus]}
          </span>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-4">
          <Panel title="Metadata">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Location" value={application.location ?? "Not set"} />
              <Fact label="Salary" value={formatApplicationSalary(application)} />
              <Fact
                label="Source"
                value={application.source ? SOURCE_LABELS[application.source] : "Not set"}
              />
              <Fact label="Applied" value={formatShortDate(application.dateApplied)} />
              <Fact
                label="Application deadline"
                value={formatShortDate(application.applicationDeadlineAt)}
              />
              <Fact label="Take-home deadline" value={formatShortDate(application.takeHomeDeadlineAt)} />
            </div>
            <div className="mt-4">
              <Label>Move stage</Label>
              <StageSelect
                value={application.stage}
                onChange={(stage) =>
                  void moveStage({
                    id: applicationId as Id<"applications">,
                    stage,
                  })
                }
                className="mt-2 w-full max-w-xs"
              />
            </div>
          </Panel>

          <Panel title="Job description snapshot">
            <p className="whitespace-pre-wrap text-sm leading-6 text-ink-300">
              {application.jobDescriptionSnapshot || "No snapshot saved yet."}
            </p>
          </Panel>

          <Panel title="Notes">
            <p className="whitespace-pre-wrap text-sm leading-6 text-ink-300">
              {application.notes || "No notes yet."}
            </p>
          </Panel>
        </div>

        <div className="grid gap-4">
          <Panel title="Timeline" action={<span className="font-mono text-xs text-ink-500">{activity.length}</span>}>
            <div className="grid gap-2">
              {activity.map((event) => (
                <div key={event.id} className="rounded-md border border-line bg-surface-1 p-3">
                  <div className="flex justify-between gap-3">
                    <p className="text-sm font-medium">{event.title}</p>
                    <span className="font-mono text-xs text-ink-500">
                      {formatShortDate(event.eventDate)}
                    </span>
                  </div>
                  {event.description && <p className="mt-1 text-xs text-ink-500">{event.description}</p>}
                </div>
              ))}
            </div>
            <form onSubmit={saveManualActivity} className="mt-4 grid gap-2">
              <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add entry" />
              <Textarea
                value={noteDescription}
                onChange={(event) => setNoteDescription(event.target.value)}
                placeholder="Optional detail"
              />
              <Button type="submit" variant="secondary">
                <Plus className="size-4" />
                Add entry
              </Button>
            </form>
          </Panel>

          <Panel title="Linked resume">
            {linkedResume ? (
              <div className="rounded-md border border-line bg-surface-1 p-3">
                <p className="text-sm font-medium">{linkedResume.label}</p>
                <p className="text-xs text-ink-500">{linkedResume.fileName}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-300">No resume linked.</p>
            )}
          </Panel>

          <Panel title={`Quality ${qualityScore}/100`}>
            <ProgressBar value={qualityScore} />
            <div className="mt-3 grid gap-2">
              {application.qualityChecks.map((check) => (
                <label key={check.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={check.checked}
                    onChange={(event) =>
                      void updateQualityCheck({
                        id: applicationId,
                        key: check.key,
                        checked: event.target.checked,
                      })
                    }
                  />
                  <span>{check.label}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Deadlines and reminders">
            <div className="grid gap-2">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between rounded-md border border-line bg-surface-1 p-3">
                  <div>
                    <p className="text-sm font-medium">{reminder.title}</p>
                    <p className="text-xs text-ink-500">
                      {formatShortDate(reminder.dueAt)} · {reminder.status}
                    </p>
                  </div>
                  {reminder.status === "pending" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void completeReminder({ id: reminder.id as Id<"reminders"> })}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={saveReminder} className="mt-4 grid gap-2">
              <Input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} placeholder="Reminder title" />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input type="date" value={reminderDue} onChange={(event) => setReminderDue(event.target.value)} />
                <select
                  value={reminderType}
                  onChange={(event) => setReminderType(event.target.value as typeof reminderType)}
                  className="rounded-md border border-line bg-surface-1 px-2 text-sm"
                >
                  <option value="follow_up">Follow-up</option>
                  <option value="deadline">Deadline</option>
                  <option value="general">General</option>
                </select>
              </div>
              <Button type="submit" variant="secondary">Add reminder</Button>
            </form>
          </Panel>

          <Panel title="Offer">
            <form onSubmit={saveOffer} className="grid gap-2">
              <Input value={offer.offerComp} onChange={(event) => setOffer((current) => ({ ...current, offerComp: event.target.value }))} placeholder={application.offerComp || "Comp summary"} />
              <Input type="date" value={offer.offerResponseDeadlineAt} onChange={(event) => setOffer((current) => ({ ...current, offerResponseDeadlineAt: event.target.value }))} />
              <select
                value={offer.offerDecision}
                onChange={(event) => setOffer((current) => ({ ...current, offerDecision: event.target.value }))}
                className="h-9 rounded-md border border-line bg-surface-1 px-2 text-sm"
              >
                <option value="">Decision</option>
                {OFFER_DECISIONS.map((decision) => (
                  <option key={decision} value={decision}>{OFFER_DECISION_LABELS[decision]}</option>
                ))}
              </select>
              <Button type="submit" variant="secondary">
                <Save className="size-4" />
                Save offer
              </Button>
            </form>
          </Panel>

          <Panel title="Outcome">
            <form onSubmit={saveOutcome} className="grid gap-2">
              <select value={outcome.closedOutcome} onChange={(event) => setOutcome((current) => ({ ...current, closedOutcome: event.target.value }))} className="h-9 rounded-md border border-line bg-surface-1 px-2 text-sm">
                {CLOSED_OUTCOMES.map((value) => <option key={value} value={value}>{CLOSED_OUTCOME_LABELS[value]}</option>)}
              </select>
              <select value={outcome.rejectionStage} onChange={(event) => setOutcome((current) => ({ ...current, rejectionStage: event.target.value }))} className="h-9 rounded-md border border-line bg-surface-1 px-2 text-sm">
                {REJECTION_STAGES.map((value) => <option key={value} value={value}>{REJECTION_STAGE_LABELS[value]}</option>)}
              </select>
              <select value={outcome.rejectionReason} onChange={(event) => setOutcome((current) => ({ ...current, rejectionReason: event.target.value }))} className="h-9 rounded-md border border-line bg-surface-1 px-2 text-sm">
                {REJECTION_REASONS.map((value) => <option key={value} value={value}>{REJECTION_REASON_LABELS[value]}</option>)}
              </select>
              <Textarea value={outcome.rejectionFeedback} onChange={(event) => setOutcome((current) => ({ ...current, rejectionFeedback: event.target.value }))} placeholder="Feedback" />
              <Textarea value={outcome.rejectionLessons} onChange={(event) => setOutcome((current) => ({ ...current, rejectionLessons: event.target.value }))} placeholder="Lessons" />
              <Input type="date" value={outcome.reapplyAfter} onChange={(event) => setOutcome((current) => ({ ...current, reapplyAfter: event.target.value }))} />
              <Button type="submit" variant="secondary">Record outcome</Button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface-1 p-3">
      <p className="micro-label">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  )
}
