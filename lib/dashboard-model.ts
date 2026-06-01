import {
  ACTIVE_STAGES,
  getStageCounts,
  isActiveApplication,
  type ActivityEvent,
  type ApplicationRecord,
  TASK_KIND_LABELS,
  type TaskRecord,
} from "@/lib/application-model"
import { sortActivityNewestFirst } from "@/lib/activity-model"
import { buildApplicationDeadlineItems, getTaskDueValue, isWithinDays } from "@/lib/task-model"

export function buildDashboardModel(args: {
  applications: ApplicationRecord[]
  tasks: TaskRecord[]
  activityEvents: ActivityEvent[]
  now?: Date
}) {
  const now = args.now ?? new Date()
  const visibleApplications = args.applications.filter((application) => !application.archived)
  const activeApplications = visibleApplications.filter(isActiveApplication)
  const staleCutoff = now.getTime() - 14 * 24 * 60 * 60 * 1000

  const staleActive = activeApplications.filter((application) => {
    const last = application.lastActivityAt ?? application.updatedAt
    return last <= staleCutoff
  })
  const activeWithoutResume = activeApplications.filter((application) => !application.currentResumeId)
  const referralNotChecked = activeApplications.filter(
    (application) => application.referralStatus === "not_checked"
  )
  const savedNotApplied = visibleApplications.filter((application) => application.stage === "saved")

  const deadlineItems = buildApplicationDeadlineItems(visibleApplications)
    .filter((item) => isWithinDays(item.dueDate, 7, now))
    .map((item) => ({
      id: item.id,
      title: item.title,
      dueAt: item.dueDate,
      applicationId: item.applicationId,
      kind: item.type,
    }))

  const taskItems = args.tasks
    .filter((task) => task.status === "pending" && isWithinDays(getTaskDueValue(task), 7, now))
    .map((task) => ({
      id: task.id,
      title: task.title,
      dueAt: getTaskDueValue(task) ?? "",
      applicationId: task.applicationId,
      kind: TASK_KIND_LABELS[task.kind],
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
    dueThisWeek: [...deadlineItems, ...taskItems].sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    ),
    recentActivity: sortActivityNewestFirst(args.activityEvents).slice(0, 8),
  }
}
