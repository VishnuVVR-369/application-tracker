import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const applicationStatus = v.union(
  v.literal("saved"),
  v.literal("applied"),
  v.literal("in_progress"),
  v.literal("closed"),
)

export const applicationOutcome = v.union(
  v.literal("offer"),
  v.literal("rejected"),
  v.literal("ghosted"),
  v.literal("withdrawn"),
)

export const jobSource = v.union(
  v.literal("linkedin"),
  v.literal("naukri"),
  v.literal("indeed"),
  v.literal("company_site"),
  v.literal("other"),
)

export const referralStatus = v.union(
  v.literal("to_ask"),
  v.literal("asked"),
  v.literal("referred"),
  v.literal("declined"),
  v.literal("no_reply"),
)

export const referralChannel = v.union(
  v.literal("linkedin"),
  v.literal("email"),
  v.literal("whatsapp"),
  v.literal("phone"),
  v.literal("other"),
)

export const resumeTextStatus = v.union(
  v.literal("extracting"),
  v.literal("ready"),
  v.literal("failed"),
)

export const accomplishmentStatus = v.union(v.literal("draft"), v.literal("confirmed"), v.literal("dismissed"))
export const accomplishmentFields = {
  title: v.string(),
  description: v.string(),
  skills: v.array(v.string()),
  sourceQuote: v.string(),
  clarification: v.string(),
}
export const suggestionFields = {
  kind: v.union(v.literal("replace"), v.literal("add"), v.literal("shorten"), v.literal("remove"), v.literal("reorder")),
  section: v.string(),
  currentText: v.string(),
  suggestedText: v.string(),
  reason: v.string(),
  accomplishmentIds: v.array(v.string()),
  resumeQuote: v.string(),
}
export const evidenceSnapshot = v.object({
  accomplishmentId: v.id("accomplishments"),
  reviewId: v.id("reviews"),
  reviewTitle: v.string(),
  company: v.string(),
  role: v.string(),
  period: v.string(),
  title: v.string(),
  description: v.string(),
  skills: v.array(v.string()),
  sourceQuote: v.string(),
})

export default defineSchema({
  companies: defineTable({
    userId: v.string(),
    name: v.string(),
    // Lowercased, whitespace-collapsed name so "Google" and "google " match.
    nameKey: v.string(),
  }).index("by_user_key", ["userId", "nameKey"]),

  applications: defineTable({
    userId: v.string(),
    companyId: v.id("companies"),
    role: v.string(),
    jobUrl: v.optional(v.string()),
    source: jobSource,
    jobDescription: v.string(),
    notes: v.string(),
    status: applicationStatus,
    outcome: v.optional(applicationOutcome),
    savedAt: v.number(),
    appliedAt: v.optional(v.number()),
    statusChangedAt: v.number(),
    baseResumeId: v.optional(v.id("baseResumes")),
    finalResume: v.optional(
      v.object({ storageId: v.id("_storage"), fileName: v.string(), uploadedAt: v.number() }),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_base_resume", ["baseResumeId"]),

  people: defineTable({
    userId: v.string(),
    companyId: v.id("companies"),
    name: v.string(),
    title: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
  }).index("by_company", ["companyId"]),

  referralRequests: defineTable({
    userId: v.string(),
    applicationId: v.id("applications"),
    personId: v.id("people"),
    status: referralStatus,
    channel: v.optional(referralChannel),
    askedAt: v.optional(v.number()),
    // Last time a follow-up nudge was sent; resets the follow-up clock.
    followedUpAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_application", ["applicationId"])
    .index("by_person", ["personId"])
    .index("by_user_status", ["userId", "status"]),

  baseResumes: defineTable({
    userId: v.string(),
    label: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    text: v.optional(v.string()),
    textStatus: resumeTextStatus,
    uploadedAt: v.number(),
  }).index("by_user", ["userId"]),

  reviews: defineTable({
    userId: v.string(),
    title: v.string(),
    company: v.string(),
    role: v.string(),
    period: v.string(),
    text: v.string(),
    status: v.union(v.literal("extracting"), v.literal("ready"), v.literal("failed")),
    version: v.number(),
    startedAt: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  accomplishments: defineTable({
    userId: v.string(),
    reviewId: v.id("reviews"),
    ...accomplishmentFields,
    status: accomplishmentStatus,
    updatedAt: v.number(),
  })
    .index("by_review", ["reviewId"])
    .index("by_user_status", ["userId", "status"]),

  resumeSuggestions: defineTable({
    userId: v.string(),
    applicationId: v.id("applications"),
    baseResumeId: v.id("baseResumes"),
    status: v.union(v.literal("generating"), v.literal("ready"), v.literal("failed")),
    version: v.number(),
    startedAt: v.number(),
    requestFingerprint: v.string(),
    error: v.optional(v.string()),
    result: v.optional(v.object({
      fingerprint: v.string(),
      summary: v.string(),
      suggestions: v.array(v.object({ ...suggestionFields, evidence: v.array(evidenceSnapshot) })),
      model: v.string(),
      generatedAt: v.number(),
    })),
  })
    .index("by_application_resume", ["applicationId", "baseResumeId"])
    .index("by_base_resume", ["baseResumeId"]),

  analyses: defineTable({
    userId: v.string(),
    applicationId: v.id("applications"),
    baseResumeId: v.id("baseResumes"),
    score: v.number(),
    verdict: v.string(),
    matchedKeywords: v.array(v.string()),
    missingKeywords: v.array(
      v.object({ keyword: v.string(), importance: v.union(v.literal("required"), v.literal("preferred")) }),
    ),
    model: v.string(),
    createdAt: v.number(),
  })
    .index("by_application_resume", ["applicationId", "baseResumeId"])
    .index("by_base_resume", ["baseResumeId"]),

  userSettings: defineTable({
    userId: v.string(),
    followUpDays: v.number(),
    weeklyGoal: v.optional(v.number()),
  }).index("by_user", ["userId"]),
})
