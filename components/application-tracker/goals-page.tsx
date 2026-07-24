"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  PhoneCall,
  Plus,
  Save,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { WIN_TYPES } from "@/lib/application-model"
import { addDays, formatShortDate } from "@/lib/date-model"
import {
  calculateGoalProgress,
  createDefaultWeeklyGoal,
  getWeekKey,
  getWeekRange,
  WIN_TYPE_LABELS,
} from "@/lib/goals-model"
import { cn } from "@/lib/utils"
import { CountUp, Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, PageHeader, Panel, ProgressBar } from "./common"
import { GoalsSkeleton } from "./skeletons"
import { mapApplication, mapGoal, mapTask, mapWin } from "./data-mappers"
import { useAppData } from "./use-app-data"

const NO_APPLICATION = "__none__"

const winMeta: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  application_submitted: { icon: Send, tone: "text-stage-applied bg-stage-applied/12" },
  response_received: { icon: PhoneCall, tone: "text-stage-phone bg-stage-phone/12" },
  interview_reached: { icon: Sparkles, tone: "text-stage-interview bg-stage-interview/12" },
  offer_received: { icon: Award, tone: "text-stage-offer bg-stage-offer/12" },
  resume_improved: { icon: FileCheck, tone: "text-status-info bg-status-info/12" },
  follow_up_completed: { icon: CheckCircle2, tone: "text-status-up bg-status-up/12" },
}

/** Shift a Monday week key by a number of days, always re-snapping to Monday. */
function shiftWeek(weekStartDate: string, days: number) {
  const base = new Date(`${weekStartDate}T00:00:00`)
  return getWeekKey(addDays(base, days))
}

function formatWeekRangeLabel(weekStartDate: string) {
  const { start, end } = getWeekRange(weekStartDate)
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

/** A number input that edits local state and only commits (persists) on blur/Enter, and only when changed. */
function NumberField({
  value,
  onCommit,
  className,
}: {
  value: number
  onCommit: (value: number) => Promise<boolean>
  className?: string
}) {
  const [local, setLocal] = React.useState(() => String(value))
  const [pending, setPending] = React.useState(false)

  async function commit() {
    if (pending) return
    const parsed = Number(local)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setLocal(String(value))
      return
    }
    if (parsed !== value) {
      setPending(true)
      const saved = await onCommit(parsed)
      if (!saved) setLocal(String(value))
      setPending(false)
    } else if (local !== String(value)) {
      setLocal(String(value))
    }
  }

  return (
    <Input
      type="number"
      min={0}
      inputMode="numeric"
      value={local}
      disabled={pending}
      onChange={(event) => setLocal(event.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      className={className}
    />
  )
}

export function GoalsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Goals"
        title="Weekly cadence"
        description="Weeks start on Monday. Applications, follow-ups, and interviews are computed from database activity."
      />
      <GoalsView />
    </>
  )
}

export function GoalsView() {
  const { data, isLoading } = useAppData("goals")
  const upsertGoal = useMutation(api.goals.upsert)
  const addWin = useMutation(api.goals.addWin)
  const [currentWeekKey] = React.useState(() => getWeekKey())
  const [weekStart, setWeekStart] = React.useState(currentWeekKey)
  const [fallbackCreatedAt] = React.useState(() => Date.now())
  const [winTitle, setWinTitle] = React.useState("")
  const [winType, setWinType] = React.useState<(typeof WIN_TYPES)[number]>("resume_improved")
  const [winApplicationId, setWinApplicationId] = React.useState("")

  if (isLoading) {
    return <GoalsSkeleton />
  }

  if (!data) {
    return <EmptyState title="Goals unavailable" description="Sign in to load weekly goals from Convex." />
  }

  const applications = data.applications.map(mapApplication)
  const tasks = data.tasks.map(mapTask)
  const wins = data.winLogEntries.map(mapWin)
  const goal =
    data.weeklyGoals.map(mapGoal).find((item) => item.weekStartDate === weekStart) ??
    createDefaultWeeklyGoal(weekStart, fallbackCreatedAt, data.settings?.timezone)
  const progress = calculateGoalProgress({ goal, applications, tasks, wins })
  const completedCount = progress.filter((m) => m.percent >= 100).length

  async function updateTarget(key: string, value: number) {
    try {
      await upsertGoal({ weekStartDate: weekStart, [key]: value })
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update weekly target")
      return false
    }
  }

  async function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    try {
      await upsertGoal({
        weekStartDate: weekStart,
        lessonsLearned: String(formData.get("lessonsLearned") ?? ""),
        nextWeekFocus: String(formData.get("nextWeekFocus") ?? ""),
      })
      toast.success("Weekly review saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save weekly review")
    }
  }

  async function saveWin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!winTitle.trim()) return
    try {
      await addWin({
        type: winType,
        title: winTitle,
        applicationId: winApplicationId ? (winApplicationId as Id<"applications">) : undefined,
        occurredAt: Date.now(),
      })
      setWinTitle("")
      setWinApplicationId("")
      toast.success("Win logged")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log win")
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-1/70 p-1 pl-2.5">
          <CalendarDays className="size-4 shrink-0 text-ink-500" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous week"
            onClick={() => setWeekStart((current) => shiftWeek(current, -7))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[11rem] text-center font-mono text-sm tabular text-ink-100">
            {formatWeekRangeLabel(weekStart)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next week"
            onClick={() => setWeekStart((current) => shiftWeek(current, 7))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={weekStart === currentWeekKey}
          onClick={() => setWeekStart(currentWeekKey)}
        >
          This week
        </Button>
      </div>

      <Stagger className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <StaggerItem>
          <Panel
            title="Targets & progress"
            icon={Trophy}
            action={
              <Badge variant={completedCount === progress.length ? "success" : "outline"}>
                {completedCount}/{progress.length} hit
              </Badge>
            }
            className="h-full"
          >
            <div className="grid gap-3">
              {progress.map((metric) => {
                const done = metric.percent >= 100
                return (
                  <div
                    key={metric.key}
                    className={cn(
                      "rounded-xl border bg-surface-1/60 p-4 transition-colors",
                      done ? "border-brand/40" : "border-line"
                    )}
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {done && <CheckCircle2 className="size-4 text-brand" />}
                        <div>
                          <p className="text-sm font-medium">{metric.label}</p>
                          <p className="font-mono text-xs tabular text-ink-500">
                            <CountUp value={metric.actual} /> / {metric.target}
                          </p>
                        </div>
                      </div>
                      <NumberField
                        key={`${weekStart}:${metric.key}`}
                        value={metric.target}
                        onCommit={(value) => updateTarget(`${metric.key}Target`, value)}
                        className="w-20"
                      />
                    </div>
                    <ProgressBar value={metric.percent} />
                  </div>
                )
              })}
              <div className="rounded-xl border border-line bg-surface-1/60 p-4">
                <p className="text-sm font-medium">Manual resume improvements</p>
                <p className="mt-0.5 text-xs text-ink-500">Counted toward resume-improvement target.</p>
                <NumberField
                  key={`${weekStart}:manualResumeImprovements`}
                  value={goal.manualResumeImprovements}
                  onCommit={(value) => updateTarget("manualResumeImprovements", value)}
                  className="mt-2 max-w-32"
                />
              </div>
            </div>
          </Panel>
        </StaggerItem>

        <StaggerItem>
          <div className="grid h-full gap-4">
            <Panel title="Weekly review" icon={Sparkles}>
              <form key={weekStart} onSubmit={saveReview} className="grid gap-3">
                <div className="grid gap-1.5">
                  <label className="micro-label">Lessons learned</label>
                  <Textarea name="lessonsLearned" defaultValue={goal.lessonsLearned} placeholder="What worked, what didn't…" />
                </div>
                <div className="grid gap-1.5">
                  <label className="micro-label">Next-week focus</label>
                  <Textarea name="nextWeekFocus" defaultValue={goal.nextWeekFocus} placeholder="Where to put energy next week…" />
                </div>
                <Button type="submit" variant="secondary" className="w-fit">
                  <Save className="size-4" />
                  Save review
                </Button>
              </form>
            </Panel>

            <Panel title="Win log" icon={Award}>
              <form onSubmit={saveWin} className="mb-4 grid gap-2 border-b border-line/70 pb-4">
                <Input value={winTitle} onChange={(event) => setWinTitle(event.target.value)} placeholder="Log a win" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={winType} onValueChange={(value) => setWinType(value as typeof winType)}>
                    <SelectTrigger aria-label="Win type" className="w-full bg-surface-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIN_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {WIN_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={winApplicationId || NO_APPLICATION}
                    onValueChange={(value) => setWinApplicationId(value === NO_APPLICATION ? "" : value)}
                  >
                    <SelectTrigger aria-label="Related application" className="w-full bg-surface-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_APPLICATION}>No application</SelectItem>
                      {data.applications.map((application) => (
                        <SelectItem key={application._id} value={application._id}>
                          {application.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" variant="secondary" className="w-fit">
                  <Plus className="size-4" />
                  Add win
                </Button>
              </form>
              {wins.length ? (
                <div className="grid gap-2">
                  {wins.slice(0, 8).map((win) => {
                    const meta = winMeta[win.type] ?? { icon: Award, tone: "text-ink-300 bg-surface-3" }
                    const Icon = meta.icon
                    return (
                      <div key={win.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface-1/60 p-3">
                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{win.title}</p>
                          <p className="font-mono text-xs tabular text-ink-500">
                            {WIN_TYPE_LABELS[win.type]} · {formatShortDate(win.occurredAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-ink-300">No wins logged yet. Every response counts.</p>
              )}
            </Panel>
          </div>
        </StaggerItem>
      </Stagger>
    </>
  )
}
