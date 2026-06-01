"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import {
  Archive,
  ArrowLeft,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  ListChecks,
  MapPin,
  Plus,
  Save,
  Send,
  UserCheck,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { ApplicationFormSheet } from "./application-form-sheet"
import {
  EmptyState,
  LoadingPanels,
  PageHeader,
  Panel,
  ProgressBar,
  StageBadge,
  StageSelect,
} from "./common"
import { mapActivity, mapApplication, mapReminder, mapResume } from "./data-mappers"
import { useAppData } from "./use-app-data"

const selectClass =
  "h-9 rounded-md border border-line bg-surface-1 px-2 text-sm text-ink-100 outline-none transition-colors hover:border-line-strong focus:ring-3 focus:ring-ring/50"

const eventDot: Record<string, string> = {
  created: "bg-stage-saved",
  stage_changed: "bg-stage-interview",
  edited: "bg-status-info",
  resume_linked: "bg-brand",
  reminder_completed: "bg-status-up",
  note: "bg-ink-500",
  manual: "bg-ink-500",
}

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
  const checkedCount = application.qualityChecks.filter((c) => c.checked).length

  async function saveManualActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!note.trim()) return
    await addManualActivity({ applicationId, title: note, description: noteDescription || undefined })
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
      offerDecision: offer.offerDecision ? (offer.offerDecision as (typeof OFFER_DECISIONS)[number]) : undefined,
      offerResponseDeadlineAt: offer.offerResponseDeadlineAt
        ? new Date(`${offer.offerResponseDeadlineAt}T12:00:00`).toISOString()
        : undefined,
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Application detail"
        title={`${application.companyName} · ${application.roleTitle}`}
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
              onClick={() => void updateApplication({ id: applicationId, archived: !application.archived })}
            >
              <Archive className="size-4" />
              {application.archived ? "Restore" : "Archive"}
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StageBadge stage={application.stage} />
        {application.workArrangement && (
          <Badge variant="outline" className="gap-1.5">
            <Briefcase className="size-3" />
            {WORK_ARRANGEMENT_LABELS[application.workArrangement]}
          </Badge>
        )}
        {application.referralStatus && (
          <Badge variant="outline" className="gap-1.5">
            <UserCheck className="size-3" />
            {REFERRAL_LABELS[application.referralStatus]}
          </Badge>
        )}
        {application.archived && <Badge variant="warn">Archived</Badge>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-4">
          <Panel title="Metadata" icon={MapPin}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Location" value={application.location ?? "Not set"} />
              <Fact label="Salary" value={formatApplicationSalary(application)} />
              <Fact label="Source" value={application.source ? SOURCE_LABELS[application.source] : "Not set"} />
              <Fact label="Applied" value={formatShortDate(application.dateApplied)} mono />
              <Fact label="App deadline" value={formatShortDate(application.applicationDeadlineAt)} mono />
              <Fact label="Take-home" value={formatShortDate(application.takeHomeDeadlineAt)} mono />
            </div>
            <div className="mt-4 border-t border-line/70 pt-4">
              <Label className="micro-label">Move stage</Label>
              <StageSelect
                value={application.stage}
                onChange={(stage) => void moveStage({ id: applicationId as Id<"applications">, stage })}
                className="mt-2 h-9 w-full max-w-xs"
              />
            </div>
          </Panel>

          <Panel title="Job description snapshot" icon={FileText}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-300">
              {application.jobDescriptionSnapshot || "No snapshot saved yet."}
            </p>
          </Panel>

          <Panel title="Notes" icon={FileText}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-300">
              {application.notes || "No notes yet."}
            </p>
          </Panel>
        </div>

        <div className="grid gap-4">
          {/* Quality — focal point */}
          <Panel title="Application quality" icon={Award}>
            <div className="flex items-center gap-4">
              <div className="relative flex size-20 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-3)" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(qualityScore / 100) * 97.4} 97.4`}
                    style={{ filter: "drop-shadow(0 0 4px color-mix(in oklch, var(--brand) 60%, transparent))" }}
                  />
                </svg>
                <span className="absolute font-mono text-lg font-semibold tabular">{qualityScore}</span>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {checkedCount} of {application.qualityChecks.length} checks
                </p>
                <p className="mt-0.5 text-xs text-ink-500">Weighted 0–100 score</p>
                <div className="mt-2 w-40">
                  <ProgressBar value={qualityScore} />
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-1.5 border-t border-line/70 pt-4">
              {application.qualityChecks.map((check) => (
                <label
                  key={check.key}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 text-sm transition-colors hover:bg-surface-3/50"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-brand"
                    checked={check.checked}
                    onChange={(event) =>
                      void updateQualityCheck({ id: applicationId, key: check.key, checked: event.target.checked })
                    }
                  />
                  <span className={cn(check.checked ? "text-ink-100" : "text-ink-300")}>{check.label}</span>
                </label>
              ))}
            </div>
          </Panel>

          {/* Timeline */}
          <Panel
            title="Timeline"
            icon={Clock}
            action={<span className="font-mono text-xs tabular text-ink-500">{activity.length}</span>}
          >
            <div className="relative grid gap-0 before:absolute before:bottom-2 before:left-[6px] before:top-2 before:w-px before:bg-line">
              {activity.map((event) => (
                <div key={event.id} className="relative py-2 pl-6">
                  <span
                    className={cn(
                      "absolute left-0 top-3 size-3 rounded-full border-2 border-surface-2",
                      eventDot[event.type] ?? "bg-ink-500"
                    )}
                  />
                  <div className="flex justify-between gap-3">
                    <p className="text-sm font-medium">{event.title}</p>
                    <span className="shrink-0 font-mono text-xs tabular text-ink-500">
                      {formatShortDate(event.eventDate)}
                    </span>
                  </div>
                  {event.description && <p className="mt-0.5 text-xs text-ink-500">{event.description}</p>}
                </div>
              ))}
            </div>
            <form onSubmit={saveManualActivity} className="mt-4 grid gap-2 border-t border-line/70 pt-4">
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

          {/* Linked resume */}
          <Panel title="Linked resume" icon={FileText}>
            {linkedResume ? (
              <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-1/60 p-3">
                <span className="flex size-9 items-center justify-center rounded-lg border border-brand/30 bg-brand-weak text-brand">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{linkedResume.label}</p>
                  <p className="truncate text-xs text-ink-500">{linkedResume.fileName}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-300">No resume linked.</p>
            )}
          </Panel>

          {/* Reminders */}
          <Panel title="Deadlines & reminders" icon={Clock}>
            <div className="grid gap-2">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-1/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{reminder.title}</p>
                    <p className="flex items-center gap-1.5 font-mono text-xs tabular text-ink-500">
                      {formatShortDate(reminder.dueAt)}
                      <Badge
                        variant={
                          reminder.status === "completed"
                            ? "success"
                            : reminder.status === "pending"
                              ? "warn"
                              : "outline"
                        }
                        className="h-4 px-1.5 text-[10px]"
                      >
                        {reminder.status}
                      </Badge>
                    </p>
                  </div>
                  {reminder.status === "pending" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void completeReminder({ id: reminder.id as Id<"reminders"> })}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Complete
                    </Button>
                  )}
                </div>
              ))}
              {reminders.length === 0 && <p className="text-sm text-ink-300">No reminders for this application.</p>}
            </div>
            <form onSubmit={saveReminder} className="mt-4 grid gap-2 border-t border-line/70 pt-4">
              <Input
                value={reminderTitle}
                onChange={(event) => setReminderTitle(event.target.value)}
                placeholder="Reminder title"
              />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input type="date" value={reminderDue} onChange={(event) => setReminderDue(event.target.value)} />
                <select
                  value={reminderType}
                  onChange={(event) => setReminderType(event.target.value as typeof reminderType)}
                  className={selectClass}
                >
                  <option value="follow_up">Follow-up</option>
                  <option value="deadline">Deadline</option>
                  <option value="general">General</option>
                </select>
              </div>
              <Button type="submit" variant="secondary">
                <Plus className="size-4" />
                Add reminder
              </Button>
            </form>
          </Panel>

          {/* Offer */}
          <Panel title="Offer" icon={Award}>
            <form onSubmit={saveOffer} className="grid gap-2">
              <Input
                value={offer.offerComp}
                onChange={(event) => setOffer((current) => ({ ...current, offerComp: event.target.value }))}
                placeholder={application.offerComp || "Comp summary (e.g. $160k + 0.2%)"}
              />
              <Input
                type="date"
                value={offer.offerResponseDeadlineAt}
                onChange={(event) =>
                  setOffer((current) => ({ ...current, offerResponseDeadlineAt: event.target.value }))
                }
              />
              <select
                value={offer.offerDecision}
                onChange={(event) => setOffer((current) => ({ ...current, offerDecision: event.target.value }))}
                className={selectClass}
              >
                <option value="">Decision</option>
                {OFFER_DECISIONS.map((decision) => (
                  <option key={decision} value={decision}>
                    {OFFER_DECISION_LABELS[decision]}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary">
                <Save className="size-4" />
                Save offer
              </Button>
            </form>
          </Panel>

          {/* Outcome */}
          <Panel title="Record outcome" icon={ListChecks}>
            <form onSubmit={saveOutcome} className="grid gap-2">
              <select
                value={outcome.closedOutcome}
                onChange={(event) => setOutcome((current) => ({ ...current, closedOutcome: event.target.value }))}
                className={selectClass}
              >
                {CLOSED_OUTCOMES.map((value) => (
                  <option key={value} value={value}>
                    {CLOSED_OUTCOME_LABELS[value]}
                  </option>
                ))}
              </select>
              <select
                value={outcome.rejectionStage}
                onChange={(event) => setOutcome((current) => ({ ...current, rejectionStage: event.target.value }))}
                className={selectClass}
              >
                {REJECTION_STAGES.map((value) => (
                  <option key={value} value={value}>
                    {REJECTION_STAGE_LABELS[value]}
                  </option>
                ))}
              </select>
              <select
                value={outcome.rejectionReason}
                onChange={(event) => setOutcome((current) => ({ ...current, rejectionReason: event.target.value }))}
                className={selectClass}
              >
                {REJECTION_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {REJECTION_REASON_LABELS[value]}
                  </option>
                ))}
              </select>
              <Textarea
                value={outcome.rejectionFeedback}
                onChange={(event) => setOutcome((current) => ({ ...current, rejectionFeedback: event.target.value }))}
                placeholder="Feedback"
              />
              <Textarea
                value={outcome.rejectionLessons}
                onChange={(event) => setOutcome((current) => ({ ...current, rejectionLessons: event.target.value }))}
                placeholder="Lessons learned"
              />
              <Input
                type="date"
                value={outcome.reapplyAfter}
                onChange={(event) => setOutcome((current) => ({ ...current, reapplyAfter: event.target.value }))}
              />
              <Button type="submit" variant="secondary">
                <Send className="size-4" />
                Record outcome
              </Button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  )
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface-1/60 p-3">
      <p className="micro-label">{label}</p>
      <p className={cn("mt-1 text-sm", mono && "font-mono tabular")}>{value}</p>
    </div>
  )
}
