import type { ApplicationRecord, TaskRecord } from "@/lib/application-model"
import { dateValueToDate } from "@/lib/date-model"

export function isWithinDays(value: string | number | undefined, days: number, now = new Date()) {
  const date = dateValueToDate(value)
  if (!date) {
    return false
  }
  const start = startOfDay(now).getTime()
  const end = start + days * 24 * 60 * 60 * 1000
  const time = date.getTime()

  return time >= start && time <= end
}

export function isOverdue(value: string | number | undefined, now = new Date()) {
  const date = dateValueToDate(value)
  return date ? date.getTime() < startOfDay(now).getTime() : false
}

export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function getPendingTasks(tasks: TaskRecord[]) {
  return tasks.filter((task) => task.status === "pending")
}

export function getTaskDueValue(task: TaskRecord) {
  return task.dueAt ?? task.dueDate
}

export function groupTasks(tasks: TaskRecord[], now = new Date()) {
  const pending = getPendingTasks(tasks)

  return {
    overdue: pending.filter((task) => isOverdue(getTaskDueValue(task), now)),
    dueSoon: pending.filter(
      (task) => !isOverdue(getTaskDueValue(task), now) && isWithinDays(getTaskDueValue(task), 7, now)
    ),
    later: pending.filter((task) => !isWithinDays(getTaskDueValue(task), 7, now)),
  }
}

export function buildApplicationDeadlineItems(applications: ApplicationRecord[]) {
  return applications.flatMap((application) => {
    const base = {
      applicationId: application.id,
      companyName: application.companyName,
      roleTitle: application.roleTitle,
    }

    return [
      application.applicationDeadlineDate
        ? {
            ...base,
            id: `${application.id}-application-deadline`,
            title: `Application deadline - ${application.companyName}`,
            dueDate: application.applicationDeadlineDate,
            type: "Application deadline",
          }
        : undefined,
      application.takeHomeDeadlineDate
        ? {
            ...base,
            id: `${application.id}-take-home-deadline`,
            title: `Take-home deadline - ${application.companyName}`,
            dueDate: application.takeHomeDeadlineDate,
            type: "Take-home",
          }
        : undefined,
      application.offerResponseDeadlineDate
        ? {
            ...base,
            id: `${application.id}-offer-deadline`,
            title: `Offer response - ${application.companyName}`,
            dueDate: application.offerResponseDeadlineDate,
            type: "Offer response",
          }
        : undefined,
    ].filter((item) => item !== undefined)
  })
}
