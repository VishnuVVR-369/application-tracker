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

export const TARGET_COMPANY_TIERS = ["dream", "strong", "backup"] as const
export type TargetCompanyTier = (typeof TARGET_COMPANY_TIERS)[number]
export const TARGET_COMPANY_TIER_LABELS: Record<TargetCompanyTier, string> = {
  dream: "Dream",
  strong: "Strong",
  backup: "Backup",
}

export const TARGET_COMPANY_STATUSES = [
  "researching",
  "warming_referrals",
  "ready_to_apply",
  "applied",
  "paused",
] as const
export type TargetCompanyStatus = (typeof TARGET_COMPANY_STATUSES)[number]
export const TARGET_COMPANY_STATUS_LABELS: Record<TargetCompanyStatus, string> = {
  researching: "Researching",
  warming_referrals: "Warming referrals",
  ready_to_apply: "Ready to apply",
  applied: "Applied",
  paused: "Paused",
}

export const REFERRAL_OUTREACH_STATUSES = [
  "not_contacted",
  "messaged",
  "replied",
  "call_booked",
  "referred",
  "declined",
] as const
export type ReferralOutreachStatus = (typeof REFERRAL_OUTREACH_STATUSES)[number]
export const REFERRAL_OUTREACH_STATUS_LABELS: Record<ReferralOutreachStatus, string> = {
  not_contacted: "Not contacted",
  messaged: "Messaged",
  replied: "Replied",
  call_booked: "Call booked",
  referred: "Referred",
  declined: "Declined",
}

export const REFERRAL_OUTREACH_SOURCES = [
  "linkedin",
  "alumni",
  "ex_coworker",
  "friend_of_friend",
  "community",
  "other",
] as const
export type ReferralOutreachSource = (typeof REFERRAL_OUTREACH_SOURCES)[number]
export const REFERRAL_OUTREACH_SOURCE_LABELS: Record<ReferralOutreachSource, string> = {
  linkedin: "LinkedIn",
  alumni: "Alumni",
  ex_coworker: "Ex-coworker",
  friend_of_friend: "Friend of friend",
  community: "Community",
  other: "Other",
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

export const COMPENSATION_PERIODS = [
  "hour",
  "day",
  "month",
  "year",
  "contract",
  "unknown",
] as const

export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number]

export const COMPENSATION_PERIOD_LABELS: Record<CompensationPeriod, string> = {
  hour: "Hourly",
  day: "Daily",
  month: "Monthly",
  year: "Yearly",
  contract: "Contract",
  unknown: "Unknown",
}

export const OFFER_DECISIONS = [
  "pending",
  "accepted",
  "declined",
  "negotiating",
  "expired",
] as const

export type OfferDecision = (typeof OFFER_DECISIONS)[number]

export const OFFER_DECISION_LABELS: Record<OfferDecision, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  negotiating: "Negotiating",
  expired: "Expired",
}

export type QualityCheckSnapshot = {
  key: string
  itemId?: string
  label: string
  checked: boolean
  weight: number
  source: "default" | "custom"
  sortOrder: number
  checkedAt?: number
  notes?: string
}

export type ApplicationRecord = {
  id: string
  companyName: string
  companyKey: string
  companyWebsite?: string
  companyDomain?: string
  roleTitle: string
  roleKey: string
  location?: string
  workArrangement?: WorkArrangement
  compensationMin?: number
  compensationMax?: number
  compensationCurrency?: string
  compensationPeriod?: CompensationPeriod
  compensationNotes?: string
  postingUrl?: string
  postingUrlCanonical?: string
  postingTitleSnapshot?: string
  postingCompanySnapshot?: string
  postingCapturedAt?: number
  source?: ApplicationSource
  sourceDetail?: string
  sourceSystem?: "manual" | "import" | "browser_extension"
  sourceExternalId?: string
  dateSavedDate?: string
  dateAppliedDate?: string
  stage: ApplicationStage
  currentStageEnteredAt: number
  referralStatus?: ReferralStatus
  applicationType?: ApplicationType
  currentResumeId?: string
  qualityChecks: QualityCheckSnapshot[]
  applicationDeadlineDate?: string
  takeHomeDeadlineDate?: string
  offerResponseDeadlineDate?: string
  jobDescriptionSnapshot?: string
  notes?: string
  closedAt?: number
  closedDate?: string
  closedOutcome?: ClosedOutcome
  rejectionStage?: RejectionStage
  rejectionStageDetail?: string
  rejectionReason?: RejectionReason
  rejectionReasonDetail?: string
  rejectionFeedback?: string
  rejectionLessons?: string
  reapplyAfterDate?: string
  archived: boolean
  archivedAt?: number
  createdAt: number
  updatedAt: number
  lastActivityAt?: number
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
  "other",
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
  "other",
] as const

export type RejectionReason = (typeof REJECTION_REASONS)[number]

export type ResumeRecord = {
  id: string
  label: string
  fileName: string
  storageId: string
  mimeType: "application/pdf"
  sizeBytes: number
  fileHash?: string
  notes?: string
  isDefault: boolean
  defaultedAt?: number
  archived: boolean
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

export type ApplicationResumeLink = {
  id: string
  applicationId: string
  resumeId: string
  isCurrent: boolean
  linkedAt: number
  unlinkedAt?: number
  resumeSnapshot: {
    label: string
    fileName: string
    storageId: string
    mimeType: "application/pdf"
    sizeBytes: number
  }
  createdAt: number
  updatedAt: number
}

export type TargetCompanyRecord = {
  id: string
  companyName: string
  companyKey: string
  website?: string
  domain?: string
  tier: TargetCompanyTier
  status: TargetCompanyStatus
  targetRoles: string[]
  targetLevel?: string
  locationPreference?: string
  workArrangement?: WorkArrangement
  priorityScore: number
  roleFitScore: number
  referralGoal: number
  applicationWindowStartDate?: string
  applicationWindowEndDate?: string
  researchNotes?: string
  hiringBarNotes?: string
  interviewProcessNotes?: string
  compensationNotes?: string
  notes?: string
  archived: boolean
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

export type ReferralOutreachRecord = {
  id: string
  targetCompanyId?: string
  applicationId?: string
  contactName: string
  contactRole?: string
  source: ReferralOutreachSource
  status: ReferralOutreachStatus
  linkedinUrl?: string
  email?: string
  normalizedEmail?: string
  firstContactedDate?: string
  lastContactedDate?: string
  followUpDate?: string
  messageTemplate?: string
  notes?: string
  archived: boolean
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

export const TASK_KINDS = [
  "follow_up",
  "deadline",
  "general",
  "interview_prep",
  "interview_follow_up",
  "offer_response",
  "reapply",
] as const
export type TaskKind = (typeof TASK_KINDS)[number]

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  follow_up: "Follow-up",
  deadline: "Deadline",
  general: "General",
  interview_prep: "Interview prep",
  interview_follow_up: "Interview follow-up",
  offer_response: "Offer response",
  reapply: "Reapply",
}

export const TASK_STATUSES = ["pending", "completed", "dismissed", "canceled"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export type TaskRecord = {
  id: string
  applicationId?: string
  relatedInterviewId?: string
  relatedOfferId?: string
  title: string
  description?: string
  dueAt?: number
  dueDate?: string
  timezone?: string
  status: TaskStatus
  kind: TaskKind
  kindDetail?: string
  source: "manual" | "system" | "deadline"
  createdAt: number
  updatedAt: number
  completedAt?: number
  dismissedAt?: number
  canceledAt?: number
}

export const ACTIVITY_TYPES = [
  "created",
  "stage_changed",
  "edited",
  "resume_linked",
  "task_completed",
  "note",
  "contact_added",
  "interview_scheduled",
  "offer_recorded",
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
  actorType: "user" | "system"
  actorUserId?: string
  eventAt: number
  eventDate?: string
  relatedEntityType?: string
  relatedEntityId?: string
  metadataJson?: string
  dedupeKey?: string
  supersededAt?: number
  createdAt: number
}

export type ApplicationStageHistory = {
  id: string
  applicationId: string
  stage: ApplicationStage
  enteredAt: number
  exitedAt?: number
  enteredFromStage?: ApplicationStage
  exitedToStage?: ApplicationStage
  source: "user" | "system" | "import"
  activityEventId?: string
  createdAt: number
  updatedAt: number
}

export type ApplicationContact = {
  id: string
  applicationId: string
  name: string
  normalizedName?: string
  relationshipType: "recruiter" | "referrer" | "hiring_manager" | "interviewer" | "employee" | "other"
  relationshipDetail?: string
  roleTitle?: string
  email?: string
  normalizedEmail?: string
  phone?: string
  linkedinUrl?: string
  notes?: string
  archived: boolean
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

export type ApplicationInterview = {
  id: string
  applicationId: string
  roundNumber?: number
  roundLabel?: string
  interviewType?: string
  interviewTypeDetail?: string
  format?: string
  formatDetail?: string
  status: "scheduled" | "completed" | "canceled" | "rescheduled" | "no_show"
  scheduledAt?: number
  scheduledDate?: string
  timezone?: string
  durationMinutes?: number
  contactIds: string[]
  prepNotes?: string
  questions?: string
  feedback?: string
  result?: string
  createdAt: number
  updatedAt: number
  completedAt?: number
  canceledAt?: number
}

export type ApplicationOffer = {
  id: string
  applicationId: string
  versionNumber: number
  isCurrent: boolean
  offeredAt?: number
  offeredDate?: string
  responseDeadlineDate?: string
  baseAmount?: number
  bonusAmount?: number
  equitySummary?: string
  currency?: string
  period?: "year" | "day" | "month" | "hour" | "contract" | "unknown"
  compensationNotes?: string
  decision: OfferDecision
  decidedAt?: number
  notes?: string
  createdAt: number
  updatedAt: number
}

export type WeeklyGoal = {
  id: string
  weekStartDate: string
  timezone: string
  applicationsSentTarget: number
  followUpsSentTarget: number
  interviewsReachedTarget: number
  resumeImprovementsTarget: number
  manualResumeImprovements: number
  lessonsLearned?: string
  nextWeekFocus?: string
  createdAt: number
  updatedAt: number
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
  occurredAt: number
  occurredDate: string
  source: "auto" | "manual"
  relatedEntityType?: string
  relatedEntityId?: string
  dedupeKey?: string
  createdAt: number
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
  createdAt: number
  updatedAt: number
}

export const PREP_FOCUS_AREAS = [
  "dsa",
  "system_design",
  "behavioral",
  "company_research",
  "resume_deep_dive",
  "domain_knowledge",
] as const
export type PrepFocusArea = (typeof PREP_FOCUS_AREAS)[number]
export const PREP_FOCUS_LABELS: Record<PrepFocusArea, string> = {
  dsa: "DSA",
  system_design: "System design",
  behavioral: "Behavioral",
  company_research: "Company research",
  resume_deep_dive: "Resume deep dive",
  domain_knowledge: "Domain knowledge",
}

export const PREP_PLAN_STATUSES = ["not_started", "in_progress", "ready", "needs_work"] as const
export type PrepPlanStatus = (typeof PREP_PLAN_STATUSES)[number]
export const PREP_PLAN_STATUS_LABELS: Record<PrepPlanStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  ready: "Ready",
  needs_work: "Needs work",
}

export type InterviewPrepPlanRecord = {
  id: string
  applicationId?: string
  targetCompanyId?: string
  title: string
  status: PrepPlanStatus
  focusAreas: PrepFocusArea[]
  codingDrillsTarget: number
  codingDrillsDone: number
  systemDesignDrillsTarget: number
  systemDesignDrillsDone: number
  behavioralStoriesTarget: number
  behavioralStoriesReady: number
  mockInterviewsTarget: number
  mockInterviewsDone: number
  companyResearchDone: boolean
  resumeDeepDiveDone: boolean
  weaknessTags: string[]
  nextAction?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export const STORY_COMPETENCIES = [
  "ownership",
  "technical_depth",
  "system_design",
  "collaboration",
  "conflict",
  "ambiguity",
  "customer_impact",
  "leadership",
  "execution",
] as const
export type StoryCompetency = (typeof STORY_COMPETENCIES)[number]
export const STORY_COMPETENCY_LABELS: Record<StoryCompetency, string> = {
  ownership: "Ownership",
  technical_depth: "Technical depth",
  system_design: "System design",
  collaboration: "Collaboration",
  conflict: "Conflict",
  ambiguity: "Ambiguity",
  customer_impact: "Customer impact",
  leadership: "Leadership",
  execution: "Execution",
}

export type StoryBankEntryRecord = {
  id: string
  title: string
  project?: string
  situation: string
  task: string
  action: string
  result: string
  impactMetrics?: string
  technologies: string[]
  competencies: StoryCompetency[]
  senioritySignal?: string
  notes?: string
  archived: boolean
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

export type StoryUsageRecord = {
  id: string
  storyId: string
  applicationId?: string
  interviewId?: string
  usedAtDate?: string
  confidence: "low" | "medium" | "high"
  notes?: string
  createdAt: number
  updatedAt: number
}

export type UserSettings = {
  displayName: string
  theme: "dark" | "light" | "system"
  timezone: string
  email: string
  imageUrl?: string
}

export type TrackerData = {
  applications: ApplicationRecord[]
  resumes: ResumeRecord[]
  applicationResumeLinks: ApplicationResumeLink[]
  tasks: TaskRecord[]
  activityEvents: ActivityEvent[]
  applicationStageHistory: ApplicationStageHistory[]
  applicationContacts: ApplicationContact[]
  applicationInterviews: ApplicationInterview[]
  applicationOffers: ApplicationOffer[]
  weeklyGoals: WeeklyGoal[]
  winLogEntries: WinLogEntry[]
  qualityChecklistItems: QualityChecklistItem[]
  targetCompanies: TargetCompanyRecord[]
  referralOutreach: ReferralOutreachRecord[]
  interviewPrepPlans: InterviewPrepPlanRecord[]
  storyBankEntries: StoryBankEntryRecord[]
  storyUsages: StoryUsageRecord[]
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
    application.takeHomeDeadlineDate ??
    application.offerResponseDeadlineDate ??
    application.applicationDeadlineDate
  )
}

export function formatApplicationSalary(application: ApplicationRecord) {
  if (application.compensationMin === undefined && application.compensationMax === undefined) {
    return application.compensationNotes ?? "Not set"
  }

  const currency = application.compensationCurrency && /^[A-Z]{3}$/.test(application.compensationCurrency)
    ? application.compensationCurrency
    : "USD"
  const format = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)

  const range =
    application.compensationMin !== undefined && application.compensationMax !== undefined
      ? `${format(application.compensationMin)} - ${format(application.compensationMax)}`
      : format(application.compensationMin ?? application.compensationMax ?? 0)

  return application.compensationPeriod && application.compensationPeriod !== "unknown"
    ? `${range} / ${application.compensationPeriod}`
    : range
}
