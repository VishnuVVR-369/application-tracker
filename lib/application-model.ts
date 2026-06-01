export const APPLICATION_STAGES = [
  "saved",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "closed",
] as const

export type ApplicationStage = (typeof APPLICATION_STAGES)[number]

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  saved: "Saved",
  applied: "Applied",
  phone_screen: "Phone screen",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
}

export const ACTIVE_STAGES: ApplicationStage[] = [
  "applied",
  "phone_screen",
  "interview",
  "offer",
]

export const SOURCES = [
  "linkedin",
  "company_website",
  "referral",
  "recruiter",
  "indeed",
  "wellfound",
  "other",
] as const

export type ApplicationSource = (typeof SOURCES)[number]

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  linkedin: "LinkedIn",
  company_website: "Company site",
  referral: "Referral",
  recruiter: "Recruiter",
  indeed: "Indeed",
  wellfound: "Wellfound",
  other: "Other",
}

export const REFERRAL_STATUSES = [
  "not_checked",
  "need_referral",
  "reached_out",
  "referred",
] as const

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]

export const REFERRAL_LABELS: Record<ReferralStatus, string> = {
  not_checked: "Not checked",
  need_referral: "Need referral",
  reached_out: "Reached out",
  referred: "Referred",
}

export const WORK_ARRANGEMENTS = ["remote", "hybrid", "onsite"] as const

export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number]

export const WORK_ARRANGEMENT_LABELS: Record<WorkArrangement, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
}

export const APPLICATION_TYPES = [
  "quick_apply",
  "tailored_apply",
  "referral_backed",
] as const

export type ApplicationType = (typeof APPLICATION_TYPES)[number]

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  quick_apply: "Quick apply",
  tailored_apply: "Tailored apply",
  referral_backed: "Referral backed",
}

export const OFFER_DECISIONS = ["accepted", "declined", "negotiating"] as const

export type OfferDecision = (typeof OFFER_DECISIONS)[number]

export const OFFER_DECISION_LABELS: Record<OfferDecision, string> = {
  accepted: "Accepted",
  declined: "Declined",
  negotiating: "Negotiating",
}

export type QualityCheckSnapshot = {
  key: string
  label: string
  checked: boolean
  weight: number
  source: "default" | "custom"
}

export type ApplicationRecord = {
  id: string
  companyName: string
  roleTitle: string
  location?: string
  workArrangement?: WorkArrangement
  salaryMin?: number
  salaryMax?: number
  currency?: string
  postingUrl?: string
  source?: ApplicationSource
  dateApplied?: string
  stage: ApplicationStage
  referralStatus?: ReferralStatus
  applicationType?: ApplicationType
  resumeId?: string
  qualityChecks: QualityCheckSnapshot[]
  applicationDeadlineAt?: string
  takeHomeDeadlineAt?: string
  offerResponseDeadlineAt?: string
  offerComp?: string
  offerDecision?: OfferDecision
  jobDescriptionSnapshot?: string
  notes?: string
  closedAt?: string
  closedOutcome?: ClosedOutcome
  rejectionStage?: RejectionStage
  rejectionReason?: RejectionReason
  rejectionFeedback?: string
  rejectionLessons?: string
  reapplyAfter?: string
  archived: boolean
  createdAt: string
  updatedAt: string
  lastActivityAt?: string
}

export const CLOSED_OUTCOMES = [
  "rejected",
  "withdrew",
  "accepted_elsewhere",
  "ghosted",
] as const

export type ClosedOutcome = (typeof CLOSED_OUTCOMES)[number]

export const REJECTION_STAGES = [
  "application_review",
  "recruiter_screen",
  "technical_screen",
  "onsite",
  "offer",
] as const

export type RejectionStage = (typeof REJECTION_STAGES)[number]

export const REJECTION_REASONS = [
  "resume_mismatch",
  "experience_gap",
  "compensation",
  "location",
  "timing",
  "competition",
  "unknown",
] as const

export type RejectionReason = (typeof REJECTION_REASONS)[number]

export type ResumeRecord = {
  id: string
  label: string
  fileName: string
  storageId: string
  mimeType: string
  sizeBytes: number
  notes?: string
  isDefault: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
}

export const REMINDER_TYPES = ["follow_up", "deadline", "general"] as const
export type ReminderType = (typeof REMINDER_TYPES)[number]

export const REMINDER_STATUSES = ["pending", "completed", "dismissed"] as const
export type ReminderStatus = (typeof REMINDER_STATUSES)[number]

export type ReminderRecord = {
  id: string
  applicationId?: string
  title: string
  description?: string
  dueAt: string
  status: ReminderStatus
  reminderType: ReminderType
  createdAt: string
  completedAt?: string
  dismissedAt?: string
}

export const ACTIVITY_TYPES = [
  "created",
  "stage_changed",
  "edited",
  "resume_linked",
  "reminder_completed",
  "note",
  "manual",
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export type ActivityEvent = {
  id: string
  applicationId: string
  type: ActivityType
  title: string
  description?: string
  source: "auto" | "manual"
  eventDate: string
  createdAt: string
  fromStage?: ApplicationStage
  toStage?: ApplicationStage
}

export type WeeklyGoal = {
  id: string
  weekStart: string
  applicationsSentTarget: number
  followUpsSentTarget: number
  interviewsReachedTarget: number
  resumeImprovementsTarget: number
  manualResumeImprovements: number
  lessonsLearned?: string
  nextWeekFocus?: string
  createdAt: string
  updatedAt: string
}

export const WIN_TYPES = [
  "application_submitted",
  "response_received",
  "interview_reached",
  "offer_received",
  "resume_improved",
  "follow_up_completed",
] as const

export type WinType = (typeof WIN_TYPES)[number]

export type WinLogEntry = {
  id: string
  applicationId?: string
  type: WinType
  title: string
  notes?: string
  occurredAt: string
  source: "auto" | "manual"
  createdAt: string
}

export type QualityChecklistItem = {
  id: string
  key: string
  label: string
  description?: string
  source: "default" | "custom"
  weight: number
  sortOrder: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type UserSettings = {
  displayName: string
  theme: "dark" | "light" | "system"
  email: string
  imageUrl?: string
}

export type TrackerData = {
  applications: ApplicationRecord[]
  resumes: ResumeRecord[]
  reminders: ReminderRecord[]
  activityEvents: ActivityEvent[]
  weeklyGoals: WeeklyGoal[]
  winLogEntries: WinLogEntry[]
  qualityChecklistItems: QualityChecklistItem[]
  settings: UserSettings
}

export function canMoveApplicationStage(
  fromStage: ApplicationStage,
  toStage: ApplicationStage
) {
  return APPLICATION_STAGES.includes(fromStage) && APPLICATION_STAGES.includes(toStage)
}

export function getStageCounts(applications: ApplicationRecord[]) {
  return APPLICATION_STAGES.reduce(
    (counts, stage) => {
      counts[stage] = applications.filter((app) => app.stage === stage).length
      return counts
    },
    {} as Record<ApplicationStage, number>
  )
}

export function isActiveApplication(application: ApplicationRecord) {
  return !application.archived && ACTIVE_STAGES.includes(application.stage)
}

export function getApplicationPrimaryDeadline(application: ApplicationRecord) {
  return (
    application.takeHomeDeadlineAt ??
    application.offerResponseDeadlineAt ??
    application.applicationDeadlineAt
  )
}

export function formatApplicationSalary(application: ApplicationRecord) {
  if (!application.salaryMin && !application.salaryMax) {
    return "Not set"
  }

  const currency = application.currency ?? "USD"
  const format = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)

  if (application.salaryMin && application.salaryMax) {
    return `${format(application.salaryMin)} - ${format(application.salaryMax)}`
  }

  return format(application.salaryMin ?? application.salaryMax ?? 0)
}
