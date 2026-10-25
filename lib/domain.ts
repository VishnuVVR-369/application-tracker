// Shared between Convex functions and the UI. Keep free of runtime-specific imports.

/** The board's columns, in order. */
export const APPLICATION_STATUSES = ["saved", "applied", "in_progress", "closed"] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

/** Jobs the Job Scout collected wait in the inbox until you shortlist (Saved) or dismiss them. */
export const INBOX_STATUSES = ["discovered", "dismissed"] as const
export type InboxStatus = (typeof INBOX_STATUSES)[number]
export type AnyStatus = ApplicationStatus | InboxStatus

export const STATUS_LABELS: Record<AnyStatus, string> = {
  discovered: "In inbox",
  dismissed: "Dismissed",
  saved: "Saved",
  applied: "Applied",
  in_progress: "In progress",
  closed: "Closed",
}

export function isInboxStatus(status: AnyStatus): status is InboxStatus {
  return status === "discovered" || status === "dismissed"
}

export const OUTCOMES = ["offer", "rejected", "ghosted", "withdrawn"] as const
export type Outcome = (typeof OUTCOMES)[number]

export const OUTCOME_LABELS: Record<Outcome, string> = {
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
  withdrawn: "Withdrawn",
}

export const SOURCES = ["linkedin", "naukri", "indeed", "company_site", "other"] as const
export type Source = (typeof SOURCES)[number]

export const SOURCE_LABELS: Record<Source, string> = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  indeed: "Indeed",
  company_site: "Company site",
  other: "Other",
}

export const REFERRAL_STATUSES = ["to_ask", "asked", "referred", "declined", "no_reply"] as const
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  to_ask: "To ask",
  asked: "Asked",
  referred: "Referred",
  declined: "Declined",
  no_reply: "No reply",
}

export const CHANNELS = ["linkedin", "email", "whatsapp", "phone", "other"] as const
export type Channel = (typeof CHANNELS)[number]

export const CHANNEL_LABELS: Record<Channel, string> = {
  linkedin: "LinkedIn",
  email: "Email",
  whatsapp: "WhatsApp",
  phone: "Phone",
  other: "Other",
}

export const DEFAULT_FOLLOW_UP_DAYS = 4
export const DEFAULT_WEEKLY_GOAL = 10
/** Collected jobs whose best match score reaches this get suggested resume edits automatically. */
export const DEFAULT_FIT_THRESHOLD = 70
export const MAX_WEEKLY_GOAL = 50
export const DAY_MS = 24 * 60 * 60 * 1000

export function companyKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase()
}

export function cleanCompanyName(name: string) {
  return name.trim().replace(/\s+/g, " ")
}

/** Infers the job board from a pasted URL so the source field fills itself. */
export function sourceFromUrl(url: string): Source | null {
  let host: string
  try {
    host = new URL(url.trim()).hostname.toLowerCase()
  } catch {
    return null
  }
  if (host.endsWith("linkedin.com")) return "linkedin"
  if (host.endsWith("naukri.com")) return "naukri"
  if (host.includes("indeed.")) return "indeed"
  return "company_site"
}

/**
 * The moment a referral request becomes due for a follow-up, or null if it is not awaiting a reply.
 * The clock starts at the original ask and restarts whenever a follow-up is sent.
 */
export function followUpDueAt(
  request: { status: ReferralStatus; askedAt?: number; followedUpAt?: number },
  followUpDays: number,
) {
  if (request.status !== "asked" || request.askedAt === undefined) return null
  const lastTouch = Math.max(request.askedAt, request.followedUpAt ?? 0)
  return lastTouch + followUpDays * DAY_MS
}

export function isFollowUpDue(
  request: { status: ReferralStatus; askedAt?: number; followedUpAt?: number },
  followUpDays: number,
  now: number,
) {
  const dueAt = followUpDueAt(request, followUpDays)
  return dueAt !== null && now >= dueAt
}

/** Whole days until a future moment, rounded so a clock that lags by a few seconds doesn't add a day. */
export function daysUntil(timestamp: number, now: number) {
  return Math.max(1, Math.round((timestamp - now) / DAY_MS))
}

export function daysSince(timestamp: number, now: number) {
  return Math.max(0, Math.floor((now - timestamp) / DAY_MS))
}

export function formatDaysAgo(timestamp: number, now: number) {
  const days = daysSince(timestamp, now)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  return `${days}d ago`
}
