"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAction, useMutation } from "convex/react"
import {
  Activity,
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Award,
  Briefcase,
  CalendarPlus,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  ListChecks,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  OFFER_DECISION_LABELS,
  REFERRAL_LABELS,
  SOURCE_LABELS,
  STAGE_LABELS,
  WORK_ARRANGEMENT_LABELS,
  formatApplicationSalary,
  type ApplicationRecord,
  type ApplicationStage,
} from "@/lib/application-model"
import { CONTACT_RELATIONSHIP_LABELS, contactInitials, type ContactRelationship } from "@/lib/contact-model"
import { daysBetween, formatShortDate } from "@/lib/date-model"
import {
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_RESULT_LABELS,
  INTERVIEW_STATUS_LABELS,
  getInterviewStart,
  formatInterviewDay,
  formatInterviewTime,
  interviewHeadline,
  interviewResultTone,
  type InterviewFormat,
  type InterviewResult,
  type InterviewStatus,
} from "@/lib/interview-model"
import { formatOfferBase, formatOfferTotal, offerDecisionTone } from "@/lib/offer-model"
import {
  CLOSED_OUTCOME_LABELS,
  REJECTION_REASON_LABELS,
  REJECTION_STAGE_LABELS,
} from "@/lib/rejection-model"
import { calculateQualityScore } from "@/lib/quality-model"
import { cn } from "@/lib/utils"
import { ApplicationFormSheet } from "./application-form-sheet"
import { ContactFormSheet } from "./contact-form-sheet"
import { InterviewFormSheet } from "./interview-form-sheet"
import { OfferSheet, OutcomeSheet } from "./offer-outcome-sheets"
import { TaskFormSheet } from "./task-form-sheet"
import { FadeIn } from "./atmosphere"
import { EmptyState, LoadingPanels, Panel, ProgressBar, StageBadge, StageSelect } from "./common"
import {
  mapActivity,
  mapApplication,
  mapContact,
  mapInterview,
  mapOffer,
  mapResume,
  mapStageHistory,
  mapTask,
} from "./data-mappers"
import { useAppData } from "./use-app-data"

const TABS = ["overview", "interviews", "people", "activity", "offer"] as const
type Tab = (typeof TABS)[number]

const eventDot: Record<string, string> = {
  created: "bg-stage-saved",
  stage_changed: "bg-stage-interview",
  edited: "bg-status-info",
  resume_linked: "bg-brand",
  task_completed: "bg-status-up",
  note: "bg-ink-500",
  manual: "bg-ink-500",
  contact_added: "bg-stage-phone",
  interview_scheduled: "bg-stage-interview",
  offer_recorded: "bg-stage-offer",
}

const resultBadge: Record<string, "success" | "danger" | "warn" | "outline"> = {
  up: "success",
  down: "danger",
  warn: "warn",
  neutral: "outline",
}

export function ApplicationDetailPage({ id }: { id: string }) {
  const { data, isLoading } = useAppData()
  const searchParams = useSearchParams()
  const updateApplication = useMutation(api.applications.update)
  const moveStage = useMutation(api.applications.moveStage)
  const updateQualityCheck = useMutation(api.applications.updateQualityCheck)
  const addManualActivity = useMutation(api.activity.addManual)
  const completeTask = useMutation(api.tasks.complete)
  const removeContact = useMutation(api.contacts.remove)
  const setOfferDecision = useMutation(api.offers.setDecision)
  const setOfferCurrent = useMutation(api.offers.setCurrent)

  const initialTab = (searchParams.get("tab") ?? "overview") as Tab
  const [tab, setTab] = React.useState<Tab>(TABS.includes(initialTab) ? initialTab : "overview")
  const [note, setNote] = React.useState("")
  const [now] = React.useState(() => Date.now())
  const [editingInterview, setEditingInterview] = React.useState<Doc<"applicationInterviews"> | null>(null)
  const [editingContact, setEditingContact] = React.useState<Doc<"applicationContacts"> | null>(null)

  if (isLoading) return <LoadingPanels />
  if (!data) {
    return <EmptyState title="Application unavailable" description="Sign in to load this application." />
  }

  const applicationDoc = data.applications.find((application) => application._id === id)
  if (!applicationDoc) {
    return (
      <EmptyState
        title="Application not found"
        description="This record is not in your account."
        href="/app/applications"
        actionLabel="Back to pipeline"
      />
    )
  }

  const application = mapApplication(applicationDoc)
  const applicationId = applicationDoc._id
  const resumes = data.resumes.map(mapResume)
  const linkedResume = resumes.find((resume) => resume.id === application.currentResumeId)
  const contactDocs = data.applicationContacts.filter((contact) => contact.applicationId === applicationId)
  const contacts = contactDocs.map(mapContact)
  const interviewDocs = data.applicationInterviews.filter((interview) => interview.applicationId === applicationId)
  const interviews = interviewDocs
    .map(mapInterview)
    .sort((a, b) => (getInterviewStart(b) ?? 0) - (getInterviewStart(a) ?? 0))
  const offers = data.applicationOffers
    .map(mapOffer)
    .filter((offer) => offer.applicationId === applicationId)
    .sort((a, b) => b.versionNumber - a.versionNumber)
  const activity = data.activityEvents
    .filter((event) => event.applicationId === applicationId)
    .map(mapActivity)
    .sort((a, b) => b.eventAt - a.eventAt)
  const tasks = data.tasks
    .filter((task) => task.applicationId === applicationId)
    .map(mapTask)
    .sort((a, b) => String(a.dueDate ?? a.dueAt ?? "").localeCompare(String(b.dueDate ?? b.dueAt ?? "")))
  const stageJourney = data.applicationStageHistory
    .filter((entry) => entry.applicationId === applicationId)
    .map(mapStageHistory)
    .sort((a, b) => a.enteredAt - b.enteredAt)

  const qualityScore = calculateQualityScore(application.qualityChecks)
  const checkedCount = application.qualityChecks.filter((check) => check.checked).length
  const nextInterview = interviews
    .filter((interview) => (interview.status === "scheduled" || interview.status === "rescheduled") && (getInterviewStart(interview) ?? 0) >= now)
    .sort((a, b) => (getInterviewStart(a) ?? 0) - (getInterviewStart(b) ?? 0))[0]
  const contactDocById = new Map(contactDocs.map((doc) => [doc._id, doc]))
  const interviewDocById = new Map(interviewDocs.map((doc) => [doc._id, doc]))

  async function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!note.trim()) return
    await addManualActivity({ applicationId, title: note.trim() })
    setNote("")
    toast.success("Note added")
  }

  const tabMeta: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { value: "overview", label: "Overview", icon: MapPin },
    { value: "interviews", label: "Interviews", icon: CalendarPlus, count: interviews.length },
    { value: "people", label: "People", icon: Users, count: contacts.length },
    { value: "activity", label: "Activity", icon: Activity, count: activity.length },
    { value: "offer", label: "Offer & Outcome", icon: Award, count: offers.length },
  ]

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <FadeIn>
        <div className="glass relative mb-5 overflow-hidden rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href="/app/applications"
                className="micro-label mb-2.5 inline-flex items-center gap-1.5 transition-colors hover:text-ink-300"
              >
                <ArrowLeft className="size-3" />
                Pipeline
              </Link>
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
                {application.companyName}
              </h1>
              <p className="mt-0.5 text-sm text-ink-300">{application.roleTitle}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StageBadge stage={application.stage} />
                <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-1/60 px-2 py-0.5 text-xs">
                  <Award className="size-3 text-brand" />
                  <span className="font-mono tabular">{qualityScore}</span>
                  <span className="text-ink-500">quality</span>
                </span>
                {application.workArrangement && (
                  <Badge variant="outline" className="gap-1.5">
                    <Briefcase className="size-3" />
                    {WORK_ARRANGEMENT_LABELS[application.workArrangement]}
                  </Badge>
                )}
                {application.referralStatus && application.referralStatus !== "not_checked" && (
                  <Badge variant="outline">{REFERRAL_LABELS[application.referralStatus]}</Badge>
                )}
                {application.archived && <Badge variant="warn">Archived</Badge>}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <StageSelect
                value={application.stage}
                onChange={(stage) => void moveStage({ id: applicationId as Id<"applications">, stage })}
                className="h-8 w-36"
              />
              <ApplicationFormSheet
                application={applicationDoc}
                resumes={data.resumes}
                trigger={
                  <Button variant="secondary" size="sm">
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                }
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="More actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onSelect={() =>
                      void updateApplication({ id: applicationId, archived: !application.archived }).then(() =>
                        toast.success(application.archived ? "Restored" : "Archived")
                      )
                    }
                  >
                    <Archive className="size-4" />
                    {application.archived ? "Restore" : "Archive"}
                  </DropdownMenuItem>
                  {application.postingUrl && (
                    <DropdownMenuItem asChild>
                      <a href={application.postingUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" /> Open posting
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {nextInterview && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-stage-interview/25 bg-stage-interview/[0.07] px-3 py-2 text-sm">
              <CalendarPlus className="size-4 shrink-0 text-stage-interview" />
              <span className="text-ink-300">
                Next: <span className="font-medium text-ink-100">{interviewHeadline(nextInterview)}</span> ·{" "}
                {formatInterviewDay(getInterviewStart(nextInterview))} {formatInterviewTime(getInterviewStart(nextInterview))}
              </span>
              <Link href={`/app/interviews?focus=${nextInterview.id}`} className="ml-auto">
                <ArrowUpRight className="size-4 text-ink-500 transition-colors hover:text-stage-interview" />
              </Link>
            </div>
          )}
        </div>
      </FadeIn>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList variant="line" className="mb-5 flex-wrap gap-1 overflow-x-auto">
          {tabMeta.map(({ value, label, icon: Icon, count }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              <Icon className="size-3.5" />
              {label}
              {count !== undefined && count > 0 && (
                <span className="ml-0.5 rounded bg-surface-3 px-1.5 font-mono text-[10px] tabular text-ink-300">
                  {count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="grid content-start gap-4">
              {stageJourney.length > 0 && (
                <Panel title="Stage journey" icon={Clock}>
                  <StageJourney journey={stageJourney} now={now} />
                </Panel>
              )}

              <Panel title="Details" icon={MapPin}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Fact label="Location" value={application.location ?? "Not set"} />
                  <Fact label="Salary" value={formatApplicationSalary(application)} />
                  <Fact label="Source" value={application.source ? SOURCE_LABELS[application.source] : "Not set"} />
                  <Fact label="Applied" value={formatShortDate(application.dateAppliedDate)} mono />
                  <Fact label="App deadline" value={formatShortDate(application.applicationDeadlineDate)} mono />
                  <Fact label="Take-home" value={formatShortDate(application.takeHomeDeadlineDate)} mono />
                </div>
                {application.postingUrl && (
                  <a
                    href={application.postingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand transition-colors hover:underline"
                  >
                    <ExternalLink className="size-3.5" /> View posting
                  </a>
                )}
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

            <div className="grid content-start gap-4">
              <Panel title="Application quality" icon={Award}>
                <div className="flex items-center gap-4">
                  <QualityRing score={qualityScore} />
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
                <div className="mt-4 grid gap-1 border-t border-line/70 pt-4">
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

              <MatchPanel application={application} applicationId={applicationId} />

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
            </div>
          </div>
        </TabsContent>

        {/* Interviews */}
        <TabsContent value="interviews">
          <SectionToolbar
            title={`${interviews.length} round${interviews.length === 1 ? "" : "s"}`}
            action={
              <InterviewFormSheet
                applications={data.applications}
                contacts={data.applicationContacts}
                applicationId={applicationId}
                trigger={
                  <Button size="sm">
                    <CalendarPlus className="size-3.5" /> Schedule
                  </Button>
                }
              />
            }
          />
          {interviews.length === 0 ? (
            <EmptyState icon={CalendarPlus} title="No interviews logged" description="Schedule a round to get a prep workspace and feedback capture." />
          ) : (
            <div className="grid gap-2.5">
              {interviews.map((interview) => {
                const start = getInterviewStart(interview)
                const tone = interviewResultTone(interview.result)
                return (
                  <div key={interview.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3">
                    <div className="flex w-16 shrink-0 flex-col items-center rounded-lg border border-line bg-surface-1/70 py-1.5">
                      <span className="font-mono text-sm font-semibold tabular text-ink-100">
                        {start !== undefined ? formatInterviewTime(start) : "TBD"}
                      </span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-500">
                        {start !== undefined ? formatInterviewDay(start).split(" ").slice(0, 2).join(" ") : "—"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{interviewHeadline(interview)}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                        {interview.format && <span>{INTERVIEW_FORMAT_LABELS[interview.format as InterviewFormat]}</span>}
                        <span>· {INTERVIEW_STATUS_LABELS[interview.status as InterviewStatus]}</span>
                        {interview.contactIds.length > 0 && (
                          <span className="flex items-center gap-1">· <Users className="size-3" /> {interview.contactIds.length}</span>
                        )}
                      </p>
                    </div>
                    {interview.result && interview.result !== "pending" && (
                      <Badge variant={resultBadge[tone]} className="shrink-0 capitalize">
                        {INTERVIEW_RESULT_LABELS[interview.result as InterviewResult]}
                      </Badge>
                    )}
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Open prep">
                      <Link href={`/app/interviews?focus=${interview.id}`}>
                        <ArrowUpRight className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit interview"
                      onClick={() => setEditingInterview(interviewDocById.get(interview.id as Id<"applicationInterviews">) ?? null)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* People */}
        <TabsContent value="people">
          <SectionToolbar
            title={`${contacts.length} ${contacts.length === 1 ? "person" : "people"}`}
            action={
              <ContactFormSheet
                applications={data.applications}
                applicationId={applicationId}
                trigger={
                  <Button size="sm">
                    <UserPlus className="size-3.5" /> Add contact
                  </Button>
                }
              />
            }
          />
          {contacts.length === 0 ? (
            <EmptyState icon={Users} title="No contacts yet" description="Add recruiters, referrers, and interviewers tied to this application." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {contacts.map((contact) => (
                <article key={contact.id} className="flex flex-col rounded-xl border border-line bg-surface-2/50 p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-hover to-brand text-sm font-semibold text-primary-foreground">
                      {contactInitials(contact.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{contact.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {CONTACT_RELATIONSHIP_LABELS[contact.relationshipType as ContactRelationship]}
                        {contact.roleTitle ? ` · ${contact.roleTitle}` : ""}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Contact actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onSelect={() => setEditingContact(contactDocById.get(contact.id as Id<"applicationContacts">) ?? null)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            void removeContact({ id: contact.id as Id<"applicationContacts"> }).then(() =>
                              toast.success("Contact removed")
                            )
                          }
                        >
                          <Trash2 className="size-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {contact.notes && <p className="mt-2.5 line-clamp-2 text-xs text-ink-300">“{contact.notes}”</p>}
                  <div className="mt-auto flex items-center gap-1.5 pt-3">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex size-7 items-center justify-center rounded-md border border-line bg-surface-1/60 text-ink-300 transition-colors hover:border-brand/40 hover:text-brand">
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    {contact.linkedinUrl && (
                      <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="flex size-7 items-center justify-center rounded-md border border-line bg-surface-1/60 text-ink-300 transition-colors hover:border-brand/40 hover:text-brand">
                        <Link2 className="size-3.5" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Tasks"
              icon={ListChecks}
              action={
                <TaskFormSheet
                  applications={data.applications}
                  applicationId={applicationId}
                  trigger={
                    <Button variant="secondary" size="xs">
                      <Plus className="size-3.5" /> Add
                    </Button>
                  }
                />
              }
            >
              {tasks.length ? (
                <div className="grid gap-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-1/60 p-3">
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-medium", task.status === "completed" && "text-ink-500 line-through")}>
                          {task.title}
                        </p>
                        <p className="flex items-center gap-1.5 font-mono text-xs tabular text-ink-500">
                          {formatShortDate(task.dueAt ?? task.dueDate)}
                          <Badge
                            variant={task.status === "completed" ? "success" : task.status === "pending" ? "warn" : "outline"}
                            className="h-4 px-1.5 text-[10px] capitalize"
                          >
                            {task.status}
                          </Badge>
                        </p>
                      </div>
                      {task.status === "pending" && (
                        <Button size="sm" variant="secondary" onClick={() => void completeTask({ id: task.id as Id<"tasks"> }).then(() => toast.success("Task completed"))}>
                          <CheckCircle2 className="size-3.5" /> Done
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-300">No tasks yet.</p>
              )}
            </Panel>

            <Panel title="Timeline" icon={Clock} action={<span className="font-mono text-xs tabular text-ink-500">{activity.length}</span>}>
              <div className="relative grid gap-0 before:absolute before:bottom-2 before:left-[6px] before:top-2 before:w-px before:bg-line">
                {activity.map((event) => (
                  <div key={event.id} className="relative py-2 pl-6">
                    <span className={cn("absolute left-0 top-3 size-3 rounded-full border-2 border-surface-2", eventDot[event.type] ?? "bg-ink-500")} />
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-medium">{event.title}</p>
                      <span className="shrink-0 font-mono text-xs tabular text-ink-500">{formatShortDate(event.eventAt)}</span>
                    </div>
                    {event.description && <p className="mt-0.5 text-xs text-ink-500">{event.description}</p>}
                  </div>
                ))}
              </div>
              <form onSubmit={saveNote} className="mt-4 grid gap-2 border-t border-line/70 pt-4">
                <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note to the timeline…" />
                <Button type="submit" variant="secondary" size="sm" className="w-fit">
                  <Plus className="size-3.5" /> Add note
                </Button>
              </form>
            </Panel>
          </div>
        </TabsContent>

        {/* Offer & Outcome */}
        <TabsContent value="offer">
          <div className="grid gap-4">
            <SectionToolbar
              title="Offers"
              action={
                <OfferSheet
                  applicationId={applicationId}
                  trigger={
                    <Button size="sm">
                      <CircleDollarSign className="size-3.5" /> Record offer
                    </Button>
                  }
                />
              }
            />
            {offers.length === 0 ? (
              <EmptyState icon={Award} title="No offers recorded" description="When an offer lands, record it here to track comp and your decision." />
            ) : (
              <div className="grid gap-3">
                {offers.map((offer) => {
                  const tone = offerDecisionTone(offer.decision)
                  return (
                    <div
                      key={offer.id}
                      className={cn(
                        "rounded-xl border p-4",
                        offer.isCurrent ? "border-stage-offer/35 bg-stage-offer/[0.05]" : "border-line bg-surface-2/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">Version {offer.versionNumber}</span>
                          {offer.isCurrent && <Badge variant="success" className="gap-1"><Star className="size-3" /> Current</Badge>}
                        </div>
                        <Badge
                          variant={tone === "up" ? "success" : tone === "down" ? "danger" : tone === "info" ? "info" : "warn"}
                          className="capitalize"
                        >
                          {OFFER_DECISION_LABELS[offer.decision]}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MiniFact label="Base" value={formatOfferBase(offer)} />
                        <MiniFact label="Bonus" value={offer.bonusAmount ? `$${offer.bonusAmount.toLocaleString()}` : "—"} />
                        <MiniFact label="Total" value={formatOfferTotal(offer) ?? "—"} />
                        <MiniFact label="Respond by" value={formatShortDate(offer.responseDeadlineDate)} />
                      </div>
                      {offer.equitySummary && <p className="mt-2.5 text-xs text-ink-300">Equity: {offer.equitySummary}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-3">
                        {(["accepted", "negotiating", "declined"] as const).map((decision) => (
                          <Button
                            key={decision}
                            variant="ghost"
                            size="xs"
                            className={offer.decision === decision ? "text-brand" : "text-ink-300"}
                            onClick={() => void setOfferDecision({ id: offer.id as Id<"applicationOffers">, decision }).then(() => toast.success(`Marked ${decision}`))}
                          >
                            {offer.decision === decision && <Check className="size-3" />}
                            {OFFER_DECISION_LABELS[decision]}
                          </Button>
                        ))}
                        {!offer.isCurrent && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="ml-auto text-ink-300"
                            onClick={() => void setOfferCurrent({ id: offer.id as Id<"applicationOffers"> }).then(() => toast.success("Set as current"))}
                          >
                            <Star className="size-3" /> Make current
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <SectionToolbar
              title="Outcome"
              action={
                <OutcomeSheet
                  applicationId={applicationId}
                  trigger={
                    <Button variant="secondary" size="sm">
                      <ListChecks className="size-3.5" /> Record outcome
                    </Button>
                  }
                />
              }
            />
            {application.stage === "closed" || application.closedOutcome ? (
              <Panel title="Closed" icon={ListChecks}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Fact label="Outcome" value={application.closedOutcome ? CLOSED_OUTCOME_LABELS[application.closedOutcome] : "—"} />
                  <Fact label="Rejection stage" value={application.rejectionStage ? REJECTION_STAGE_LABELS[application.rejectionStage] : "—"} />
                  <Fact label="Reason" value={application.rejectionReason ? REJECTION_REASON_LABELS[application.rejectionReason] : "—"} />
                  <Fact label="Reapply after" value={formatShortDate(application.reapplyAfterDate)} mono />
                </div>
                {application.rejectionFeedback && (
                  <div className="mt-3">
                    <p className="micro-label mb-1">Feedback</p>
                    <p className="text-sm leading-relaxed text-ink-300">{application.rejectionFeedback}</p>
                  </div>
                )}
                {application.rejectionLessons && (
                  <div className="mt-3">
                    <p className="micro-label mb-1">Lessons learned</p>
                    <p className="text-sm leading-relaxed text-ink-300">{application.rejectionLessons}</p>
                  </div>
                )}
              </Panel>
            ) : (
              <p className="rounded-xl border border-dashed border-line/70 bg-surface-1/40 px-4 py-5 text-sm text-ink-500">
                This application is still open. Record an outcome when it closes to capture lessons learned.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit sheets driven from inside tabs */}
      {editingInterview && (
        <InterviewFormSheet
          applications={data.applications}
          contacts={data.applicationContacts}
          interview={editingInterview}
          open={Boolean(editingInterview)}
          onOpenChange={(open) => !open && setEditingInterview(null)}
        />
      )}
      {editingContact && (
        <ContactFormSheet
          applications={data.applications}
          contact={editingContact}
          open={Boolean(editingContact)}
          onOpenChange={(open) => !open && setEditingContact(null)}
        />
      )}
    </>
  )
}

/* ── Building blocks ───────────────────────────────────────────────────── */

function MatchPanel({
  application,
  applicationId,
}: {
  application: ApplicationRecord
  applicationId: Id<"applications">
}) {
  const analyzeMatch = useAction(api.matchAnalysis.analyze)
  const [analyzing, setAnalyzing] = React.useState(false)

  const analysis = application.matchAnalysis
  const hasJd = Boolean(application.jobDescriptionSnapshot?.trim())
  const hasResume = Boolean(application.currentResumeId)
  const canAnalyze = hasJd && hasResume
  const resumeChanged =
    analysis !== undefined &&
    application.currentResumeId !== undefined &&
    analysis.resumeId !== application.currentResumeId

  async function runAnalysis() {
    setAnalyzing(true)
    try {
      await analyzeMatch({ applicationId })
      toast.success("Match analysis updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed. Try again.")
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Panel
      title="Resume ↔ JD match"
      icon={Sparkles}
      action={
        <Button
          size="xs"
          variant="secondary"
          disabled={!canAnalyze || analyzing}
          onClick={() => void runAnalysis()}
        >
          {analyzing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {analyzing ? "Analyzing…" : analysis ? "Re-run" : "Analyze"}
        </Button>
      }
    >
      {!analysis ? (
        <p className="text-sm leading-relaxed text-ink-300">
          {canAnalyze
            ? "Run an AI comparison of the linked resume against the saved job description: fit score, missing keywords, and tailoring suggestions."
            : [
                "To analyze, this application needs",
                [!hasJd && "a job description snapshot", !hasResume && "a linked resume"]
                  .filter(Boolean)
                  .join(" and "),
                "— add via Edit.",
              ].join(" ")}
        </p>
      ) : (
        <div className="grid gap-3.5">
          <div className="flex items-center gap-4">
            <MatchRing score={analysis.score} />
            <p className="text-sm leading-relaxed text-ink-300">{analysis.summary}</p>
          </div>

          {resumeChanged && (
            <p className="rounded-lg border border-status-warn/30 bg-status-warn/[0.08] px-3 py-2 text-xs text-status-warn">
              The linked resume changed since this analysis — re-run for fresh results.
            </p>
          )}

          {analysis.missingKeywords.length > 0 && (
            <div>
              <p className="micro-label mb-1.5">Missing from the resume</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingKeywords.map((keyword) => (
                  <Badge key={keyword} variant="warn">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {analysis.suggestions.length > 0 && (
            <div>
              <p className="micro-label mb-1.5">Tailoring suggestions</p>
              <ol className="grid list-decimal gap-1.5 pl-4 text-sm leading-relaxed text-ink-300 marker:font-mono marker:text-xs marker:text-ink-500">
                {analysis.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ol>
            </div>
          )}

          <p className="border-t border-line/70 pt-2.5 text-[11px] text-ink-500">
            {analysis.matchedKeywords.length} keywords matched · vs “{analysis.resumeLabel}” ·{" "}
            {analysis.model} · {formatShortDate(analysis.analyzedAt)}
          </p>
        </div>
      )}
    </Panel>
  )
}

function MatchRing({ score }: { score: number }) {
  const tone =
    score >= 70 ? "var(--status-up)" : score >= 40 ? "var(--status-warn)" : "var(--status-down)"
  return (
    <div className="relative flex size-20 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-3)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 97.4} 97.4`}
          style={{ filter: `drop-shadow(0 0 4px color-mix(in oklch, ${tone} 60%, transparent))` }}
        />
      </svg>
      <span className="absolute font-mono text-lg font-semibold tabular">{score}</span>
    </div>
  )
}

function SectionToolbar({ title, action }: { title: string; action: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
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

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="micro-label">{label}</p>
      <p className="mt-0.5 font-mono text-sm tabular">{value}</p>
    </div>
  )
}

function QualityRing({ score }: { score: number }) {
  return (
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
          strokeDasharray={`${(score / 100) * 97.4} 97.4`}
          style={{ filter: "drop-shadow(0 0 4px color-mix(in oklch, var(--brand) 60%, transparent))" }}
        />
      </svg>
      <span className="absolute font-mono text-lg font-semibold tabular">{score}</span>
    </div>
  )
}

function StageJourney({ journey, now }: { journey: ReturnType<typeof mapStageHistory>[]; now: number }) {
  return (
    <div className="flex flex-wrap items-stretch gap-1.5">
      {journey.map((entry, index) => {
        const duration = daysBetween(entry.enteredAt, entry.exitedAt ?? now)
        const isCurrent = entry.exitedAt === undefined
        return (
          <React.Fragment key={entry.id}>
            <div
              className={cn(
                "flex min-w-24 flex-1 flex-col rounded-lg border px-3 py-2",
                isCurrent ? "border-brand/40 bg-brand-weak" : "border-line bg-surface-1/60"
              )}
            >
              <span className={cn("text-xs font-medium", isCurrent ? "text-brand" : "text-ink-300")}>
                {STAGE_LABELS[entry.stage as ApplicationStage]}
              </span>
              <span className="mt-0.5 font-mono text-[11px] tabular text-ink-500">
                {duration === undefined ? "—" : duration === 0 ? "same day" : `${duration}d`}
                {isCurrent && " · now"}
              </span>
            </div>
            {index < journey.length - 1 && (
              <span className="flex items-center text-ink-500" aria-hidden>
                →
              </span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
