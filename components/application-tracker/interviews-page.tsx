"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMutation } from "convex/react"
import {
  ArrowUpRight,
  CalendarClock,
  CalendarPlus,
  Check,
  CircleSlash,
  Clock,
  ExternalLink,
  MessageSquare,
  Pencil,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CONTACT_RELATIONSHIP_LABELS, contactInitials, type ContactRelationship } from "@/lib/contact-model"
import { addDays, formatShortDate } from "@/lib/date-model"
import { getMondayWeekStart } from "@/lib/goals-model"
import { startOfDay } from "@/lib/task-model"
import {
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_RESULT_LABELS,
  INTERVIEW_RESULTS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  enrichInterviews,
  formatInterviewDay,
  formatInterviewTime,
  getInterviewStart,
  groupInterviews,
  interviewHeadline,
  interviewResultTone,
  needsFeedback,
  type EnrichedInterview,
  type InterviewFormat,
  type InterviewResult,
  type InterviewStatus,
  type InterviewType,
} from "@/lib/interview-model"
import { cn } from "@/lib/utils"
import { InterviewFormSheet } from "./interview-form-sheet"
import { CountUp, Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, PageHeader } from "./common"
import { PageSkeleton } from "./skeletons"
import { mapApplication, mapInterview } from "./data-mappers"
import { useAppData } from "./use-app-data"

const toneClass: Record<string, string> = {
  up: "text-status-up",
  down: "text-status-down",
  warn: "text-status-warn",
  neutral: "text-ink-500",
}

const resultBadgeVariant: Record<string, "success" | "danger" | "warn" | "outline"> = {
  up: "success",
  down: "danger",
  warn: "warn",
  neutral: "outline",
}

export function InterviewsPage() {
  const { data, isLoading } = useAppData("interviews")
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = React.useState<string | null>(() => searchParams.get("focus"))
  const [editing, setEditing] = React.useState<Doc<"applicationInterviews"> | null>(null)
  const [scheduling, setScheduling] = React.useState(false)
  const [dayFilter, setDayFilter] = React.useState<number | null>(null)

  if (isLoading) return <PageSkeleton action columns="1fr" panels={2} />
  if (!data) {
    return <EmptyState title="Interviews unavailable" description="Sign in to load your interview schedule." />
  }

  const applications = data.applications.map(mapApplication)
  const interviewDocs = data.applicationInterviews
  const enriched = enrichInterviews(interviewDocs.map(mapInterview), applications)
  const grouped = groupInterviews(enriched)
  const upcomingCount = grouped.today.length + grouped.week.length + grouped.later.length
  const feedbackCount = enriched.filter((item) => needsFeedback(item.interview)).length

  const selectedDoc = selectedId ? interviewDocs.find((doc) => doc._id === selectedId) ?? null : null

  function filterByDay(items: EnrichedInterview[]) {
    if (dayFilter === null) return items
    const dayEnd = addDays(new Date(dayFilter), 1).getTime()
    return items.filter((item) => item.start !== undefined && item.start >= dayFilter && item.start < dayEnd)
  }

  const dayGrouped = {
    today: filterByDay(grouped.today),
    week: filterByDay(grouped.week),
    later: filterByDay(grouped.later),
    past: filterByDay(grouped.past),
  }
  const dayFilteredTotal =
    dayGrouped.today.length + dayGrouped.week.length + dayGrouped.later.length + dayGrouped.past.length

  return (
    <>
      <PageHeader
        eyebrow="Interviews"
        title="Your interview schedule"
        description="Upcoming rounds, prep workspaces, and feedback capture — all linked to the application and the people involved."
        action={
          <Button onClick={() => setScheduling(true)}>
            <CalendarPlus className="size-4" />
            Schedule
          </Button>
        }
      />

      {/* Week strip + counts */}
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <WeekStrip enriched={enriched} selectedDay={dayFilter} onSelectDay={setDayFilter} />
        <div className="flex gap-2">
          <Stat label="Upcoming" value={upcomingCount} tone="brand" />
          <Stat label="Need feedback" value={feedbackCount} tone="warn" />
        </div>
      </div>

      {dayFilter !== null && (
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            aria-label={`Clear ${formatInterviewDay(dayFilter)} day filter`}
            onClick={() => setDayFilter(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-weak px-2.5 py-1 text-xs text-brand transition-colors hover:border-brand/60"
          >
            {formatInterviewDay(dayFilter)}
            <X className="size-3" />
          </button>
          <span className="font-mono text-xs tabular text-ink-500">{dayFilteredTotal} shown</span>
        </div>
      )}

      {enriched.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No interviews yet"
          description="When you land a screen or a round, schedule it here to get a prep workspace and feedback capture."
          action={
            <Button onClick={() => setScheduling(true)}>
              <CalendarPlus className="size-4" />
              Schedule an interview
            </Button>
          }
        />
      ) : dayFilter !== null && dayFilteredTotal === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No interviews that day"
          description="Clear the day filter to see your full schedule."
          action={
            <Button variant="secondary" onClick={() => setDayFilter(null)}>
              <X className="size-4" />
              Clear day filter
            </Button>
          }
        />
      ) : (
        <Stagger className="grid gap-6">
          <AgendaGroup title="Today" tone="stage-interview" items={dayGrouped.today} onSelect={setSelectedId} />
          <AgendaGroup title="This week" tone="brand" items={dayGrouped.week} onSelect={setSelectedId} />
          <AgendaGroup title="Later" tone="ink-300" items={dayGrouped.later} onSelect={setSelectedId} />
          <AgendaGroup title="Past" tone="ink-500" items={dayGrouped.past} onSelect={setSelectedId} past />
        </Stagger>
      )}

      {/* Prep drawer */}
      <PrepDrawer
        doc={selectedDoc}
        contacts={data.applicationContacts}
        applications={applications}
        onClose={() => setSelectedId(null)}
        onEdit={(doc) => {
          setSelectedId(null)
          setEditing(doc)
        }}
      />

      {/* Edit + schedule sheets (controlled) */}
      <InterviewFormSheet
        applications={data.applications}
        contacts={data.applicationContacts}
        open={scheduling}
        onOpenChange={setScheduling}
      />
      {editing && (
        <InterviewFormSheet
          applications={data.applications}
          contacts={data.applicationContacts}
          interview={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "brand" | "warn" }) {
  return (
    <div className="glass flex min-w-24 flex-col rounded-xl px-3.5 py-2.5">
      <span className="micro-label">{label}</span>
      <span
        className={cn(
          "font-mono text-2xl font-semibold tabular",
          tone === "warn" && value > 0 ? "text-status-warn" : "text-ink-100"
        )}
      >
        <CountUp value={value} />
      </span>
    </div>
  )
}

function WeekStrip({
  enriched,
  selectedDay,
  onSelectDay,
}: {
  enriched: EnrichedInterview[]
  selectedDay: number | null
  onSelectDay: (day: number | null) => void
}) {
  const monday = getMondayWeekStart()
  const todayKey = startOfDay(new Date()).getTime()
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    return date
  })

  function countOn(date: Date) {
    const dayStart = startOfDay(date).getTime()
    const dayEnd = dayStart + 86_400_000
    return enriched.filter((item) => {
      const start = getInterviewStart(item.interview)
      return start !== undefined && start >= dayStart && start < dayEnd
    }).length
  }

  return (
    <div className="glass grid grid-cols-7 gap-1 rounded-xl p-2">
      {days.map((date) => {
        const dayStart = startOfDay(date).getTime()
        const count = countOn(date)
        const isToday = dayStart === todayKey
        const isSelected = selectedDay === dayStart
        const label = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }).format(date)
        return (
          <button
            key={date.toISOString()}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${label} · ${count} interview${count === 1 ? "" : "s"}`}
            onClick={() => onSelectDay(isSelected ? null : dayStart)}
            className={cn(
              "flex flex-col items-center rounded-lg py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isSelected
                ? "bg-brand text-primary-foreground"
                : isToday
                  ? "bg-brand-weak hover:bg-brand-weak/80"
                  : "hover:bg-surface-3/40"
            )}
          >
            <span
              className={cn(
                "text-[10px] uppercase tracking-wide",
                isSelected ? "text-primary-foreground/80" : "text-ink-500"
              )}
            >
              {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)}
            </span>
            <span
              className={cn(
                "mt-0.5 font-mono text-sm tabular",
                isSelected ? "text-primary-foreground" : isToday ? "text-brand" : "text-ink-300"
              )}
            >
              {date.getDate()}
            </span>
            <span className="mt-1 flex h-3 items-center gap-0.5">
              {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-stage-interview"
                  )}
                />
              ))}
              {count > 3 && (
                <span
                  className={cn(
                    "ml-0.5 font-mono text-[9px] leading-none tabular",
                    isSelected ? "text-primary-foreground/90" : "text-ink-500"
                  )}
                >
                  +{count - 3}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function AgendaGroup({
  title,
  tone,
  items,
  onSelect,
  past,
}: {
  title: string
  tone: string
  items: EnrichedInterview[]
  onSelect: (id: string) => void
  past?: boolean
}) {
  if (items.length === 0) return null
  return (
    <StaggerItem>
      <section>
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="size-2 rounded-full" style={{ background: `var(--${tone})` }} />
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <span className="font-mono text-xs tabular text-ink-500">{items.length}</span>
          <span className="ml-1 h-px flex-1 bg-line/70" />
        </div>
        <div className="grid gap-2">
          {items.map((item) => (
            <InterviewRow key={item.interview.id} item={item} onSelect={onSelect} past={past} />
          ))}
        </div>
      </section>
    </StaggerItem>
  )
}

function InterviewRow({
  item,
  onSelect,
  past,
}: {
  item: EnrichedInterview
  onSelect: (id: string) => void
  past?: boolean
}) {
  const { interview, application, start } = item
  const wantsFeedback = needsFeedback(interview)
  const tone = interviewResultTone(interview.result)

  return (
    <button
      type="button"
      onClick={() => onSelect(interview.id)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border bg-surface-1/60 p-3 text-left transition-colors hover:bg-surface-3/40",
        wantsFeedback ? "border-status-warn/30" : "border-line hover:border-line-strong"
      )}
    >
      <div className="flex w-16 shrink-0 flex-col items-center rounded-lg border border-line bg-surface-2/70 py-1.5">
        <span className="font-mono text-sm font-semibold tabular leading-none text-ink-100">
          {start !== undefined ? formatInterviewTime(start) : "TBD"}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-500">
          {start !== undefined ? formatInterviewDay(start).split(" ").slice(0, 2).join(" ") : "Unset"}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {application?.companyName ?? "Application"}
          <span className="text-ink-500"> · {interviewHeadline(interview)}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
          {interview.interviewType && (
            <span>{INTERVIEW_TYPE_LABELS[interview.interviewType as InterviewType]}</span>
          )}
          {interview.format && (
            <span className="flex items-center gap-1">
              · {INTERVIEW_FORMAT_LABELS[interview.format as InterviewFormat]}
            </span>
          )}
          {interview.contactIds.length > 0 && (
            <span className="flex items-center gap-1">
              · <Users className="size-3" /> {interview.contactIds.length}
            </span>
          )}
        </p>
      </div>

      {past ? (
        wantsFeedback ? (
          <Badge variant="warn" className="shrink-0 gap-1">
            <MessageSquare className="size-3" /> Log result
          </Badge>
        ) : (
          <Badge variant={resultBadgeVariant[tone]} className="shrink-0 capitalize">
            {interview.result && interview.result !== "pending"
              ? INTERVIEW_RESULT_LABELS[interview.result as InterviewResult]
              : INTERVIEW_STATUS_LABELS[interview.status as InterviewStatus]}
          </Badge>
        )
      ) : (
        <ArrowUpRight className="size-4 shrink-0 text-ink-500 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  )
}

function PrepDrawer({
  doc,
  contacts,
  applications,
  onClose,
  onEdit,
}: {
  doc: Doc<"applicationInterviews"> | null
  contacts: Doc<"applicationContacts">[]
  applications: ReturnType<typeof mapApplication>[]
  onClose: () => void
  onEdit: (doc: Doc<"applicationInterviews">) => void
}) {
  const setResult = useMutation(api.interviews.setResult)
  const cancelInterview = useMutation(api.interviews.cancel)

  const application = doc ? applications.find((item) => item.id === doc.applicationId) : undefined
  const attendees = doc ? contacts.filter((contact) => doc.contactIds.includes(contact._id)) : []
  const start = doc ? getInterviewStart(mapInterview(doc)) : undefined
  const questions = doc?.questions?.split("\n").map((line) => line.trim()).filter(Boolean) ?? []

  async function applyResult(result: InterviewResult) {
    if (!doc) return
    await setResult({ id: doc._id as Id<"applicationInterviews">, result })
    toast.success("Result captured", { description: INTERVIEW_RESULT_LABELS[result] })
  }

  async function handleCancel() {
    if (!doc) return
    await cancelInterview({ id: doc._id as Id<"applicationInterviews"> })
    toast.success("Interview canceled")
    onClose()
  }

  return (
    <Sheet open={Boolean(doc)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {doc && (
          <>
            <SheetHeader>
              <span className="micro-label">{application?.companyName ?? "Application"}</span>
              <SheetTitle>{interviewHeadline(mapInterview(doc))}</SheetTitle>
              <SheetDescription>
                {start !== undefined
                  ? `${formatInterviewDay(start)} · ${formatInterviewTime(start)}`
                  : doc.scheduledDate
                    ? formatShortDate(doc.scheduledDate)
                    : "Time TBD"}
                {doc.durationMinutes ? ` · ${doc.durationMinutes} min` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 px-4 pb-4 pt-1">
              <div className="flex flex-wrap gap-1.5">
                {doc.interviewType && (
                  <Badge variant="outline">{INTERVIEW_TYPE_LABELS[doc.interviewType as InterviewType]}</Badge>
                )}
                {doc.format && (
                  <Badge variant="outline">{INTERVIEW_FORMAT_LABELS[doc.format as InterviewFormat]}</Badge>
                )}
                <Badge variant="interview">{INTERVIEW_STATUS_LABELS[doc.status as InterviewStatus]}</Badge>
                {application && (
                  <Button asChild size="xs" variant="ghost" className="ml-auto">
                    <Link href={`/app/applications/${application.id}`}>
                      Open application <ExternalLink className="size-3" />
                    </Link>
                  </Button>
                )}
              </div>

              {/* Attendees */}
              {attendees.length > 0 && (
                <DrawerSection icon={Users} title="Who you're meeting">
                  <div className="grid gap-2">
                    {attendees.map((contact) => (
                      <div key={contact._id} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-1/60 p-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-stage-phone to-stage-applied text-xs font-semibold text-white">
                          {contactInitials(contact.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{contact.name}</p>
                          <p className="truncate text-xs text-ink-500">
                            {CONTACT_RELATIONSHIP_LABELS[contact.relationshipType as ContactRelationship]}
                            {contact.roleTitle ? ` · ${contact.roleTitle}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </DrawerSection>
              )}

              {/* Prep notes */}
              <DrawerSection icon={Pencil} title="Prep notes">
                {doc.prepNotes ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-300">{doc.prepNotes}</p>
                ) : (
                  <p className="text-sm text-ink-500">No prep notes yet — add some when you edit.</p>
                )}
              </DrawerSection>

              {/* Questions */}
              {questions.length > 0 && (
                <DrawerSection icon={MessageSquare} title="Questions to ask">
                  <ul className="grid gap-1.5">
                    {questions.map((question, index) => (
                      <li key={index} className="flex gap-2 text-sm text-ink-300">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                        {question}
                      </li>
                    ))}
                  </ul>
                </DrawerSection>
              )}

              {/* Feedback / result */}
              <DrawerSection icon={Clock} title="Outcome">
                {doc.feedback && (
                  <p className="mb-3 whitespace-pre-wrap rounded-lg border border-line bg-surface-1/60 p-3 text-sm leading-relaxed text-ink-300">
                    {doc.feedback}
                  </p>
                )}
                <p className="micro-label mb-2">Capture result</p>
                <div className="flex flex-wrap gap-1.5">
                  {INTERVIEW_RESULTS.filter((result) => result !== "pending" && result !== "unknown").map((result) => {
                    const tone = interviewResultTone(result)
                    const active = doc.result === result
                    return (
                      <button
                        key={result}
                        type="button"
                        aria-pressed={active}
                        onClick={() => applyResult(result)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          active
                            ? "border-brand/40 bg-brand-weak text-brand"
                            : cn("border-line bg-surface-1 hover:border-line-strong", toneClass[tone])
                        )}
                      >
                        {INTERVIEW_RESULT_LABELS[result]}
                      </button>
                    )
                  })}
                </div>
              </DrawerSection>

              <div className="flex flex-wrap gap-2 border-t border-line/70 pt-4">
                <Button variant="secondary" size="sm" onClick={() => onEdit(doc)}>
                  <Pencil className="size-3.5" /> Edit details
                </Button>
                {doc.result !== "advanced" && (
                  <Button variant="secondary" size="sm" onClick={() => applyResult("advanced")}>
                    <Check className="size-3.5" /> Advanced
                  </Button>
                )}
                {doc.status !== "canceled" && (
                  <Button variant="ghost" size="sm" className="text-ink-300" onClick={handleCancel}>
                    <CircleSlash className="size-3.5" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DrawerSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <p className="micro-label mb-2 flex items-center gap-1.5">
        <Icon className="size-3.5" />
        {title}
      </p>
      {children}
    </section>
  )
}
