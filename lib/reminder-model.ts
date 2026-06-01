import type { ApplicationRecord, ReminderRecord } from "@/lib/application-model"

export function isWithinDays(dateIso: string, days: number, now = new Date()) {
  const date = new Date(dateIso).getTime()
  const start = startOfDay(now).getTime()
  const end = start + days * 24 * 60 * 60 * 1000

  return date >= start && date <= end
}

export function isOverdue(dateIso: string, now = new Date()) {
  return new Date(dateIso).getTime() < startOfDay(now).getTime()
}

export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function getPendingReminders(reminders: ReminderRecord[]) {
  return reminders.filter((reminder) => reminder.status === "pending")
}

export function groupReminders(reminders: ReminderRecord[], now = new Date()) {
  const pending = getPendingReminders(reminders)

  return {
    overdue: pending.filter((reminder) => isOverdue(reminder.dueAt, now)),
    dueSoon: pending.filter(
      (reminder) => !isOverdue(reminder.dueAt, now) && isWithinDays(reminder.dueAt, 7, now)
    ),
    later: pending.filter((reminder) => !isWithinDays(reminder.dueAt, 7, now)),
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
      application.applicationDeadlineAt
        ? {
            ...base,
            id: `${application.id}-application-deadline`,
            title: `Application deadline - ${application.companyName}`,
            dueAt: application.applicationDeadlineAt,
            type: "Application deadline",
          }
        : undefined,
      application.takeHomeDeadlineAt
        ? {
            ...base,
            id: `${application.id}-take-home-deadline`,
            title: `Take-home deadline - ${application.companyName}`,
            dueAt: application.takeHomeDeadlineAt,
            type: "Take-home",
          }
        : undefined,
      application.offerResponseDeadlineAt
        ? {
            ...base,
            id: `${application.id}-offer-deadline`,
            title: `Offer response - ${application.companyName}`,
            dueAt: application.offerResponseDeadlineAt,
            type: "Offer response",
          }
        : undefined,
    ].filter((item) => item !== undefined)
  })
}

