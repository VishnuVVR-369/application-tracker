import {
  APPLICATION_STAGES,
  type ActivityEvent,
  type ApplicationRecord,
  type ApplicationStage,
  type ApplicationStageHistory,
  type ResumeRecord,
} from "@/lib/application-model"
import { daysBetween } from "@/lib/date-model"
import { calculateQualityScore } from "@/lib/quality-model"

const RESPONSE_STAGES: ApplicationStage[] = ["phone_screen", "interview", "offer", "closed"]
const INTERVIEW_STAGES: ApplicationStage[] = ["interview", "offer", "closed"]
const OFFER_STAGES: ApplicationStage[] = ["offer", "closed"]

export type AnalyticsFilters = {
  includeArchived: boolean
  includeClosed: boolean
}

function filterApplications(applications: ApplicationRecord[], filters: AnalyticsFilters) {
  return applications.filter((application) => {
    if (!filters.includeArchived && application.archived) {
      return false
    }
    if (!filters.includeClosed && application.stage === "closed") {
      return false
    }
    return true
  })
}

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

function average(values: number[]) {
  const finite = values.filter((value) => Number.isFinite(value))
  if (!finite.length) {
    return undefined
  }

  return Number((finite.reduce((sum, value) => sum + value, 0) / finite.length).toFixed(1))
}

function countBy<T extends string>(values: T[]) {
  return values.reduce(
    (counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1
      return counts
    },
    {} as Record<T, number>
  )
}

export function buildAnalyticsModel(args: {
  applications: ApplicationRecord[]
  activityEvents: ActivityEvent[]
  stageHistory?: ApplicationStageHistory[]
  resumes: ResumeRecord[]
  filters: AnalyticsFilters
}) {
  const applications = filterApplications(args.applications, args.filters)
  const applied = applications.filter((application) => application.stage !== "saved")
  const response = applied.filter((application) => RESPONSE_STAGES.includes(application.stage))
  const interview = applied.filter((application) => INTERVIEW_STAGES.includes(application.stage))
  const offer = applied.filter((application) => OFFER_STAGES.includes(application.stage))

  const firstResponseDays = applied.flatMap((application) => {
    const responseStage = (args.stageHistory ?? [])
      .filter(
        (event) =>
          event.applicationId === application.id && RESPONSE_STAGES.includes(event.stage)
      )
      .sort((a, b) => a.enteredAt - b.enteredAt)[0]

    const days = daysBetween(application.dateAppliedDate, responseStage?.enteredAt)
    return days === undefined ? [] : [days]
  })

  const interviewToDecisionDays = applied.flatMap((application) => {
    const interviewEvent = args.stageHistory?.find(
      (event) => event.applicationId === application.id && event.stage === "interview"
    )
    const decisionEvent = args.stageHistory?.find(
      (event) =>
        event.applicationId === application.id &&
        (event.stage === "offer" || event.stage === "closed")
    )
    const days = daysBetween(interviewEvent?.enteredAt, decisionEvent?.enteredAt)
    return days === undefined ? [] : [days]
  })

  const stageDurations = (args.stageHistory ?? [])
    .filter((event) => event.exitedAt !== undefined)
    .map((event) => daysBetween(event.enteredAt, event.exitedAt) ?? 0)

  const segment = (label: string, getKey: (application: ApplicationRecord) => string) => {
    const groups = new Map<string, ApplicationRecord[]>()
    for (const application of applied) {
      const key = getKey(application)
      groups.set(key, [...(groups.get(key) ?? []), application])
    }

    return [...groups.entries()]
      .map(([key, group]) => {
        const responded = group.filter((application) => RESPONSE_STAGES.includes(application.stage)).length
        const interviewed = group.filter((application) => INTERVIEW_STAGES.includes(application.stage)).length
        const offered = group.filter((application) => OFFER_STAGES.includes(application.stage)).length

        return {
          label,
          key,
          total: group.length,
          responseRate: percent(responded, group.length),
          interviewRate: percent(interviewed, group.length),
          offerRate: percent(offered, group.length),
        }
      })
      .sort((a, b) => b.total - a.total)
  }

  const resumeById = new Map(args.resumes.map((resume) => [resume.id, resume.label]))
  const closed = args.applications.filter(
    (application) =>
      (!application.archived || args.filters.includeArchived) &&
      application.stage === "closed"
  )
  const closedForCharts = args.filters.includeClosed ? closed : []

  const weeklyCounts = countBy(
    applied
      .filter((application) => application.dateAppliedDate)
      .map((application) => application.dateAppliedDate as string)
  )

  return {
    filters: args.filters,
    funnel: [
      { label: "Applied", count: applied.length, conversion: 100 },
      { label: "Response", count: response.length, conversion: percent(response.length, applied.length) },
      { label: "Interview", count: interview.length, conversion: percent(interview.length, response.length) },
      { label: "Offer", count: offer.length, conversion: percent(offer.length, interview.length) },
    ],
    timing: {
      avgTimeToFirstResponse: average(firstResponseDays),
      avgTimeInStage: average(stageDurations),
      avgInterviewToDecision: average(interviewToDecisionDays),
    },
    breakdowns: {
      source: segment("Source", (application) => application.source ?? "Unspecified"),
      referral: segment("Referral", (application) => application.referralStatus ?? "Unspecified"),
      workArrangement: segment("Work arrangement", (application) => application.workArrangement ?? "Unspecified"),
      quality: segment("Quality", (application) => {
        const score = calculateQualityScore(application.qualityChecks)
        if (score >= 80) return "80-100"
        if (score >= 50) return "50-79"
        return "0-49"
      }),
      resume: segment("Resume", (application) =>
        application.currentResumeId
          ? resumeById.get(application.currentResumeId) ?? "Unknown resume"
          : "No resume"
      ),
    },
    rejection: {
      closedExcluded: !args.filters.includeClosed,
      outcomes: Object.entries(
        countBy(closedForCharts.flatMap((application) => application.closedOutcome ?? []))
      ).map(([name, value]) => ({ name, value })),
      stages: Object.entries(
        countBy(closedForCharts.flatMap((application) => application.rejectionStage ?? []))
      ).map(([name, value]) => ({ name, value })),
      reasons: Object.entries(
        countBy(closedForCharts.flatMap((application) => application.rejectionReason ?? []))
      ).map(([name, value]) => ({ name, value })),
      earlyStageWarning:
        closedForCharts.filter((application) => application.rejectionStage === "application_review").length >= 3,
    },
    weeklyVolume: Object.entries(weeklyCounts).map(([week, count]) => ({ week, count })),
    stageDistribution: APPLICATION_STAGES.map((stage) => ({
      stage,
      count: applications.filter((application) => application.stage === stage).length,
    })),
  }
}
