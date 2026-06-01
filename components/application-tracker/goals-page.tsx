"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import {
  Award,
  CalendarDays,
  CheckCircle2,
  FileCheck,
  PhoneCall,
  Plus,
  Save,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WIN_TYPES } from "@/lib/application-model"
import { formatShortDate } from "@/lib/date-model"
import { calculateGoalProgress, createDefaultWeeklyGoal, getWeekKey, WIN_TYPE_LABELS } from "@/lib/goals-model"
import { cn } from "@/lib/utils"
import { CountUp, Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, LoadingPanels, PageHeader, Panel, ProgressBar } from "./common"
import { mapApplication, mapGoal, mapTask, mapWin } from "./data-mappers"
import { useAppData } from "./use-app-data"

const selectClass =
  "h-9 rounded-md border border-line bg-surface-1 px-2 text-sm text-ink-100 outline-none transition-colors hover:border-line-strong focus:ring-3 focus:ring-ring/50"

const winMeta: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  application_submitted: { icon: Send, tone: "text-stage-applied bg-stage-applied/12" },
  response_received: { icon: PhoneCall, tone: "text-stage-phone bg-stage-phone/12" },
  interview_reached: { icon: Sparkles, tone: "text-stage-interview bg-stage-interview/12" },
  offer_received: { icon: Award, tone: "text-stage-offer bg-stage-offer/12" },
  resume_improved: { icon: FileCheck, tone: "text-status-info bg-status-info/12" },
  follow_up_completed: { icon: CheckCircle2, tone: "text-status-up bg-status-up/12" },
}

export function GoalsPage() {
  const { data, isLoading } = useAppData()
  const upsertGoal = useMutation(api.goals.upsert)
  const addWin = useMutation(api.goals.addWin)
  const [weekStart, setWeekStart] = React.useState(getWeekKey())
  const [fallbackCreatedAt] = React.useState(() => Date.now())
  const [winTitle, setWinTitle] = React.useState("")
  const [winType, setWinType] = React.useState<(typeof WIN_TYPES)[number]>("resume_improved")
  const [winApplicationId, setWinApplicationId] = React.useState("")

  if (isLoading) {
    return <LoadingPanels />
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

  async function updateTarget(key: string, value: string) {
    await upsertGoal({ weekStartDate: weekStart, [key]: Number(value) })
  }

  async function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    await upsertGoal({
      weekStartDate: weekStart,
      lessonsLearned: String(formData.get("lessonsLearned") ?? ""),
      nextWeekFocus: String(formData.get("nextWeekFocus") ?? ""),
    })
  }

  async function saveWin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!winTitle.trim()) return
    await addWin({
      type: winType,
      title: winTitle,
      applicationId: winApplicationId ? (winApplicationId as Id<"applications">) : undefined,
      occurredAt: Date.now(),
    })
    setWinTitle("")
    setWinApplicationId("")
  }

  return (
    <>
      <PageHeader
        eyebrow="Goals"
        title="Weekly cadence"
        description="Weeks start on Monday. Applications, follow-ups, and interviews are computed from database activity."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-1/70 px-3 py-1.5">
            <CalendarDays className="size-4 text-ink-500" />
            <span className="text-xs text-ink-300">Week of</span>
            <input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(event.target.value)}
              className="bg-transparent font-mono text-sm tabular text-ink-100 outline-none"
            />
          </div>
        }
      />

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
                      <Input
                        type="number"
                        min={0}
                        value={metric.target}
                        onChange={(event) => void updateTarget(`${metric.key}Target`, event.target.value)}
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
                <Input
                  type="number"
                  min={0}
                  value={goal.manualResumeImprovements}
                  onChange={(event) =>
                    void upsertGoal({ weekStartDate: weekStart, manualResumeImprovements: Number(event.target.value) })
                  }
                  className="mt-2 max-w-32"
                />
              </div>
            </div>
          </Panel>
        </StaggerItem>

        <StaggerItem>
          <div className="grid h-full gap-4">
            <Panel title="Weekly review" icon={Sparkles}>
              <form onSubmit={saveReview} className="grid gap-3">
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
                  <select value={winType} onChange={(event) => setWinType(event.target.value as typeof winType)} className={selectClass}>
                    {WIN_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {WIN_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <select value={winApplicationId} onChange={(event) => setWinApplicationId(event.target.value)} className={selectClass}>
                    <option value="">No application</option>
                    {data.applications.map((application) => (
                      <option key={application._id} value={application._id}>
                        {application.companyName}
                      </option>
                    ))}
                  </select>
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
