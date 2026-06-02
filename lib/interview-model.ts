import type { ApplicationInterview, ApplicationRecord } from "@/lib/application-model"
import { dateValueToDate } from "@/lib/date-model"
import { isWithinDays, startOfDay } from "@/lib/task-model"

export const INTERVIEW_TYPES = [
  "recruiter_screen",
  "technical",
  "behavioral",
  "system_design",
  "hiring_manager",
  "onsite",
  "take_home",
  "panel",
  "other",
] as const
export type InterviewType = (typeof INTERVIEW_TYPES)[number]

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  recruiter_screen: "Recruiter screen",
  technical: "Technical",
  behavioral: "Behavioral",
  system_design: "System design",
  hiring_manager: "Hiring manager",
  onsite: "Onsite",
  take_home: "Take-home",
  panel: "Panel",
  other: "Other",
}

export const INTERVIEW_FORMATS = [
  "phone",
  "video",
  "onsite",
  "take_home",
  "async",
  "other",
] as const
export type InterviewFormat = (typeof INTERVIEW_FORMATS)[number]

export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, string> = {
  phone: "Phone",
  video: "Video",
  onsite: "Onsite",
  take_home: "Take-home",
  async: "Async",
  other: "Other",
}

export const INTERVIEW_STATUSES = [
  "scheduled",
  "completed",
  "canceled",
  "rescheduled",
  "no_show",
] as const
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number]

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  canceled: "Canceled",
  rescheduled: "Rescheduled",
  no_show: "No-show",
}

export const INTERVIEW_RESULTS = [
  "pending",
  "advanced",
  "positive",
  "neutral",
  "negative",
  "rejected",
  "unknown",
] as const
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number]

export const INTERVIEW_RESULT_LABELS: Record<InterviewResult, string> = {
  pending: "Pending",
  advanced: "Advanced",
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  rejected: "Rejected",
  unknown: "Unknown",
}

/** Maps a result to a status tone used for badges/dots. */
export function interviewResultTone(result: string | undefined): "up" | "down" | "warn" | "neutral" {
  switch (result) {
    case "advanced":
    case "positive":
      return "up"
    case "rejected":
    case "negative":
      return "down"
    case "neutral":
      return "warn"
    default:
      return "neutral"
  }
}

const UPCOMING_STATUSES = new Set(["scheduled", "rescheduled"])

/** The interview's start as a timestamp, preferring the precise scheduledAt. */
export function getInterviewStart(interview: ApplicationInterview): number | undefined {
  if (interview.scheduledAt !== undefined) {
    return interview.scheduledAt
  }
  const date = dateValueToDate(interview.scheduledDate)
  return date ? date.getTime() : undefined
}

export function isUpcomingInterview(interview: ApplicationInterview) {
  return UPCOMING_STATUSES.has(interview.status)
}

export type InterviewBucket = "today" | "week" | "later" | "past"

export function bucketInterview(interview: ApplicationInterview, now = new Date()): InterviewBucket {
  if (!isUpcomingInterview(interview)) {
    return "past"
  }
  const start = getInterviewStart(interview)
  if (start === undefined) {
    return "later"
  }
  const todayStart = startOfDay(now).getTime()
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000
  if (start < todayStart) {
    return "past"
  }
  if (start < tomorrowStart) {
    return "today"
  }
  return isWithinDays(start, 7, now) ? "week" : "later"
}

/** Past interviews still missing a captured result are the ones to nudge on. */
export function needsFeedback(interview: ApplicationInterview, now = new Date()) {
  const start = getInterviewStart(interview)
  const isPast =
    interview.status === "completed" ||
    interview.status === "no_show" ||
    (isUpcomingInterview(interview) && start !== undefined && start < startOfDay(now).getTime())
  return isPast && (!interview.result || interview.result === "pending")
}

export type EnrichedInterview = {
  interview: ApplicationInterview
  application?: ApplicationRecord
  start?: number
  bucket: InterviewBucket
}

export function enrichInterviews(
  interviews: ApplicationInterview[],
  applications: ApplicationRecord[],
  now = new Date()
): EnrichedInterview[] {
  const byId = new Map(applications.map((application) => [application.id, application]))
  return interviews.map((interview) => ({
    interview,
    application: byId.get(interview.applicationId),
    start: getInterviewStart(interview),
    bucket: bucketInterview(interview, now),
  }))
}

function compareUpcoming(a: EnrichedInterview, b: EnrichedInterview) {
  return (a.start ?? Number.MAX_SAFE_INTEGER) - (b.start ?? Number.MAX_SAFE_INTEGER)
}
function comparePast(a: EnrichedInterview, b: EnrichedInterview) {
  return (b.start ?? 0) - (a.start ?? 0)
}

export function groupInterviews(enriched: EnrichedInterview[]) {
  const today = enriched.filter((item) => item.bucket === "today").sort(compareUpcoming)
  const week = enriched.filter((item) => item.bucket === "week").sort(compareUpcoming)
  const later = enriched.filter((item) => item.bucket === "later").sort(compareUpcoming)
  const past = enriched.filter((item) => item.bucket === "past").sort(comparePast)
  return { today, week, later, past }
}

/** The single most imminent upcoming interview, for the Today "next up" slot. */
export function getNextInterview(enriched: EnrichedInterview[]) {
  return enriched
    .filter((item) => (item.bucket === "today" || item.bucket === "week" || item.bucket === "later") && item.start !== undefined)
    .sort(compareUpcoming)[0]
}

export function formatInterviewTime(start: number | undefined) {
  if (start === undefined) return "Time TBD"
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(start))
}

export function formatInterviewDay(start: number | undefined) {
  if (start === undefined) return "Unscheduled"
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(start))
}

export function interviewHeadline(interview: ApplicationInterview) {
  if (interview.roundLabel) return interview.roundLabel
  if (interview.interviewType && interview.interviewType in INTERVIEW_TYPE_LABELS) {
    return INTERVIEW_TYPE_LABELS[interview.interviewType as InterviewType]
  }
  return interview.roundNumber ? `Round ${interview.roundNumber}` : "Interview"
}
