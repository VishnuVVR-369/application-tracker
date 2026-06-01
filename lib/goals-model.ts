import type {
  ApplicationRecord,
  TaskRecord,
  WeeklyGoal,
  WinLogEntry,
  WinType,
} from "@/lib/application-model"
import { addDays, isDateInRange, toDateKey } from "@/lib/date-model"

export const WIN_TYPE_LABELS: Record<WinType, string> = {
  application_submitted: "Application submitted",
  response_received: "Response received",
  interview_reached: "Interview reached",
  offer_received: "Offer received",
  resume_improved: "Resume improved",
  follow_up_completed: "Follow-up completed",
}

export function getMondayWeekStart(date = new Date()) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return copy
}

export function getWeekKey(date = new Date()) {
  return toDateKey(getMondayWeekStart(date))
}

export function getWeekRange(weekStartDate: string) {
  const start = new Date(`${weekStartDate}T00:00:00`)
  const end = addDays(start, 6)
  end.setHours(23, 59, 59, 999)

  return {
    start,
    end,
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  }
}

export function createDefaultWeeklyGoal(
  weekStartDate = getWeekKey(),
  now = Date.now(),
  timezone = "UTC"
): WeeklyGoal {
  return {
    id: `goal-${weekStartDate}`,
    weekStartDate,
    timezone,
    applicationsSentTarget: 10,
    followUpsSentTarget: 5,
    interviewsReachedTarget: 2,
    resumeImprovementsTarget: 2,
    manualResumeImprovements: 0,
    createdAt: now,
    updatedAt: now,
  } satisfies WeeklyGoal
}

export function calculateGoalProgress(args: {
  goal: WeeklyGoal
  applications: ApplicationRecord[]
  tasks: TaskRecord[]
  wins: WinLogEntry[]
}) {
  const range = getWeekRange(args.goal.weekStartDate)
  const applicationsSent = args.applications.filter((application) =>
    isDateInRange(application.dateAppliedDate, range.startDate, range.endDate)
  ).length
  const followUpsSent = args.tasks.filter(
    (task) =>
      task.kind === "follow_up" &&
      task.completedAt &&
      isDateInRange(task.completedAt, range.start, range.end)
  ).length
  const interviewsReached = args.wins.filter(
    (win) =>
      win.type === "interview_reached" &&
      isDateInRange(win.occurredDate, range.startDate, range.endDate)
  ).length
  const resumeImprovements =
    args.goal.manualResumeImprovements +
    args.wins.filter(
      (win) =>
        win.type === "resume_improved" &&
        win.source === "auto" &&
        isDateInRange(win.occurredDate, range.startDate, range.endDate)
    ).length

  return [
    {
      key: "applicationsSent",
      label: "Applications sent",
      actual: applicationsSent,
      target: args.goal.applicationsSentTarget,
    },
    {
      key: "followUpsSent",
      label: "Follow-ups sent",
      actual: followUpsSent,
      target: args.goal.followUpsSentTarget,
    },
    {
      key: "interviewsReached",
      label: "Interviews reached",
      actual: interviewsReached,
      target: args.goal.interviewsReachedTarget,
    },
    {
      key: "resumeImprovements",
      label: "Resume improvements",
      actual: resumeImprovements,
      target: args.goal.resumeImprovementsTarget,
    },
  ].map((metric) => ({
    ...metric,
    percent: metric.target > 0 ? Math.min(100, Math.round((metric.actual / metric.target) * 100)) : 0,
    complete: metric.target > 0 && metric.actual >= metric.target,
  }))
}
