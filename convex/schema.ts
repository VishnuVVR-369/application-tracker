import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const applicationStage = v.union(
  v.literal("saved"),
  v.literal("applied"),
  v.literal("phone_screen"),
  v.literal("interview"),
  v.literal("offer"),
  v.literal("closed")
)

export const applicationSource = v.union(
  v.literal("linkedin"),
  v.literal("company_website"),
  v.literal("referral"),
  v.literal("recruiter"),
  v.literal("indeed"),
  v.literal("wellfound"),
  v.literal("other")
)

export const referralStatus = v.union(
  v.literal("not_checked"),
  v.literal("need_referral"),
  v.literal("reached_out"),
  v.literal("referred")
)

export const targetCompanyTier = v.union(
  v.literal("dream"),
  v.literal("strong"),
  v.literal("backup")
)

export const targetCompanyStatus = v.union(
  v.literal("researching"),
  v.literal("warming_referrals"),
  v.literal("ready_to_apply"),
  v.literal("applied"),
  v.literal("paused")
)

export const referralOutreachStatus = v.union(
  v.literal("not_contacted"),
  v.literal("messaged"),
  v.literal("replied"),
  v.literal("call_booked"),
  v.literal("referred"),
  v.literal("declined")
)

export const referralOutreachSource = v.union(
  v.literal("linkedin"),
  v.literal("alumni"),
  v.literal("ex_coworker"),
  v.literal("friend_of_friend"),
  v.literal("community"),
  v.literal("other")
)

export const workArrangement = v.union(
  v.literal("remote"),
  v.literal("hybrid"),
  v.literal("onsite")
)

export const applicationType = v.union(
  v.literal("quick_apply"),
  v.literal("tailored_apply"),
  v.literal("referral_backed")
)

export const compensationPeriod = v.union(
  v.literal("hour"),
  v.literal("day"),
  v.literal("month"),
  v.literal("year"),
  v.literal("contract"),
  v.literal("unknown")
)

export const offerDecision = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("negotiating"),
  v.literal("expired")
)

export const closedOutcome = v.union(
  v.literal("rejected"),
  v.literal("withdrew"),
  v.literal("accepted_elsewhere"),
  v.literal("ghosted")
)

export const rejectionStage = v.union(
  v.literal("application_review"),
  v.literal("recruiter_screen"),
  v.literal("technical_screen"),
  v.literal("onsite"),
  v.literal("offer"),
  v.literal("other")
)

export const rejectionReason = v.union(
  v.literal("resume_mismatch"),
  v.literal("experience_gap"),
  v.literal("compensation"),
  v.literal("location"),
  v.literal("timing"),
  v.literal("competition"),
  v.literal("unknown"),
  v.literal("other")
)

export const sourceSystem = v.union(
  v.literal("manual"),
  v.literal("import"),
  v.literal("browser_extension")
)

export const qualityCheckSnapshot = v.object({
  key: v.string(),
  itemId: v.optional(v.id("qualityChecklistItems")),
  label: v.string(),
  checked: v.boolean(),
  weight: v.number(),
  source: v.union(v.literal("default"), v.literal("custom")),
  sortOrder: v.number(),
  checkedAt: v.optional(v.number()),
  notes: v.optional(v.string()),
})

export const taskKind = v.union(
  v.literal("follow_up"),
  v.literal("deadline"),
  v.literal("general"),
  v.literal("interview_prep"),
  v.literal("interview_follow_up"),
  v.literal("offer_response"),
  v.literal("reapply")
)

export const taskStatus = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("dismissed"),
  v.literal("canceled")
)

export const activityType = v.union(
  v.literal("created"),
  v.literal("stage_changed"),
  v.literal("edited"),
  v.literal("resume_linked"),
  v.literal("task_completed"),
  v.literal("note"),
  v.literal("contact_added"),
  v.literal("interview_scheduled"),
  v.literal("offer_recorded"),
  v.literal("manual")
)

export const relatedEntityType = v.union(
  v.literal("application"),
  v.literal("resume"),
  v.literal("task"),
  v.literal("contact"),
  v.literal("interview"),
  v.literal("offer"),
  v.literal("stage_history"),
  v.literal("win"),
  v.literal("quality")
)

export const contactRelationshipType = v.union(
  v.literal("recruiter"),
  v.literal("referrer"),
  v.literal("hiring_manager"),
  v.literal("interviewer"),
  v.literal("employee"),
  v.literal("other")
)

export const interviewType = v.union(
  v.literal("recruiter_screen"),
  v.literal("technical"),
  v.literal("behavioral"),
  v.literal("system_design"),
  v.literal("hiring_manager"),
  v.literal("onsite"),
  v.literal("take_home"),
  v.literal("panel"),
  v.literal("other")
)

export const interviewFormat = v.union(
  v.literal("phone"),
  v.literal("video"),
  v.literal("onsite"),
  v.literal("take_home"),
  v.literal("async"),
  v.literal("other")
)

export const interviewStatus = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("canceled"),
  v.literal("rescheduled"),
  v.literal("no_show")
)

export const interviewResult = v.union(
  v.literal("pending"),
  v.literal("advanced"),
  v.literal("rejected"),
  v.literal("positive"),
  v.literal("negative"),
  v.literal("neutral"),
  v.literal("unknown")
)

export const prepFocusArea = v.union(
  v.literal("dsa"),
  v.literal("system_design"),
  v.literal("behavioral"),
  v.literal("company_research"),
  v.literal("resume_deep_dive"),
  v.literal("domain_knowledge")
)

export const prepPlanStatus = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("ready"),
  v.literal("needs_work")
)

export const storyCompetency = v.union(
  v.literal("ownership"),
  v.literal("technical_depth"),
  v.literal("system_design"),
  v.literal("collaboration"),
  v.literal("conflict"),
  v.literal("ambiguity"),
  v.literal("customer_impact"),
  v.literal("leadership"),
  v.literal("execution")
)

export const winType = v.union(
  v.literal("application_submitted"),
  v.literal("response_received"),
  v.literal("interview_reached"),
  v.literal("offer_received"),
  v.literal("resume_improved"),
  v.literal("follow_up_completed")
)

const resumeSnapshot = v.object({
  label: v.string(),
  fileName: v.string(),
  storageId: v.id("_storage"),
  mimeType: v.literal("application/pdf"),
  sizeBytes: v.number(),
})

export default defineSchema({
  users: defineTable({
    authSubject: v.string(),
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    normalizedEmail: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    lastSeenAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authSubject", ["authSubject"])
    .index("by_normalizedEmail", ["normalizedEmail"]),

  userSettings: defineTable({
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    theme: v.union(v.literal("dark"), v.literal("light"), v.literal("system")),
    timezone: v.string(),
    weekStartsOn: v.literal("monday"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  applications: defineTable({
    userId: v.id("users"),
    companyName: v.string(),
    companyKey: v.string(),
    companyWebsite: v.optional(v.string()),
    companyDomain: v.optional(v.string()),
    roleTitle: v.string(),
    roleKey: v.string(),
    location: v.optional(v.string()),
    workArrangement: v.optional(workArrangement),
    compensationMin: v.optional(v.number()),
    compensationMax: v.optional(v.number()),
    compensationCurrency: v.optional(v.string()),
    compensationPeriod: v.optional(compensationPeriod),
    compensationNotes: v.optional(v.string()),
    postingUrl: v.optional(v.string()),
    postingUrlCanonical: v.optional(v.string()),
    postingTitleSnapshot: v.optional(v.string()),
    postingCompanySnapshot: v.optional(v.string()),
    postingCapturedAt: v.optional(v.number()),
    jobDescriptionSnapshot: v.optional(v.string()),
    source: v.optional(applicationSource),
    sourceDetail: v.optional(v.string()),
    sourceSystem: v.optional(sourceSystem),
    sourceExternalId: v.optional(v.string()),
    dateSavedDate: v.optional(v.string()),
    dateAppliedDate: v.optional(v.string()),
    stage: applicationStage,
    currentStageEnteredAt: v.number(),
    referralStatus: v.optional(referralStatus),
    applicationType: v.optional(applicationType),
    currentResumeId: v.optional(v.id("resumes")),
    qualityChecks: v.array(qualityCheckSnapshot),
    applicationDeadlineDate: v.optional(v.string()),
    takeHomeDeadlineDate: v.optional(v.string()),
    offerResponseDeadlineDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    closedAt: v.optional(v.number()),
    closedDate: v.optional(v.string()),
    closedOutcome: v.optional(closedOutcome),
    rejectionStage: v.optional(rejectionStage),
    rejectionStageDetail: v.optional(v.string()),
    rejectionReason: v.optional(rejectionReason),
    rejectionReasonDetail: v.optional(v.string()),
    rejectionFeedback: v.optional(v.string()),
    rejectionLessons: v.optional(v.string()),
    reapplyAfterDate: v.optional(v.string()),
    archived: v.boolean(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActivityAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_archived", ["userId", "archived"])
    .index("by_userId_and_stage", ["userId", "stage"])
    .index("by_userId_and_archived_and_stage", ["userId", "archived", "stage"])
    .index("by_userId_and_companyKey", ["userId", "companyKey"])
    .index("by_userId_and_roleKey", ["userId", "roleKey"])
    .index("by_userId_and_postingUrlCanonical", ["userId", "postingUrlCanonical"])
    .index("by_userId_and_source", ["userId", "source"])
    .index("by_userId_and_referralStatus", ["userId", "referralStatus"])
    .index("by_userId_and_currentResumeId", ["userId", "currentResumeId"])
    .index("by_userId_and_dateAppliedDate", ["userId", "dateAppliedDate"])
    .index("by_userId_and_applicationDeadlineDate", ["userId", "applicationDeadlineDate"])
    .index("by_userId_and_takeHomeDeadlineDate", ["userId", "takeHomeDeadlineDate"])
    .index("by_userId_and_offerResponseDeadlineDate", ["userId", "offerResponseDeadlineDate"])
    .index("by_userId_and_reapplyAfterDate", ["userId", "reapplyAfterDate"])
    .index("by_userId_and_lastActivityAt", ["userId", "lastActivityAt"])
    .index("by_userId_and_sourceSystem_and_sourceExternalId", [
      "userId",
      "sourceSystem",
      "sourceExternalId",
    ]),

  applicationStageHistory: defineTable({
    userId: v.id("users"),
    applicationId: v.id("applications"),
    stage: applicationStage,
    enteredAt: v.number(),
    exitedAt: v.optional(v.number()),
    enteredFromStage: v.optional(applicationStage),
    exitedToStage: v.optional(applicationStage),
    source: v.union(v.literal("user"), v.literal("system"), v.literal("import")),
    activityEventId: v.optional(v.id("activityEvents")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_applicationId_and_enteredAt", ["applicationId", "enteredAt"])
    .index("by_userId_and_stage", ["userId", "stage"])
    .index("by_userId_and_enteredAt", ["userId", "enteredAt"])
    .index("by_userId_and_exitedAt", ["userId", "exitedAt"]),

  activityEvents: defineTable({
    userId: v.id("users"),
    applicationId: v.id("applications"),
    type: activityType,
    title: v.string(),
    description: v.optional(v.string()),
    source: v.union(v.literal("auto"), v.literal("manual")),
    actorType: v.union(v.literal("user"), v.literal("system")),
    actorUserId: v.optional(v.id("users")),
    eventAt: v.number(),
    eventDate: v.optional(v.string()),
    relatedEntityType: v.optional(relatedEntityType),
    relatedEntityId: v.optional(v.string()),
    metadataJson: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    supersededAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_userId_and_eventAt", ["userId", "eventAt"])
    .index("by_applicationId_and_eventAt", ["applicationId", "eventAt"])
    .index("by_userId_and_relatedEntity", ["userId", "relatedEntityType", "relatedEntityId"])
    .index("by_userId_and_dedupeKey", ["userId", "dedupeKey"]),

  applicationContacts: defineTable({
    userId: v.id("users"),
    applicationId: v.id("applications"),
    name: v.string(),
    normalizedName: v.optional(v.string()),
    relationshipType: contactRelationshipType,
    relationshipDetail: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
    email: v.optional(v.string()),
    normalizedEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    archived: v.boolean(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_userId_and_relationshipType", ["userId", "relationshipType"])
    .index("by_userId_and_normalizedEmail", ["userId", "normalizedEmail"])
    .index("by_userId_and_archived", ["userId", "archived"]),

  applicationInterviews: defineTable({
    userId: v.id("users"),
    applicationId: v.id("applications"),
    roundNumber: v.optional(v.number()),
    roundLabel: v.optional(v.string()),
    interviewType: v.optional(interviewType),
    interviewTypeDetail: v.optional(v.string()),
    format: v.optional(interviewFormat),
    formatDetail: v.optional(v.string()),
    status: interviewStatus,
    scheduledAt: v.optional(v.number()),
    scheduledDate: v.optional(v.string()),
    timezone: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    contactIds: v.array(v.id("applicationContacts")),
    prepNotes: v.optional(v.string()),
    questions: v.optional(v.string()),
    feedback: v.optional(v.string()),
    result: v.optional(interviewResult),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userId_and_scheduledAt", ["userId", "scheduledAt"])
    .index("by_userId_and_scheduledDate", ["userId", "scheduledDate"])
    .index("by_applicationId_and_scheduledAt", ["applicationId", "scheduledAt"]),

  applicationOffers: defineTable({
    userId: v.id("users"),
    applicationId: v.id("applications"),
    versionNumber: v.number(),
    isCurrent: v.boolean(),
    offeredAt: v.optional(v.number()),
    offeredDate: v.optional(v.string()),
    responseDeadlineDate: v.optional(v.string()),
    baseAmount: v.optional(v.number()),
    bonusAmount: v.optional(v.number()),
    equitySummary: v.optional(v.string()),
    currency: v.optional(v.string()),
    period: v.optional(v.union(
      v.literal("year"),
      v.literal("day"),
      v.literal("month"),
      v.literal("hour"),
      v.literal("contract"),
      v.literal("unknown")
    )),
    compensationNotes: v.optional(v.string()),
    decision: offerDecision,
    decidedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_applicationId_and_versionNumber", ["applicationId", "versionNumber"])
    .index("by_userId_and_decision", ["userId", "decision"])
    .index("by_userId_and_responseDeadlineDate", ["userId", "responseDeadlineDate"])
    .index("by_userId_and_isCurrent", ["userId", "isCurrent"]),

  resumes: defineTable({
    userId: v.id("users"),
    label: v.string(),
    fileName: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.literal("application/pdf"),
    sizeBytes: v.number(),
    fileHash: v.optional(v.string()),
    notes: v.optional(v.string()),
    isDefault: v.boolean(),
    defaultedAt: v.optional(v.number()),
    archived: v.boolean(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_archived", ["userId", "archived"])
    .index("by_userId_and_isDefault", ["userId", "isDefault"])
    .index("by_userId_and_fileHash", ["userId", "fileHash"]),

  applicationResumeLinks: defineTable({
    userId: v.id("users"),
    applicationId: v.id("applications"),
    resumeId: v.id("resumes"),
    isCurrent: v.boolean(),
    linkedAt: v.number(),
    unlinkedAt: v.optional(v.number()),
    resumeSnapshot,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_userId_and_resumeId", ["userId", "resumeId"])
    .index("by_userId_and_applicationId_and_isCurrent", [
      "userId",
      "applicationId",
      "isCurrent",
    ]),

  qualityChecklistItems: defineTable({
    userId: v.id("users"),
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    source: v.union(v.literal("default"), v.literal("custom")),
    weight: v.number(),
    sortOrder: v.number(),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_enabled", ["userId", "enabled"])
    .index("by_userId_and_sortOrder", ["userId", "sortOrder"])
    .index("by_userId_and_key", ["userId", "key"]),

  targetCompanies: defineTable({
    userId: v.id("users"),
    companyName: v.string(),
    companyKey: v.string(),
    website: v.optional(v.string()),
    domain: v.optional(v.string()),
    tier: targetCompanyTier,
    status: targetCompanyStatus,
    targetRoles: v.array(v.string()),
    targetLevel: v.optional(v.string()),
    locationPreference: v.optional(v.string()),
    workArrangement: v.optional(workArrangement),
    priorityScore: v.number(),
    roleFitScore: v.number(),
    referralGoal: v.number(),
    applicationWindowStartDate: v.optional(v.string()),
    applicationWindowEndDate: v.optional(v.string()),
    researchNotes: v.optional(v.string()),
    hiringBarNotes: v.optional(v.string()),
    interviewProcessNotes: v.optional(v.string()),
    compensationNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
    archived: v.boolean(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_companyKey", ["userId", "companyKey"])
    .index("by_userId_and_tier", ["userId", "tier"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userId_and_archived", ["userId", "archived"])
    .index("by_userId_and_priorityScore", ["userId", "priorityScore"]),

  referralOutreach: defineTable({
    userId: v.id("users"),
    targetCompanyId: v.optional(v.id("targetCompanies")),
    applicationId: v.optional(v.id("applications")),
    contactName: v.string(),
    contactRole: v.optional(v.string()),
    source: referralOutreachSource,
    status: referralOutreachStatus,
    linkedinUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    normalizedEmail: v.optional(v.string()),
    firstContactedDate: v.optional(v.string()),
    lastContactedDate: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    messageTemplate: v.optional(v.string()),
    notes: v.optional(v.string()),
    archived: v.boolean(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_targetCompanyId", ["targetCompanyId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userId_and_followUpDate", ["userId", "followUpDate"])
    .index("by_userId_and_archived", ["userId", "archived"]),

  interviewPrepPlans: defineTable({
    userId: v.id("users"),
    applicationId: v.optional(v.id("applications")),
    targetCompanyId: v.optional(v.id("targetCompanies")),
    title: v.string(),
    status: prepPlanStatus,
    focusAreas: v.array(prepFocusArea),
    codingDrillsTarget: v.number(),
    codingDrillsDone: v.number(),
    systemDesignDrillsTarget: v.number(),
    systemDesignDrillsDone: v.number(),
    behavioralStoriesTarget: v.number(),
    behavioralStoriesReady: v.number(),
    mockInterviewsTarget: v.number(),
    mockInterviewsDone: v.number(),
    companyResearchDone: v.boolean(),
    resumeDeepDiveDone: v.boolean(),
    weaknessTags: v.array(v.string()),
    nextAction: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_targetCompanyId", ["targetCompanyId"])
    .index("by_userId_and_status", ["userId", "status"]),

  storyBankEntries: defineTable({
    userId: v.id("users"),
    title: v.string(),
    project: v.optional(v.string()),
    situation: v.string(),
    task: v.string(),
    action: v.string(),
    result: v.string(),
    impactMetrics: v.optional(v.string()),
    technologies: v.array(v.string()),
    competencies: v.array(storyCompetency),
    senioritySignal: v.optional(v.string()),
    notes: v.optional(v.string()),
    archived: v.boolean(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_archived", ["userId", "archived"]),

  storyUsages: defineTable({
    userId: v.id("users"),
    storyId: v.id("storyBankEntries"),
    applicationId: v.optional(v.id("applications")),
    interviewId: v.optional(v.id("applicationInterviews")),
    usedAtDate: v.optional(v.string()),
    confidence: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_storyId", ["storyId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_interviewId", ["interviewId"]),

  tasks: defineTable({
    userId: v.id("users"),
    applicationId: v.optional(v.id("applications")),
    relatedInterviewId: v.optional(v.id("applicationInterviews")),
    relatedOfferId: v.optional(v.id("applicationOffers")),
    kind: taskKind,
    kindDetail: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    timezone: v.optional(v.string()),
    status: taskStatus,
    source: v.union(v.literal("manual"), v.literal("system"), v.literal("deadline")),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_relatedInterviewId", ["relatedInterviewId"])
    .index("by_relatedOfferId", ["relatedOfferId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userId_and_status_and_dueAt", ["userId", "status", "dueAt"])
    .index("by_userId_and_status_and_dueDate", ["userId", "status", "dueDate"])
    .index("by_userId_and_kind", ["userId", "kind"]),

  weeklyGoals: defineTable({
    userId: v.id("users"),
    weekStartDate: v.string(),
    timezone: v.string(),
    applicationsSentTarget: v.number(),
    followUpsSentTarget: v.number(),
    interviewsReachedTarget: v.number(),
    resumeImprovementsTarget: v.number(),
    manualResumeImprovements: v.number(),
    lessonsLearned: v.optional(v.string()),
    nextWeekFocus: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_weekStartDate", ["userId", "weekStartDate"]),

  winLogEntries: defineTable({
    userId: v.id("users"),
    applicationId: v.optional(v.id("applications")),
    type: winType,
    title: v.string(),
    notes: v.optional(v.string()),
    occurredAt: v.number(),
    occurredDate: v.string(),
    source: v.union(v.literal("auto"), v.literal("manual")),
    relatedEntityType: v.optional(v.union(
      v.literal("application"),
      v.literal("task"),
      v.literal("interview"),
      v.literal("offer"),
      v.literal("resume")
    )),
    relatedEntityId: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_occurredAt", ["userId", "occurredAt"])
    .index("by_userId_and_occurredDate", ["userId", "occurredDate"])
    .index("by_userId_and_type", ["userId", "type"])
    .index("by_userId_and_dedupeKey", ["userId", "dedupeKey"]),
})
