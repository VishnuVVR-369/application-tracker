import { ConvexError, v } from "convex/values"

import { APPLICATION_STATUSES } from "../lib/domain"
import { dedupeKey, PORTAL_LABELS, postingFromUrl } from "../lib/jobs"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx } from "./_generated/server"
import {
  cleanOptional,
  findOrCreateCompany,
  getOwned,
  getSettings,
  getUserId,
  requireText,
  requireUserId,
} from "./helpers"
import { advance } from "./pipeline"
import { applicationOutcome, boardStatus, jobSource } from "./schema"

const MAX_PDF_BYTES = 10 * 1024 * 1024

export const board = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    // Only the board's columns: jobs waiting in the inbox (or dismissed there) can number in the hundreds.
    const [columns, { followUpDays, weeklyGoal }] = await Promise.all([
      Promise.all(
        APPLICATION_STATUSES.map((status) =>
          ctx.db
            .query("applications")
            .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", status))
            .collect(),
        ),
      ),
      getSettings(ctx, userId),
    ])
    // Each column's status, typed as a board status.
    const applications = columns.flatMap((column, index) =>
      column.map((application) => ({ ...application, status: APPLICATION_STATUSES[index] })),
    )
    const companyNames = new Map<Id<"companies">, string>()
    const cards = await Promise.all(
      applications.map(async (application) => {
        if (!companyNames.has(application.companyId)) {
          const company = await ctx.db.get(application.companyId)
          companyNames.set(application.companyId, company?.name ?? "Unknown company")
        }
        const referrals = await ctx.db
          .query("referralRequests")
          .withIndex("by_application", (q) => q.eq("applicationId", application._id))
          .collect()
        return {
          _id: application._id,
          company: companyNames.get(application.companyId)!,
          role: application.role,
          source: application.source,
          status: application.status,
          outcome: application.outcome,
          statusChangedAt: application.statusChangedAt,
          appliedAt: application.appliedAt,
          hasFinalResume: application.finalResume !== undefined,
          // Only the fields needed to summarize referrals; due-ness is computed on the client against the live clock.
          referrals: referrals.map(({ status, askedAt, followedUpAt }) => ({ status, askedAt, followedUpAt })),
        }
      }),
    )
    cards.sort((a, b) => b.statusChangedAt - a.statusChangedAt)
    return { cards, followUpDays, weeklyGoal }
  },
})

export const get = query({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const application = await ctx.db.get(id)
    if (!application || application.userId !== userId) return null
    const [company, postings] = await Promise.all([
      ctx.db.get(application.companyId),
      ctx.db
        .query("jobPostings")
        .withIndex("by_application", (q) => q.eq("applicationId", id))
        .collect(),
    ])
    const finalResumeUrl = application.finalResume
      ? await ctx.storage.getUrl(application.finalResume.storageId)
      : null
    return {
      ...application,
      company: company?.name ?? "Unknown company",
      finalResumeUrl,
      postings: postings
        .filter((posting) => posting.extraction === "done")
        .map(({ _id, portal, url, firstSeenAt, lastSeenAt }) => ({
          _id,
          portal,
          portalLabel: PORTAL_LABELS[portal],
          url,
          firstSeenAt,
          lastSeenAt,
        })),
    }
  },
})

export const companyNames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return []
    // Companies of jobs you only collected or dismissed would crowd the suggestions.
    const [companies, applications] = await Promise.all([
      ctx.db
        .query("companies")
        .withIndex("by_user_key", (q) => q.eq("userId", userId))
        .collect(),
      Promise.all(
        APPLICATION_STATUSES.map((status) =>
          ctx.db
            .query("applications")
            .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", status))
            .collect(),
        ),
      ),
    ])
    const tracked = new Set(applications.flat().map((application) => application.companyId))
    const people = await Promise.all(
      companies.map((company) =>
        ctx.db
          .query("people")
          .withIndex("by_company", (q) => q.eq("companyId", company._id))
          .first(),
      ),
    )
    return companies.filter((company, index) => tracked.has(company._id) || people[index]).map((company) => company.name)
  },
})

const editableFields = {
  company: v.string(),
  role: v.string(),
  jobUrl: v.optional(v.string()),
  source: jobSource,
  location: v.optional(v.string()),
  jobDescription: v.string(),
  notes: v.string(),
}

export const create = mutation({
  // `applied` covers the common case of logging a job you have already applied to, skipping Saved.
  args: { ...editableFields, applied: v.optional(v.boolean()) },
  handler: async (ctx, { applied, ...args }) => {
    const userId = await requireUserId(ctx)
    const now = Date.now()
    const role = requireText(args.role, "Role")
    const jobUrl = cleanOptional(args.jobUrl)
    const id = await ctx.db.insert("applications", {
      userId,
      companyId: await findOrCreateCompany(ctx, userId, args.company),
      role,
      jobUrl,
      source: args.source,
      location: cleanOptional(args.location),
      jobDescription: args.jobDescription.trim(),
      notes: args.notes.trim(),
      status: applied ? "applied" : "saved",
      savedAt: now,
      appliedAt: applied ? now : undefined,
      statusChangedAt: now,
      dedupeKey: dedupeKey(args.company, role),
    })
    await recordPosting(ctx, userId, id, jobUrl)
    return id
  },
})

export const update = mutation({
  args: { id: v.id("applications"), ...editableFields },
  handler: async (ctx, { id, ...args }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, id)
    const companyId = await findOrCreateCompany(ctx, userId, args.company)
    if (companyId !== application.companyId) {
      const referrals = await ctx.db
        .query("referralRequests")
        .withIndex("by_application", (q) => q.eq("applicationId", id))
        .first()
      if (referrals) {
        throw new ConvexError("Remove this application's referrals before moving it to a different company.")
      }
    }
    const role = requireText(args.role, "Role")
    const jobUrl = cleanOptional(args.jobUrl)
    await ctx.db.patch(id, {
      companyId,
      role,
      jobUrl,
      source: args.source,
      location: cleanOptional(args.location),
      jobDescription: args.jobDescription.trim(),
      notes: args.notes.trim(),
      dedupeKey: dedupeKey(args.company, role),
    })
    await deleteCompanyIfUnused(ctx, application.companyId)
    await recordPosting(ctx, userId, id, jobUrl)
    // An edited description is scored again while the job is still in the inbox.
    await advance(ctx, id)
  },
})

/**
 * Remembers a LinkedIn or Naukri posting you added yourself, so the Job Scout recognizes it instead of adding
 * the same job again.
 */
async function recordPosting(
  ctx: MutationCtx,
  userId: string,
  applicationId: Id<"applications">,
  jobUrl: string | undefined,
) {
  const posting = jobUrl ? postingFromUrl(jobUrl) : null
  if (!posting) return
  const existing = await ctx.db
    .query("jobPostings")
    .withIndex("by_user_portal_posting", (q) =>
      q.eq("userId", userId).eq("portal", posting.portal).eq("postingId", posting.postingId),
    )
    .unique()
  if (existing) {
    if (existing.applicationId === applicationId) return
    const linked = existing.applicationId ? await ctx.db.get(existing.applicationId) : null
    // A posting belongs to one application; leave it with the one it was collected for.
    if (!linked) await ctx.db.patch(existing._id, { applicationId, extraction: "done", error: undefined })
    return
  }
  const now = Date.now()
  await ctx.db.insert("jobPostings", {
    userId,
    portal: posting.portal,
    postingId: posting.postingId,
    url: posting.url,
    applicationId,
    feeds: [],
    extraction: "done",
    firstSeenAt: now,
    lastSeenAt: now,
  })
}

export const setStatus = mutation({
  args: { id: v.id("applications"), status: boardStatus, outcome: v.optional(applicationOutcome) },
  handler: async (ctx, { id, status, outcome }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, id)
    if (status === "closed" && !outcome) throw new ConvexError("Pick an outcome to close this application.")
    if (application.status === status && application.outcome === outcome) return
    const now = Date.now()
    const patch: Partial<Doc<"applications">> = {
      status,
      outcome: status === "closed" ? outcome : undefined,
    }
    if (application.status !== status) patch.statusChangedAt = now
    // Leaving the inbox through the status menu counts as shortlisting it.
    if (application.status === "discovered" || application.status === "dismissed") patch.savedAt = now
    if (status === "saved") patch.appliedAt = undefined
    else if (application.appliedAt === undefined) patch.appliedAt = now
    await ctx.db.patch(id, patch)
  },
})

export const setBaseResume = mutation({
  args: { id: v.id("applications"), baseResumeId: v.optional(v.id("baseResumes")) },
  handler: async (ctx, { id, baseResumeId }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    if (baseResumeId) await getOwned(ctx, userId, baseResumeId)
    // Your pick wins over the inbox automation's from now on.
    await ctx.db.patch(id, { baseResumeId, baseResumePinned: baseResumeId ? true : undefined })
    await advance(ctx, id)
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

/** Validates a freshly uploaded file and deletes it if it isn't an acceptable PDF. */
export async function assertUploadedPdf(ctx: MutationCtx, storageId: Id<"_storage">) {
  const file = await ctx.db.system.get(storageId)
  if (!file) throw new ConvexError("Upload not found. Please try again.")
  if (file.contentType !== "application/pdf" || file.size > MAX_PDF_BYTES) {
    await ctx.storage.delete(storageId)
    throw new ConvexError("Upload a PDF under 10 MB.")
  }
}

export const setFinalResume = mutation({
  args: { id: v.id("applications"), storageId: v.id("_storage"), fileName: v.string() },
  handler: async (ctx, { id, storageId, fileName }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, id)
    await assertUploadedPdf(ctx, storageId)
    if (application.finalResume) await ctx.storage.delete(application.finalResume.storageId)
    await ctx.db.patch(id, {
      finalResume: { storageId, fileName: requireText(fileName, "File name"), uploadedAt: Date.now() },
    })
  },
})

export const removeFinalResume = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, id)
    if (!application.finalResume) return
    await ctx.storage.delete(application.finalResume.storageId)
    await ctx.db.patch(id, { finalResume: undefined })
  },
})

export const remove = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, id)
    const [referrals, analyses, suggestions, postings] = await Promise.all([
      ctx.db
        .query("referralRequests")
        .withIndex("by_application", (q) => q.eq("applicationId", id))
        .collect(),
      ctx.db
        .query("analyses")
        .withIndex("by_application_resume", (q) => q.eq("applicationId", id))
        .collect(),
      ctx.db.query("resumeSuggestions").withIndex("by_application_resume", (q) => q.eq("applicationId", id)).collect(),
      ctx.db
        .query("jobPostings")
        .withIndex("by_application", (q) => q.eq("applicationId", id))
        .collect(),
    ])
    await Promise.all([...referrals, ...analyses, ...suggestions].map((doc) => ctx.db.delete(doc._id)))
    // Postings stay, unlinked and without their page text, so the Job Scout doesn't collect the job again.
    await Promise.all(
      postings.map((posting) =>
        ctx.db.patch(posting._id, { applicationId: undefined, pageText: undefined, pageTextHash: undefined }),
      ),
    )
    if (application.finalResume) await ctx.storage.delete(application.finalResume.storageId)
    await ctx.db.delete(id)
    await deleteCompanyIfUnused(ctx, application.companyId)
  },
})

/** Companies only exist to group applications and people, so drop one once nothing points at it. */
async function deleteCompanyIfUnused(ctx: MutationCtx, companyId: Id<"companies">) {
  const [application, person] = await Promise.all([
    ctx.db
      .query("applications")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .first(),
    ctx.db
      .query("people")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .first(),
  ])
  if (!application && !person) await ctx.db.delete(companyId)
}
