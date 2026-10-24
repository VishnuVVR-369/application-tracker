import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

/** The board's columns, the statuses you can move an application between. */
export const boardStatus = v.union(
  v.literal("saved"),
  v.literal("applied"),
  v.literal("in_progress"),
  v.literal("closed"),
)

// Jobs the Job Scout collects start as "discovered" in the inbox; "dismissed" ones stay stored but out of the way.
export const applicationStatus = v.union(v.literal("discovered"), v.literal("dismissed"), boardStatus)

export const jobPortal = v.union(v.literal("linkedin"), v.literal("naukri"))
export const jobFeed = v.union(v.literal("recommended"), v.literal("saved_search"), v.literal("alert"))
export const workMode = v.union(v.literal("onsite"), v.literal("hybrid"), v.literal("remote"))
export const postingSignals = v.object({
  promoted: v.optional(v.boolean()),
  easyApply: v.optional(v.boolean()),
  activelyRecruiting: v.optional(v.boolean()),
  applicants: v.optional(v.string()),
  skillsMatch: v.optional(v.string()),
})
export const apiScope = v.union(v.literal("jobs:read"), v.literal("jobs:write"))

const resumeAttempt = v.object({ baseResumeId: v.id("baseResumes"), fingerprint: v.string() })

/** What the automation is doing for a job in the inbox. Only jobs still in the inbox are advanced. */
export const pipelineState = v.object({
  state: v.union(
    v.literal("analyzing"),
    v.literal("suggesting"),
    v.literal("done"),
    v.literal("waiting"),
    v.literal("failed"),
  ),
  reason: v.optional(v.string()),
  // Match analyses queued and not finished yet, so advancing twice never queues the same one again.
  pending: v.array(resumeAttempt),
  // Analyses that failed for good with these inputs; they're retried only when you ask or the inputs change.
  failures: v.array(v.object({ baseResumeId: v.id("baseResumes"), fingerprint: v.string(), error: v.string() })),
  updatedAt: v.number(),
})

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
export const analysisFields = {
  score: v.number(),
  verdict: v.string(),
  matchedKeywords: v.array(v.string()),
  missingKeywords: v.array(
    v.object({ keyword: v.string(), importance: v.union(v.literal("required"), v.literal("preferred")) }),
  ),
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
    // Set when you pick the base resume yourself, so the automation never overrides your choice.
    baseResumePinned: v.optional(v.boolean()),
    finalResume: v.optional(
      v.object({ storageId: v.id("_storage"), fileName: v.string(), uploadedAt: v.number() }),
    ),
    location: v.optional(v.string()),
    workMode: v.optional(workMode),
    salaryText: v.optional(v.string()),
    postedText: v.optional(v.string()),
    discoveredAt: v.optional(v.number()),
    dismissReason: v.optional(v.string()),
    // Company and normalized role, to find the same job collected from another portal.
    dedupeKey: v.optional(v.string()),
    // The highest match score across base resumes, for ranking the inbox.
    fit: v.optional(v.object({ score: v.number(), baseResumeId: v.id("baseResumes") })),
    pipeline: v.optional(pipelineState),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_dedupe", ["userId", "dedupeKey"])
    .index("by_company", ["companyId"])
    .index("by_base_resume", ["baseResumeId"]),

  /** One portal's listing of a job. A job seen on LinkedIn and Naukri has two postings and one application. */
  jobPostings: defineTable({
    userId: v.string(),
    portal: jobPortal,
    postingId: v.string(),
    url: v.string(),
    // Unset while the posting is being read, or after you delete its application (kept so it isn't collected again).
    applicationId: v.optional(v.id("applications")),
    feeds: v.array(jobFeed),
    signals: v.optional(postingSignals),
    pageText: v.optional(v.string()),
    pageTextHash: v.optional(v.string()),
    extraction: v.union(v.literal("pending"), v.literal("done"), v.literal("failed")),
    error: v.optional(v.string()),
    attempts: v.optional(v.number()),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_user_portal_posting", ["userId", "portal", "postingId"])
    .index("by_application", ["applicationId"])
    .index("by_user_first_seen", ["userId", "firstSeenAt"]),

  /** Tokens other apps (the Job Scout in open-bot) use to reach the tracker's MCP endpoint. Only hashes are stored. */
  apiTokens: defineTable({
    userId: v.string(),
    name: v.string(),
    tokenHash: v.string(),
    // The first characters, so you can tell tokens apart.
    prefix: v.string(),
    scopes: v.array(apiScope),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_hash", ["tokenHash"])
    .index("by_user", ["userId"]),

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
    ...analysisFields,
    model: v.string(),
    // Of the inputs the score was computed from, so an unchanged pair is never scored twice.
    fingerprint: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_application_resume", ["applicationId", "baseResumeId"])
    .index("by_base_resume", ["baseResumeId"]),

  userSettings: defineTable({
    userId: v.string(),
    followUpDays: v.number(),
    weeklyGoal: v.optional(v.number()),
    fitThreshold: v.optional(v.number()),
    // The pending inbox refresh after a resume or your experience changed, so a burst of edits runs it once.
    inboxRefreshId: v.optional(v.id("_scheduled_functions")),
  }).index("by_user", ["userId"]),
})
