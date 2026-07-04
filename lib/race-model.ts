import type {
  ApplicationInterview,
  ApplicationOffer,
  ApplicationRecord,
} from "@/lib/application-model"
import { dateValueToDate } from "@/lib/date-model"
import { getInterviewStart, interviewHeadline, isUpcomingInterview } from "@/lib/interview-model"
import { startOfDay } from "@/lib/task-model"

export const RACE_WINDOW_DAYS = 30

const DAY = 24 * 60 * 60 * 1000
const OPEN_OFFER_DECISIONS = new Set(["pending", "negotiating"])

export type RaceEventKind = "interview" | "offer_deadline" | "take_home" | "app_deadline"

export type RaceEvent = {
  kind: RaceEventKind
  at: number
  dayOffset: number
  label: string
  overdue: boolean
  /** For offer deadlines: other companies whose loops run past this date. */
  conflicts: string[]
}

export type RaceLane = {
  application: ApplicationRecord
  events: RaceEvent[]
  nextAt: number
}

/**
 * Every dated commitment across active loops for the next 30 days, grouped
 * per application, with offer deadlines flagged when other loops run past
 * them — the "can I finish that loop before I must answer this offer?" view.
 */
export function buildRaceModel(args: {
  applications: ApplicationRecord[]
  interviews: ApplicationInterview[]
  offers: ApplicationOffer[]
  now?: Date
  windowDays?: number
}) {
  const now = args.now ?? new Date()
  const windowDays = args.windowDays ?? RACE_WINDOW_DAYS
  const windowStart = startOfDay(now).getTime()
  const windowEnd = windowStart + windowDays * DAY

  const visibleApps = args.applications.filter((application) => !application.archived)
  const appById = new Map(visibleApps.map((application) => [application.id, application]))
  const eventsByApp = new Map<string, RaceEvent[]>()

  const addEvent = (
    applicationId: string,
    kind: RaceEventKind,
    at: number | undefined,
    label: string,
    { includeOverdue = false } = {}
  ) => {
    if (at === undefined || !appById.has(applicationId)) {
      return
    }
    const overdue = at < windowStart
    if (at >= windowEnd || (overdue && !includeOverdue)) {
      return
    }
    const clamped = Math.max(at, windowStart)
    const events = eventsByApp.get(applicationId) ?? []
    events.push({
      kind,
      at: clamped,
      dayOffset: Math.floor((clamped - windowStart) / DAY),
      label,
      overdue,
      conflicts: [],
    })
    eventsByApp.set(applicationId, events)
  }

  for (const interview of args.interviews) {
    if (!isUpcomingInterview(interview)) {
      continue
    }
    addEvent(interview.applicationId, "interview", getInterviewStart(interview), interviewHeadline(interview))
  }

  for (const offer of args.offers) {
    if (!offer.isCurrent || !OPEN_OFFER_DECISIONS.has(offer.decision)) {
      continue
    }
    const application = appById.get(offer.applicationId)
    const deadline =
      offer.responseDeadlineDate ?? application?.offerResponseDeadlineDate
    addEvent(
      offer.applicationId,
      "offer_deadline",
      dateValueToDate(deadline)?.getTime(),
      "Offer response due",
      { includeOverdue: true }
    )
  }

  for (const application of visibleApps) {
    if (application.stage === "closed") {
      continue
    }
    if (application.stage === "saved") {
      addEvent(
        application.id,
        "app_deadline",
        dateValueToDate(application.applicationDeadlineDate)?.getTime(),
        "Application deadline"
      )
    } else {
      addEvent(
        application.id,
        "take_home",
        dateValueToDate(application.takeHomeDeadlineDate)?.getTime(),
        "Take-home due"
      )
    }
  }

  const lanes: RaceLane[] = [...eventsByApp.entries()]
    .map(([applicationId, events]) => {
      const sorted = [...events].sort((a, b) => a.at - b.at)
      return {
        application: appById.get(applicationId) as ApplicationRecord,
        events: sorted,
        nextAt: sorted[0].at,
      }
    })
    .sort((a, b) => a.nextAt - b.nextAt)

  // An offer deadline collides with every other loop that has commitments
  // scheduled after it — those loops can't finish before the answer is due.
  for (const lane of lanes) {
    for (const event of lane.events) {
      if (event.kind !== "offer_deadline") {
        continue
      }
      event.conflicts = lanes
        .filter(
          (other) =>
            other.application.id !== lane.application.id &&
            other.events.some((otherEvent) => otherEvent.at > event.at)
        )
        .map((other) => other.application.companyName)
    }
  }

  return {
    lanes,
    windowDays,
    windowStart,
    collisions: lanes.flatMap((lane) =>
      lane.events
        .filter((event) => event.kind === "offer_deadline" && event.conflicts.length > 0)
        .map((event) => ({
          companyName: lane.application.companyName,
          deadlineAt: event.at,
          overdue: event.overdue,
          conflicts: event.conflicts,
        }))
    ),
  }
}

export type RaceModel = ReturnType<typeof buildRaceModel>
