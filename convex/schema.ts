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

export const offerDecision = v.union(
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("negotiating")
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
  v.literal("offer")
)

export const rejectionReason = v.union(
  v.literal("resume_mismatch"),
  v.literal("experience_gap"),
  v.literal("compensation"),
  v.literal("location"),
  v.literal("timing"),
  v.literal("competition"),
  v.literal("unknown")
)

export const qualityCheckSnapshot = v.object({
  key: v.string(),
  label: v.string(),
  checked: v.boolean(),
  weight: v.number(),
  source: v.union(v.literal("default"), v.literal("custom")),
})

export const reminderType = v.union(
  v.literal("follow_up"),
  v.literal("deadline"),
  v.literal("general")
)

export const reminderStatus = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("dismissed")
)

export const activityType = v.union(
  v.literal("created"),
  v.literal("stage_changed"),
  v.literal("edited"),
  v.literal("resume_linked"),
  v.literal("reminder_completed"),
  v.literal("note"),
  v.literal("manual")
)

export const winType = v.union(
  v.literal("application_submitted"),
  v.literal("response_received"),
  v.literal("interview_reached"),
  v.literal("offer_received"),
  v.literal("resume_improved"),
  v.literal("follow_up_completed")
)

const timestamp = v.union(v.string(), v.number())

export default defineSchema({
  users: defineTable({
    authUserId: v.string(),
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

  userSettings: defineTable({
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    theme: v.optional(v.union(v.literal("dark"), v.literal("light"), v.literal("system"))),
    createdAt: timestamp,
    updatedAt: timestamp,
  }).index("by_userId", ["userId"]),

  applications: defineTable({
    userId: v.id("users"),
    companyName: v.string(),
    roleTitle: v.string(),
    location: v.optional(v.string()),
    workArrangement: v.optional(workArrangement),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    currency: v.optional(v.string()),
    postingUrl: v.optional(v.string()),
    source: v.optional(applicationSource),
    dateApplied: v.optional(v.string()),
    stage: applicationStage,
    referralStatus: v.optional(referralStatus),
    applicationType: v.optional(applicationType),
    resumeId: v.optional(v.id("resumes")),
    qualityChecks: v.array(qualityCheckSnapshot),
    applicationDeadlineAt: v.optional(v.string()),
    takeHomeDeadlineAt: v.optional(v.string()),
    offerResponseDeadlineAt: v.optional(v.string()),
    offerComp: v.optional(v.string()),
    offerDecision: v.optional(offerDecision),
    jobDescriptionSnapshot: v.optional(v.string()),
    notes: v.optional(v.string()),
    closedAt: v.optional(v.string()),
    closedOutcome: v.optional(closedOutcome),
    rejectionStage: v.optional(rejectionStage),
    rejectionReason: v.optional(rejectionReason),
    rejectionFeedback: v.optional(v.string()),
    rejectionLessons: v.optional(v.string()),
    reapplyAfter: v.optional(v.string()),
    archived: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastActivityAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_archived", ["userId", "archived"])
    .index("by_userId_and_stage", ["userId", "stage"])
    .index("by_userId_and_source", ["userId", "source"])
    .index("by_userId_and_referralStatus", ["userId", "referralStatus"])
    .index("by_userId_and_resumeId", ["userId", "resumeId"])
    .index("by_userId_and_applicationDeadlineAt", [
      "userId",
      "applicationDeadlineAt",
    ])
    .index("by_userId_and_takeHomeDeadlineAt", ["userId", "takeHomeDeadlineAt"])
    .index("by_userId_and_offerResponseDeadlineAt", [
      "userId",
      "offerResponseDeadlineAt",
    ])
    .index("by_userId_and_reapplyAfter", ["userId", "reapplyAfter"]),

  resumes: defineTable({
    userId: v.id("users"),
    label: v.string(),
    fileName: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    sizeBytes: v.number(),
    notes: v.optional(v.string()),
    isDefault: v.boolean(),
    archived: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_archived", ["userId", "archived"])
    .index("by_userId_and_isDefault", ["userId", "isDefault"]),

  qualityChecklistItems: defineTable({
    userId: v.id("users"),
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    source: v.union(v.literal("default"), v.literal("custom")),
    weight: v.number(),
    sortOrder: v.number(),
    enabled: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_enabled", ["userId", "enabled"]),

  reminders: defineTable({
    userId: v.id("users"),
    applicationId: v.optional(v.id("applications")),
    title: v.string(),
    description: v.optional(v.string()),
    dueAt: v.string(),
    status: reminderStatus,
    reminderType,
    createdAt: v.string(),
    completedAt: v.optional(v.string()),
    dismissedAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userId_and_status_and_dueAt", ["userId", "status", "dueAt"])
    .index("by_applicationId", ["applicationId"]),

  activityEvents: defineTable({
    userId: v.id("users"),
    applicationId: v.id("applications"),
    type: activityType,
    title: v.string(),
    description: v.optional(v.string()),
    source: v.union(v.literal("auto"), v.literal("manual")),
    eventDate: v.string(),
    createdAt: v.string(),
    fromStage: v.optional(applicationStage),
    toStage: v.optional(applicationStage),
  })
    .index("by_userId", ["userId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_userId_and_eventDate", ["userId", "eventDate"]),

  weeklyGoals: defineTable({
    userId: v.id("users"),
    weekStart: v.string(),
    applicationsSentTarget: v.number(),
    followUpsSentTarget: v.number(),
    interviewsReachedTarget: v.number(),
    resumeImprovementsTarget: v.number(),
    manualResumeImprovements: v.number(),
    lessonsLearned: v.optional(v.string()),
    nextWeekFocus: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_weekStart", ["userId", "weekStart"]),

  winLogEntries: defineTable({
    userId: v.id("users"),
    applicationId: v.optional(v.id("applications")),
    type: winType,
    title: v.string(),
    notes: v.optional(v.string()),
    occurredAt: v.string(),
    source: v.union(v.literal("auto"), v.literal("manual")),
    createdAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_occurredAt", ["userId", "occurredAt"]),
})
