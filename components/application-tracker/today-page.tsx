"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import {
  Activity,
  AlarmClock,
  ArrowUpRight,
  Bookmark,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FileWarning,
  Flame,
  Ghost,
  MessageSquareWarning,
  Sparkles,
  UserPlus,
  Video,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { APPLICATION_STAGES, STAGE_LABELS, type ApplicationStage } from "@/lib/application-model"
import { dateValueToDate, formatShortDate } from "@/lib/date-model"
import { buildGhostingModel } from "@/lib/ghosting-model"
import { calculateGoalProgress, createDefaultWeeklyGoal, getWeekKey } from "@/lib/goals-model"
import {
  INTERVIEW_FORMAT_LABELS,
  formatInterviewTime,
  formatInterviewDay,
  interviewHeadline,
  type InterviewFormat,
} from "@/lib/interview-model"
import { formatOfferBase } from "@/lib/offer-model"
import { buildRaceModel } from "@/lib/race-model"
import { buildTodayModel } from "@/lib/today-model"
import { cn } from "@/lib/utils"
import { RaceStrip } from "./race-strip"
import { CountUp, Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, ProgressBar } from "./common"
import { TodaySkeleton } from "./skeletons"
import {
  mapActivity,
  mapApplication,
  mapGoal,
  mapInterview,
  mapOffer,
  mapTask,
  mapWin,
} from "./data-mappers"
import { useAppData } from "./use-app-data"

const stageAccent: Record<ApplicationStage, string> = {
  saved: "bg-stage-saved",
  applied: "bg-stage-applied",
  phone_screen: "bg-stage-phone",
  interview: "bg-stage-interview",
  offer: "bg-stage-offer",
  closed: "bg-stage-closed",
}

const attentionMeta: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string; href?: string }> = {
  "stale-active": { icon: AlarmClock, tone: "text-status-warn", href: "/app/applications" },
  "missing-resume": { icon: FileWarning, tone: "text-status-info", href: "/app/applications" },
  referral: { icon: UserPlus, tone: "text-stage-interview", href: "/app/applications?referral=not_checked" },
  saved: { icon: Bookmark, tone: "text-stage-saved", href: "/app/applications?stage=saved" },
}

function daysUntil(value?: string) {
  const date = dateValueToDate(value)
  if (!date) return undefined
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - today.getTime()) / 86_400_000)
}

function countdownLabel(days: number | undefined) {
  if (days === undefined) return "No deadline"
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return "Due today"
  if (days === 1) return "1d left"
  return `${days}d left`
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function TodayPage() {
  const { data, isLoading } = useAppData("today")
  const [now] = React.useState(() => Date.now())
  const updateApplication = useMutation(api.applications.update)
  const logFollowUp = useMutation(api.ghosting.logFollowUp)
  const snoozeGhostNudge = useMutation(api.ghosting.snoozeGhostNudge)

  if (isLoading) return <TodaySkeleton />
  if (!data) {
    return (
      <EmptyState
        title="Sign in to load your search"
        description="Your applications, interviews, people, and momentum live here."
        href="/signin"
        actionLabel="Sign in"
      />
    )
  }

  const applications = data.applications.map(mapApplication)
  const tasks = data.tasks.map(mapTask)
  const ghosting = buildGhostingModel({ applications, now: new Date(now) })
  const race = buildRaceModel({
    applications,
    interviews: data.applicationInterviews.map(mapInterview),
    offers: data.applicationOffers.map(mapOffer),
    now: new Date(now),
  })
  const model = buildTodayModel({
    applications,
    tasks,
    activityEvents: data.activityEvents.map(mapActivity),
    interviews: data.applicationInterviews.map(mapInterview),
    offers: data.applicationOffers.map(mapOffer),
    wins: data.winLogEntries.map(mapWin),
  })

  const firstName = (data.settings?.displayName || data.user.name || "there").split(" ")[0]
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())

  const weekKey = getWeekKey()
  const goal =
    data.weeklyGoals.map(mapGoal).find((item) => item.weekStartDate === weekKey) ??
    createDefaultWeeklyGoal(weekKey, now, data.settings?.timezone)
  const goalProgress = calculateGoalProgress({
    goal,
    applications,
    tasks,
    wins: data.winLogEntries.map(mapWin),
  })
  const goalOverall = goalProgress.length
    ? Math.round(goalProgress.reduce((sum, metric) => sum + metric.percent, 0) / goalProgress.length)
    : 0

  const summaryParts = [
    model.nextInterviews.length
      ? `${model.nextInterviews.length} interview${model.nextInterviews.length > 1 ? "s" : ""} this week`
      : null,
    model.decisions.length ? `${model.decisions.length} decision${model.decisions.length > 1 ? "s" : ""} pending` : null,
    model.due.length ? `${model.due.length} due soon` : null,
  ].filter(Boolean)

  return (
    <Stagger className="grid gap-6">
      {/* Hero */}
      <StaggerItem>
        <div className="relative overflow-hidden rounded-2xl">
          <p className="micro-label flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-brand shadow-glow" />
            {today}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-tight">
            {greeting()}, <span className="text-gradient">{firstName}</span>
          </h1>
          <p className="mt-2 text-sm text-ink-300">
            {summaryParts.length ? summaryParts.join(" · ") : "A calm day — nothing urgent on deck."}
          </p>
        </div>
      </StaggerItem>

      {/* Race view — only when something is on the clock */}
      {race.lanes.length > 0 && (
        <StaggerItem>
          <RaceStrip model={race} />
        </StaggerItem>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        {/* ── Triage stack ─────────────────────────────────────────────── */}
        <div className="grid content-start gap-5">
          {/* Next up */}
          <Lane icon={CalendarClock} title="Next up" accent="stage-interview" count={model.nextInterviews.length}>
            {model.nextInterviews.length || model.feedbackPending.length ? (
              <div className="grid gap-2">
                {model.nextInterviews.map(({ interview, application, start }) => (
                  <Link
                    key={interview.id}
                    href={`/app/interviews?focus=${interview.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-surface-1/60 p-3 transition-colors hover:border-stage-interview/40 hover:bg-surface-3/40"
                  >
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-stage-interview/25 bg-stage-interview/10 py-1.5 text-stage-interview">
                      <span className="font-mono text-sm font-semibold tabular leading-none">
                        {formatInterviewTime(start).replace(/\s?[AP]M/i, "")}
                      </span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wider">
                        {formatInterviewDay(start).split(" ")[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {application?.companyName ?? "Application"}
                        <span className="text-ink-500"> · {interviewHeadline(interview)}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                        <Video className="size-3" />
                        {interview.format
                          ? INTERVIEW_FORMAT_LABELS[interview.format as InterviewFormat]
                          : "Format TBD"}
                        {interview.contactIds.length > 0 && ` · ${interview.contactIds.length} attending`}
                      </p>
                    </div>
                    <Badge variant="interview" className="shrink-0">Prep</Badge>
                  </Link>
                ))}
                {model.feedbackPending.slice(0, 3).map(({ interview, application }) => (
                  <Link
                    key={interview.id}
                    href={`/app/interviews?focus=${interview.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-dashed border-line bg-surface-1/40 p-3 transition-colors hover:border-status-warn/40"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-status-warn/25 bg-status-warn/10 text-status-warn">
                      <MessageSquareWarning className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {application?.companyName ?? "Interview"} · {interviewHeadline(interview)}
                      </p>
                      <p className="text-xs text-ink-500">Capture how it went</p>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-ink-500 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            ) : (
              <LaneEmpty icon={CalendarClock} text="No interviews on the horizon. Schedule one with ⌘K." />
            )}
          </Lane>

          {/* Decisions */}
          {model.decisions.length > 0 && (
            <Lane icon={CircleDollarSign} title="Decisions pending" accent="stage-offer" count={model.decisions.length}>
              <div className="grid gap-2">
                {model.decisions.map(({ offer, application, deadline }) => {
                  const days = daysUntil(deadline)
                  const urgent = days !== undefined && days <= 3
                  return (
                    <Link
                      key={offer.id}
                      href={application ? `/app/applications/${application.id}?tab=offer` : "/app"}
                      className="group flex items-center gap-3 rounded-xl border border-stage-offer/25 bg-stage-offer/[0.06] p-3 transition-colors hover:bg-stage-offer/10"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{application?.companyName ?? "Offer"}</p>
                        <p className="text-xs text-ink-500">
                          {formatOfferBase(offer)} · {offer.decision}
                        </p>
                      </div>
                      <Badge variant={urgent ? "warn" : "success"} className="shrink-0 font-mono tabular">
                        {countdownLabel(days)}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            </Lane>
          )}

          {/* Due */}
          <Lane icon={Clock3} title="Due this week" accent="status-warn" count={model.due.length}>
            {model.due.length ? (
              <div className="grid gap-2">
                {model.due.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    href={item.applicationId ? `/app/applications/${item.applicationId}` : "/app"}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-1/60 p-3 transition-colors hover:border-status-warn/40 hover:bg-surface-3/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs capitalize text-ink-500">{item.kind}</p>
                    </div>
                    <Badge variant="warn" className="shrink-0 font-mono tabular">
                      {formatShortDate(item.dueAt)}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <LaneEmpty icon={Clock3} text="Nothing due in the next seven days." />
            )}
          </Lane>

          {/* Presumed ghosted */}
          {ghosting.nudges.length > 0 && (
            <Lane icon={Ghost} title="Presumed ghosted" accent="status-down" count={ghosting.nudges.length}>
              <div className="grid gap-2">
                {ghosting.nudges.slice(0, 5).map(({ application, daysSilent, level }) => (
                  <div
                    key={application.id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-xl border p-3",
                      level === "strong"
                        ? "border-status-down/30 bg-status-down/[0.05]"
                        : "border-line bg-surface-1/60"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/app/applications/${application.id}`}
                        className="truncate text-sm font-medium transition-colors hover:text-brand"
                      >
                        {application.companyName}
                        <span className="text-ink-500"> · {application.roleTitle}</span>
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {daysSilent}d of silence
                        {level === "strong" && " · review recommended"}
                      </p>
                    </div>
                    <Badge variant={level === "strong" ? "danger" : "warn"} className="shrink-0 font-mono tabular">
                      {daysSilent}d
                    </Badge>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() =>
                          void logFollowUp({ id: application.id as Id<"applications"> }).then(() =>
                            toast.success("Follow-up logged — silence clock reset")
                          )
                        }
                      >
                        Followed up
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          void snoozeGhostNudge({ id: application.id as Id<"applications"> }).then(() =>
                            toast.success("Snoozed for 7 days")
                          )
                        }
                      >
                        Snooze
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-status-down hover:text-status-down"
                        onClick={() =>
                          void updateApplication({
                            id: application.id as Id<"applications">,
                            stage: "closed",
                            closedOutcome: "ghosted",
                          }).then(() => toast.success(`${application.companyName} closed as ghosted`))
                        }
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                ))}
                {ghosting.nudges.length > 5 && (
                  <Link
                    href="/app/applications?stage=applied"
                    className="rounded-xl border border-dashed border-line/70 px-4 py-2.5 text-center text-xs text-ink-500 transition-colors hover:border-line-strong hover:text-ink-300"
                  >
                    +{ghosting.nudges.length - 5} more silent applications in the pipeline
                  </Link>
                )}
              </div>
            </Lane>
          )}

          {/* Attention */}
          {model.attention.length > 0 && (
            <Lane icon={AlarmClock} title="Needs attention" accent="status-down" count={model.attention.reduce((sum, item) => sum + item.count, 0)}>
              <div className="grid gap-2 sm:grid-cols-2">
                {model.attention.map((item) => {
                  const meta = attentionMeta[item.key] ?? { icon: AlarmClock, tone: "text-ink-300" }
                  const Icon = meta.icon
                  const inner = (
                    <>
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2", meta.tone)}>
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{item.label}</p>
                        <p className="truncate text-xs text-ink-500">{item.detail}</p>
                      </div>
                      <span className="font-mono text-lg tabular text-ink-100">{item.count}</span>
                    </>
                  )
                  return meta.href ? (
                    <Link key={item.key} href={meta.href} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-1/60 p-2.5 transition-colors hover:border-line-strong hover:bg-surface-3/40">
                      {inner}
                    </Link>
                  ) : (
                    <div key={item.key} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-1/60 p-2.5">
                      {inner}
                    </div>
                  )
                })}
              </div>
            </Lane>
          )}
        </div>

        {/* ── Momentum rail ────────────────────────────────────────────── */}
        <div className="grid content-start gap-4">
          {/* Pipeline snapshot */}
          <RailCard>
            <RailHeader title="Pipeline" href="/app/applications">
              <Badge variant="accent" className="font-mono tabular">
                <CountUp value={model.pipeline.activeCount} /> active
              </Badge>
            </RailHeader>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {APPLICATION_STAGES.map((stage) => (
                <Link
                  key={stage}
                  href={`/app/applications?stage=${stage}`}
                  className="rounded-lg border border-line bg-surface-1/50 p-2 transition-colors hover:border-line-strong"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", stageAccent[stage])} />
                    <span className="truncate text-[10px] uppercase tracking-wide text-ink-500">{STAGE_LABELS[stage]}</span>
                  </span>
                  <p className="mt-1 font-mono text-xl font-semibold tabular">{model.pipeline.stageCounts[stage]}</p>
                </Link>
              ))}
            </div>
          </RailCard>

          {/* This week */}
          <RailCard>
            <RailHeader title="This week" href="/app/insights">
              <span className="font-mono text-sm tabular text-ink-300">{goalOverall}%</span>
            </RailHeader>
            <div className="mt-3 grid gap-2.5">
              {goalProgress.map((metric) => (
                <div key={metric.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-300">{metric.label}</span>
                    <span className="font-mono tabular text-ink-500">
                      {metric.actual}/{metric.target}
                    </span>
                  </div>
                  <ProgressBar value={metric.percent} className="h-1.5" />
                </div>
              ))}
            </div>
          </RailCard>

          {/* Momentum */}
          <RailCard className="gradient-ring">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl border border-status-warn/30 bg-status-warn/10 text-status-warn">
                <Flame className="size-5" />
              </span>
              <div>
                <p className="font-mono text-2xl font-semibold tabular">
                  <CountUp value={model.streak} /> day{model.streak === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-ink-500">
                  {model.streak > 0 ? "Active streak — keep it alive" : "Log a win to start a streak"}
                </p>
              </div>
              <Link href="/app/insights" className="ml-auto">
                <Sparkles className="size-4 text-ink-500 transition-colors hover:text-brand" />
              </Link>
            </div>
          </RailCard>

          {/* Recent activity */}
          <RailCard>
            <RailHeader title="Recent activity" />
            {model.recentActivity.length ? (
              <div className="relative mt-3 grid gap-0 before:absolute before:top-2 before:bottom-2 before:left-[6px] before:w-px before:bg-line">
                {model.recentActivity.slice(0, 6).map((event) => (
                  <Link
                    key={event.id}
                    href={`/app/applications/${event.applicationId}`}
                    className="group relative flex items-center justify-between gap-2 rounded-lg py-2 pr-2 pl-6 transition-colors hover:bg-surface-3/40"
                  >
                    <span className="absolute left-0 top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-surface-2 bg-brand" />
                    <p className="min-w-0 truncate text-xs text-ink-300">{event.title}</p>
                    <span className="shrink-0 font-mono text-[10px] tabular text-ink-500">
                      {formatShortDate(event.eventAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-xs text-ink-500">
                <Activity className="size-3.5" /> Activity will appear here as you work.
              </p>
            )}
          </RailCard>
        </div>
      </div>
    </Stagger>
  )
}

/* ── Local building blocks ─────────────────────────────────────────────── */

function Lane({
  icon: Icon,
  title,
  accent,
  count,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  accent: string
  count: number
  children: React.ReactNode
}) {
  return (
    <StaggerItem>
      <section>
        <div className="mb-2.5 flex items-center gap-2.5">
          <span
            className="flex size-7 items-center justify-center rounded-lg border"
            style={{
              borderColor: `color-mix(in oklch, var(--${accent}) 30%, transparent)`,
              background: `color-mix(in oklch, var(--${accent}) 12%, transparent)`,
              color: `var(--${accent})`,
            }}
          >
            <Icon className="size-4" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <span className="font-mono text-xs tabular text-ink-500">{count}</span>
          <span className="ml-1 h-px flex-1 bg-line/70" />
        </div>
        {children}
      </section>
    </StaggerItem>
  )
}

function LaneEmpty({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-line/70 bg-surface-1/40 px-4 py-5 text-sm text-ink-500">
      <Icon className="size-4 shrink-0" />
      {text}
    </div>
  )
}

function RailCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <StaggerItem>
      <div className={cn("glass rounded-xl p-4", className)}>{children}</div>
    </StaggerItem>
  )
}

function RailHeader({ title, href, children }: { title: string; href?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {href ? (
        <Link href={href} className="group flex items-center gap-1.5 text-sm font-semibold tracking-tight transition-colors hover:text-brand">
          {title}
          <ArrowUpRight className="size-3.5 text-ink-500 transition-colors group-hover:text-brand" />
        </Link>
      ) : (
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      )}
      {children}
    </div>
  )
}
