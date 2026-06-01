"use client"

import Link from "next/link"
import { useMutation } from "convex/react"
import {
  Activity,
  AlarmClock,
  Bookmark,
  CalendarClock,
  Check,
  FileWarning,
  Plus,
  UserPlus,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { APPLICATION_STAGES, STAGE_LABELS, type ApplicationStage } from "@/lib/application-model"
import { buildDashboardModel } from "@/lib/dashboard-model"
import { formatShortDate } from "@/lib/date-model"
import { cn } from "@/lib/utils"
import { ApplicationFormSheet } from "./application-form-sheet"
import { CountUp, Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, LoadingPanels, PageHeader, Panel } from "./common"
import { mapActivity, mapApplication, mapTask } from "./data-mappers"
import { useAppData } from "./use-app-data"

const stageAccent: Record<ApplicationStage, string> = {
  saved: "text-stage-saved before:bg-stage-saved",
  applied: "text-stage-applied before:bg-stage-applied",
  phone_screen: "text-stage-phone before:bg-stage-phone",
  interview: "text-stage-interview before:bg-stage-interview",
  offer: "text-stage-offer before:bg-stage-offer",
  closed: "text-stage-closed before:bg-stage-closed",
}

const attentionMeta: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  "stale-active": { icon: AlarmClock, tone: "text-status-warn bg-status-warn/12 border-status-warn/25" },
  "missing-resume": { icon: FileWarning, tone: "text-status-info bg-status-info/12 border-status-info/25" },
  referral: { icon: UserPlus, tone: "text-stage-interview bg-stage-interview/12 border-stage-interview/25" },
  saved: { icon: Bookmark, tone: "text-stage-saved bg-stage-saved/12 border-stage-saved/25" },
}

export function DashboardPage() {
  const { data, isLoading } = useAppData()
  const completeTask = useMutation(api.tasks.complete)

  if (isLoading) {
    return <LoadingPanels />
  }

  if (!data) {
    return (
      <EmptyState
        title="Sign in to load your tracker"
        description="The app stores applications, resumes, tasks, goals, and settings in Convex."
        href="/signin"
        actionLabel="Sign in"
      />
    )
  }

  const applications = data.applications.map(mapApplication)
  const tasks = data.tasks.map(mapTask)
  const activityEvents = data.activityEvents.map(mapActivity)
  const dashboard = buildDashboardModel({ applications, tasks, activityEvents })
  const totalApplications = applications.length

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Today in your search"
        description="A calm overview of stages, attention, deadlines, tasks, and recent activity."
        action={
          <ApplicationFormSheet
            resumes={data.resumes}
            trigger={
              <Button>
                <Plus className="size-4" />
                New application
              </Button>
            }
          />
        }
      />

      <Stagger className="grid gap-4">
        {/* ── Pipeline strip ───────────────────────────────────────────── */}
        <StaggerItem>
          <section className="glass relative overflow-hidden rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-4 py-3">
              <div className="flex items-baseline gap-2.5">
                <h2 className="text-sm font-semibold tracking-tight">Pipeline</h2>
                <span className="micro-label">{totalApplications} total</span>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-weak px-3 py-1 text-xs font-medium text-brand">
                <CountUp value={dashboard.activeCount} className="font-mono font-semibold" />
                active
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-line/60 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
              {APPLICATION_STAGES.map((stage) => (
                <Link
                  key={stage}
                  href={`/app/applications?stage=${stage}`}
                  className={cn(
                    "group relative p-4 transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-0.5 before:opacity-0 before:transition-opacity hover:bg-surface-3/50 hover:before:opacity-100",
                    stageAccent[stage]
                  )}
                >
                  <span className="micro-label flex items-center gap-1.5 text-current">
                    <span className="size-1.5 rounded-full bg-current" />
                    {STAGE_LABELS[stage]}
                  </span>
                  <p className="mt-3 font-mono text-3xl font-semibold tabular text-ink-100">
                    <CountUp value={dashboard.stageCounts[stage]} />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </StaggerItem>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── Needs attention ────────────────────────────────────────── */}
          <StaggerItem>
            <Panel title="Needs attention" icon={AlarmClock} className="h-full">
              {dashboard.attentionItems.length ? (
                <div className="grid gap-2.5">
                  {dashboard.attentionItems.map((item) => {
                    const meta = attentionMeta[item.key] ?? {
                      icon: AlarmClock,
                      tone: "text-ink-300 bg-surface-3 border-line",
                    }
                    const Icon = meta.icon
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 rounded-lg border border-line bg-surface-1/60 p-3 transition-colors hover:border-line-strong"
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                            meta.tone
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="truncate text-xs text-ink-500">{item.detail}</p>
                        </div>
                        <span className="font-mono text-xl tabular text-ink-100">{item.count}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Check}
                  title="All clear"
                  description="No stale applications, missing resumes, or unchecked referrals right now."
                />
              )}
            </Panel>
          </StaggerItem>

          {/* ── Due this week ──────────────────────────────────────────── */}
          <StaggerItem>
            <Panel title="Due this week" icon={CalendarClock} className="h-full">
              {dashboard.dueThisWeek.length ? (
                <div className="grid gap-2">
                  {dashboard.dueThisWeek.map((item) => (
                    <Link
                      key={item.id}
                      href={item.applicationId ? `/app/applications/${item.applicationId}` : "/app"}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-1/60 p-3 transition-colors hover:border-status-warn/40 hover:bg-surface-3/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="text-xs capitalize text-ink-500">{item.kind}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-status-warn/25 bg-status-warn/10 px-2 py-1 font-mono text-xs tabular text-status-warn">
                        {formatShortDate(item.dueAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarClock}
                  title="No near-term due dates"
                  description="Deadlines and pending tasks due within seven days appear here."
                />
              )}
            </Panel>
          </StaggerItem>
        </div>

        {/* ── Recent activity ──────────────────────────────────────────── */}
        <StaggerItem>
          <Panel title="Recent activity" icon={Activity}>
            {dashboard.recentActivity.length ? (
              <div className="relative grid gap-0 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-line">
                {dashboard.recentActivity.map((event) => (
                  <Link
                    href={`/app/applications/${event.applicationId}`}
                    key={event.id}
                    className="group relative flex items-center justify-between gap-3 rounded-lg py-2.5 pl-7 pr-3 transition-colors hover:bg-surface-3/50"
                  >
                    <span className="absolute left-0 top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-surface-2 bg-brand shadow-glow" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      {event.description && (
                        <p className="truncate text-xs text-ink-500">{event.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular text-ink-500">
                      {formatShortDate(event.eventAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No activity yet"
                description="Created applications, stage changes, resume links, tasks, and notes populate this timeline."
              />
            )}
          </Panel>
        </StaggerItem>

        {/* ── Task actions ─────────────────────────────────────────────── */}
        {tasks.some((task) => task.status === "pending") && (
          <StaggerItem>
            <Panel title="Task actions" icon={AlarmClock}>
              <div className="grid gap-2">
                {data.tasks
                  .filter((task) => task.status === "pending")
                  .slice(0, 5)
                  .map((task) => (
                    <div
                      key={task._id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-1/60 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="font-mono text-xs tabular text-ink-500">
                          {formatShortDate(task.dueAt ?? task.dueDate)}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void completeTask({ id: task._id })}
                      >
                        <Check className="size-3.5" />
                        Complete
                      </Button>
                    </div>
                  ))}
              </div>
            </Panel>
          </StaggerItem>
        )}
      </Stagger>
    </>
  )
}
