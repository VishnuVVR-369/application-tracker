import type {
  ActivityEvent,
  ApplicationInterview,
  ApplicationOffer,
  ApplicationRecord,
  TaskRecord,
  WinLogEntry,
} from "@/lib/application-model"
import { buildDashboardModel } from "@/lib/dashboard-model"
import { addDays, toDateKey } from "@/lib/date-model"
import { startOfDay } from "@/lib/task-model"
import {
  enrichInterviews,
  groupInterviews,
  needsFeedback,
  type EnrichedInterview,
} from "@/lib/interview-model"

const OPEN_OFFER_DECISIONS = new Set(["pending", "negotiating"])

export type PendingDecision = {
  offer: ApplicationOffer
  application?: ApplicationRecord
  deadline?: string
}

/** Streak of consecutive days (ending today or yesterday) that logged a win. */
export function computeWinStreak(wins: WinLogEntry[], now = new Date()) {
  const days = new Set(wins.map((win) => win.occurredDate))
  let cursor = startOfDay(now)
  if (!days.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -1)
  }
  let streak = 0
  while (days.has(toDateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function buildTodayModel(args: {
  applications: ApplicationRecord[]
  tasks: TaskRecord[]
  activityEvents: ActivityEvent[]
  interviews: ApplicationInterview[]
  offers: ApplicationOffer[]
  wins: WinLogEntry[]
  now?: Date
}) {
  const now = args.now ?? new Date()
  const dashboard = buildDashboardModel({
    applications: args.applications,
    tasks: args.tasks,
    activityEvents: args.activityEvents,
    now,
  })

  const enriched = enrichInterviews(args.interviews, args.applications, now)
  const grouped = groupInterviews(enriched)
  const nextInterviews: EnrichedInterview[] = [...grouped.today, ...grouped.week]
  const feedbackPending = enriched.filter((item) => needsFeedback(item.interview, now))

  const visibleAppIds = new Set(
    args.applications.filter((application) => !application.archived).map((application) => application.id)
  )
  const byAppId = new Map(args.applications.map((application) => [application.id, application]))

  const decisions: PendingDecision[] = args.offers
    .filter(
      (offer) =>
        offer.isCurrent &&
        OPEN_OFFER_DECISIONS.has(offer.decision) &&
        visibleAppIds.has(offer.applicationId)
    )
    .map((offer) => {
      const application = byAppId.get(offer.applicationId)
      return {
        offer,
        application,
        deadline: offer.responseDeadlineDate ?? application?.offerResponseDeadlineDate,
      }
    })
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))

  return {
    pipeline: {
      stageCounts: dashboard.stageCounts,
      activeCount: dashboard.activeCount,
      total: args.applications.filter((application) => !application.archived).length,
    },
    nextInterviews,
    feedbackPending,
    decisions,
    due: dashboard.dueThisWeek,
    attention: dashboard.attentionItems.filter((item) => item.count > 0),
    recentActivity: dashboard.recentActivity,
    streak: computeWinStreak(args.wins, now),
  }
}
