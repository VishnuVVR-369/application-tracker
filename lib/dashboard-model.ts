import {
  ACTIVE_STAGES,
  getStageCounts,
  isActiveApplication,
  type ActivityEvent,
  type ApplicationRecord,
  type ReminderRecord,
} from "@/lib/application-model"
import { sortActivityNewestFirst } from "@/lib/activity-model"
import { buildApplicationDeadlineItems, isWithinDays } from "@/lib/reminder-model"

export function buildDashboardModel(args: {
  applications: ApplicationRecord[]
  reminders: ReminderRecord[]
  activityEvents: ActivityEvent[]
  now?: Date
}) {
  const now = args.now ?? new Date()
  const visibleApplications = args.applications.filter((application) => !application.archived)
  const activeApplications = visibleApplications.filter(isActiveApplication)
  const staleCutoff = now.getTime() - 14 * 24 * 60 * 60 * 1000

  const staleActive = activeApplications.filter((application) => {
    const last = application.lastActivityAt ?? application.updatedAt
    return new Date(last).getTime() <= staleCutoff
  })
  const activeWithoutResume = activeApplications.filter((application) => !application.resumeId)
  const referralNotChecked = activeApplications.filter(
    (application) => application.referralStatus === "not_checked"
  )
  const savedNotApplied = visibleApplications.filter((application) => application.stage === "saved")

  const deadlineItems = buildApplicationDeadlineItems(visibleApplications)
    .filter((item) => isWithinDays(item.dueAt, 7, now))
    .map((item) => ({
      id: item.id,
      title: item.title,
      dueAt: item.dueAt,
      applicationId: item.applicationId,
      kind: item.type,
    }))

  const reminderItems = args.reminders
    .filter((reminder) => reminder.status === "pending" && isWithinDays(reminder.dueAt, 7, now))
    .map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      dueAt: reminder.dueAt,
      applicationId: reminder.applicationId,
      kind: `${reminder.reminderType.replace("_", " ")} reminder`,
    }))

  return {
    stageCounts: getStageCounts(visibleApplications),
    activeCount: visibleApplications.filter((application) => ACTIVE_STAGES.includes(application.stage)).length,
    attentionItems: [
      {
        key: "stale-active",
        label: "stale active apps",
        count: staleActive.length,
        detail: "No activity in 14+ days",
      },
      {
        key: "missing-resume",
        label: "active apps without a resume",
        count: activeWithoutResume.length,
        detail: "Link one resume for clean attribution",
      },
      {
        key: "referral",
        label: "referrals not checked",
        count: referralNotChecked.length,
        detail: "Referral path is still unknown",
      },
      {
        key: "saved",
        label: "saved but not applied",
        count: savedNotApplied.length,
        detail: "Ready for a send or an archive decision",
      },
    ],
    dueThisWeek: [...deadlineItems, ...reminderItems].sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    ),
    recentActivity: sortActivityNewestFirst(args.activityEvents).slice(0, 8),
  }
}

