"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { Plus, Save } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WIN_TYPES } from "@/lib/application-model"
import { formatShortDate } from "@/lib/date-model"
import {
  calculateGoalProgress,
  createDefaultWeeklyGoal,
  getWeekKey,
  WIN_TYPE_LABELS,
} from "@/lib/goals-model"
import { EmptyState, LoadingPanels, PageHeader, Panel, ProgressBar } from "./common"
import { mapApplication, mapGoal, mapReminder, mapWin } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function GoalsPage() {
  const { data, isLoading } = useAppData()
  const upsertGoal = useMutation(api.goals.upsert)
  const addWin = useMutation(api.goals.addWin)
  const [weekStart, setWeekStart] = React.useState(getWeekKey())
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
  const reminders = data.reminders.map(mapReminder)
  const wins = data.winLogEntries.map(mapWin)
  const goal =
    data.weeklyGoals.map(mapGoal).find((item) => item.weekStart === weekStart) ??
    createDefaultWeeklyGoal(weekStart)
  const progress = calculateGoalProgress({
    goal,
    applications,
    reminders,
    wins,
  })

  async function updateTarget(key: string, value: string) {
    await upsertGoal({
      weekStart,
      [key]: Number(value),
    })
  }

  async function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    await upsertGoal({
      weekStart,
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
      occurredAt: new Date().toISOString(),
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
      />

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-ink-300">Week of</label>
        <Input
          type="date"
          value={weekStart}
          onChange={(event) => setWeekStart(event.target.value)}
          className="max-w-48"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Targets and progress">
          <div className="grid gap-4">
            {progress.map((metric) => (
              <div key={metric.key} className="rounded-md border border-line bg-surface-1 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{metric.label}</p>
                    <p className="font-mono text-xs text-ink-500">
                      {metric.actual} / {metric.target}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={metric.target}
                    onChange={(event) => void updateTarget(`${metric.key}Target`, event.target.value)}
                    className="w-24"
                  />
                </div>
                <ProgressBar value={metric.percent} />
              </div>
            ))}
            <div className="rounded-md border border-line bg-surface-1 p-4">
              <p className="text-sm font-medium">Manual resume improvements</p>
              <Input
                type="number"
                min={0}
                value={goal.manualResumeImprovements}
                onChange={(event) =>
                  void upsertGoal({
                    weekStart,
                    manualResumeImprovements: Number(event.target.value),
                  })
                }
                className="mt-2 max-w-32"
              />
            </div>
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel title="Weekly review">
            <form onSubmit={saveReview} className="grid gap-3">
              <Textarea
                name="lessonsLearned"
                defaultValue={goal.lessonsLearned}
                placeholder="Lessons learned"
              />
              <Textarea
                name="nextWeekFocus"
                defaultValue={goal.nextWeekFocus}
                placeholder="Next-week focus"
              />
              <Button type="submit" variant="secondary">
                <Save className="size-4" />
                Save review
              </Button>
            </form>
          </Panel>

          <Panel title="Win log">
            <form onSubmit={saveWin} className="mb-4 grid gap-2">
              <Input value={winTitle} onChange={(event) => setWinTitle(event.target.value)} placeholder="Log a win" />
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={winType} onChange={(event) => setWinType(event.target.value as typeof winType)} className="h-9 rounded-md border border-line bg-surface-1 px-2 text-sm">
                  {WIN_TYPES.map((type) => (
                    <option key={type} value={type}>{WIN_TYPE_LABELS[type]}</option>
                  ))}
                </select>
                <select value={winApplicationId} onChange={(event) => setWinApplicationId(event.target.value)} className="h-9 rounded-md border border-line bg-surface-1 px-2 text-sm">
                  <option value="">No application</option>
                  {data.applications.map((application) => (
                    <option key={application._id} value={application._id}>
                      {application.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="secondary">
                <Plus className="size-4" />
                Add win
              </Button>
            </form>
            <div className="grid gap-2">
              {wins.slice(0, 8).map((win) => (
                <div key={win.id} className="rounded-md border border-line bg-surface-1 p-3">
                  <p className="text-sm font-medium">{win.title}</p>
                  <p className="text-xs text-ink-500">
                    {WIN_TYPE_LABELS[win.type]} · {formatShortDate(win.occurredAt)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

