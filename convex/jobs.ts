import { vOnCompleteValidator } from "@convex-dev/workpool"
import { ConvexError, v, type Infer } from "convex/values"

import {
  citiesCompatible,
  DEDUPE_WINDOW_MS,
  dedupeKey,
  descriptionSimilarity,
  isQuotedFrom,
  MAX_PAGE_TEXT,
  MIN_DESCRIPTION_LENGTH,
  PORTAL_LABELS,
  postingFromUrl,
  SAME_JOB_SIMILARITY,
} from "../lib/jobs"
import { inputFingerprint } from "../lib/resume-writing"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { findOrCreateCompany, getOwned, getSettings, getUserId, requireUserId } from "./helpers"
import { advance } from "./pipeline"
import { jobsPool } from "./pool"
import { jobFeed, jobPortal, postingSignals, workMode } from "./schema"

/** At most this many postings per save_postings call. */
export const MAX_POSTINGS_PER_SAVE = 10
/** At most this many posting ids per report_feed call. */
export const MAX_FEED_IDS = 100

// ---------------------------------------------------------------------------------------------------------------
// Collecting postings (called by the MCP endpoint with the token's user)

export const reportFeed = internalMutation({
  args: { userId: v.string(), portal: jobPortal, feed: jobFeed, postingIds: v.array(v.string()) },
  handler: async (ctx, { userId, portal, feed, postingIds }) => {
    if (postingIds.length > MAX_FEED_IDS) throw new ConvexError(`Report at most ${MAX_FEED_IDS} posting ids at once.`)
    const now = Date.now()
    const unseen: string[] = []
    let known = 0
    for (const postingId of new Set(postingIds)) {
      const posting = await findPosting(ctx, userId, portal, postingId)
      if (!posting) {
        unseen.push(postingId)
        continue
      }
      known++
      await ctx.db.patch(posting._id, {
        lastSeenAt: now,
        feeds: posting.feeds.includes(feed) ? posting.feeds : [...posting.feeds, feed],
      })
    }
    return { newPostingIds: unseen, alreadyCollected: known }
  },
})

const postingInput = v.object({
  portal: jobPortal,
  postingId: v.string(),
  url: v.string(),
  feed: jobFeed,
  pageText: v.string(),
  signals: v.optional(postingSignals),
})

export const savePostings = internalMutation({
  args: { userId: v.string(), postings: v.array(postingInput) },
  handler: async (ctx, { userId, postings }) => {
    if (postings.length > MAX_POSTINGS_PER_SAVE) {
      throw new ConvexError(`Save at most ${MAX_POSTINGS_PER_SAVE} postings at once.`)
    }
    const results = []
    for (const posting of postings) results.push({ postingId: posting.postingId, ...(await savePosting(ctx, userId, posting)) })
    return results
  },
})

async function savePosting(
  ctx: MutationCtx,
  userId: string,
  input: Infer<typeof postingInput>,
): Promise<{ status: "queued" | "unchanged" | "rejected"; reason?: string }> {
  const parsed = postingFromUrl(input.url)
  if (parsed && (parsed.portal !== input.portal || parsed.postingId !== input.postingId)) {
    return { status: "rejected", reason: "The URL points at a different posting than postingId." }
  }
  if (!/^\d{6,}$/.test(input.postingId)) return { status: "rejected", reason: "postingId must be the portal's numeric id." }
  const pageText = input.pageText.trim().slice(0, MAX_PAGE_TEXT)
  if (pageText.length < MIN_DESCRIPTION_LENGTH) {
    return { status: "rejected", reason: "The page text is too short; open the full posting and read it again." }
  }
  const pageTextHash = await inputFingerprint(pageText)
  const now = Date.now()
  const existing = await findPosting(ctx, userId, input.portal, input.postingId)
  if (existing) {
    const feeds = existing.feeds.includes(input.feed) ? existing.feeds : [...existing.feeds, input.feed]
    const application = existing.applicationId ? await ctx.db.get(existing.applicationId) : null
    // Once you've shortlisted or dismissed a job (or deleted it), a new read of its page changes nothing.
    const frozen = existing.applicationId ? application?.status !== "discovered" : existing.extraction === "done"
    if (existing.pageTextHash === pageTextHash || frozen) {
      await ctx.db.patch(existing._id, { lastSeenAt: now, feeds, signals: input.signals ?? existing.signals })
      return { status: "unchanged" }
    }
    await ctx.db.patch(existing._id, {
      lastSeenAt: now,
      feeds,
      signals: input.signals ?? existing.signals,
      pageText,
      pageTextHash,
      extraction: "pending",
      error: undefined,
      attempts: 0,
    })
    await queueExtraction(ctx, existing._id, pageTextHash)
    return { status: "queued" }
  }
  const id = await ctx.db.insert("jobPostings", {
    userId,
    portal: input.portal,
    postingId: input.postingId,
    url: parsed?.url ?? input.url,
    feeds: [input.feed],
    signals: input.signals,
    pageText,
    pageTextHash,
    extraction: "pending",
    attempts: 0,
    firstSeenAt: now,
    lastSeenAt: now,
  })
  await queueExtraction(ctx, id, pageTextHash)
  return { status: "queued" }
}

function findPosting(ctx: QueryCtx, userId: string, portal: Doc<"jobPostings">["portal"], postingId: string) {
  return ctx.db
    .query("jobPostings")
    .withIndex("by_user_portal_posting", (q) => q.eq("userId", userId).eq("portal", portal).eq("postingId", postingId))
    .unique()
}

async function queueExtraction(ctx: MutationCtx, id: Id<"jobPostings">, pageTextHash: string) {
  await jobsPool.enqueueAction(
    ctx,
    internal.jobsNode.extractPosting,
    { id, pageTextHash },
    { retry: true, onComplete: internal.jobs.onExtractionComplete, context: { id, pageTextHash } },
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Reading a posting into a job

export const getForExtraction = internalQuery({
  args: { id: v.id("jobPostings"), pageTextHash: v.string() },
  handler: async (ctx, { id, pageTextHash }) => {
    const posting = await ctx.db.get(id)
    if (!posting || posting.extraction !== "pending" || posting.pageTextHash !== pageTextHash || !posting.pageText) {
      return null
    }
    return { portal: posting.portal, url: posting.url, pageText: posting.pageText }
  },
})

export const extractedFields = {
  isJobPosting: v.boolean(),
  acceptingApplications: v.boolean(),
  company: v.string(),
  role: v.string(),
  location: v.string(),
  workMode: v.union(workMode, v.literal("unknown")),
  salaryText: v.string(),
  postedText: v.string(),
  description: v.string(),
}

/** Extraction gets one more try when its description doesn't quote the page, then fails for you to look at. */
const MAX_EXTRACTION_ATTEMPTS = 2

export const finishExtraction = internalMutation({
  args: { id: v.id("jobPostings"), pageTextHash: v.string(), fields: v.object(extractedFields) },
  handler: async (ctx, { id, pageTextHash, fields }) => {
    const posting = await ctx.db.get(id)
    if (!posting || posting.extraction !== "pending" || posting.pageTextHash !== pageTextHash || !posting.pageText) {
      return
    }
    const fail = (error: string) => ctx.db.patch(id, { extraction: "failed", error })
    if (!fields.isJobPosting) return fail("This page isn't a job posting. It may be a login page or a search page.")
    // A closed posting isn't worth your attention; it stays recorded so it isn't collected again.
    if (!fields.acceptingApplications) return ctx.db.patch(id, { extraction: "done", error: undefined })
    const company = fields.company.trim()
    const role = fields.role.trim()
    const description = fields.description.trim()
    if (!company || !role) return fail("Couldn't find the company or the role on the page.")
    if (description.length < MIN_DESCRIPTION_LENGTH) return fail("Couldn't find the full job description on the page.")
    if (!isQuotedFrom(posting.pageText, description)) {
      const attempts = (posting.attempts ?? 0) + 1
      if (attempts < MAX_EXTRACTION_ATTEMPTS) {
        await ctx.db.patch(id, { attempts })
        await queueExtraction(ctx, id, pageTextHash)
        return
      }
      return fail("The description read from the page didn't match the page text.")
    }

    const details = {
      role,
      jobDescription: description,
      location: fields.location.trim() || undefined,
      workMode: fields.workMode === "unknown" ? undefined : fields.workMode,
      salaryText: fields.salaryText.trim() || undefined,
      postedText: fields.postedText.trim() || undefined,
      dedupeKey: dedupeKey(company, role),
    }
    let applicationId = posting.applicationId
    const linked = applicationId ? await ctx.db.get(applicationId) : null
    if (linked) {
      // A re-read posting updates its job only while the job is still yours to triage.
      if (linked.status === "discovered") await ctx.db.patch(linked._id, details)
    } else {
      const match = await findSameJob(ctx, posting.userId, company, role, details.location, description)
      if (match) {
        applicationId = match._id
        if (match.status === "discovered" && description.length > match.jobDescription.length) {
          await ctx.db.patch(match._id, { jobDescription: description })
        }
      } else {
        const now = Date.now()
        applicationId = await ctx.db.insert("applications", {
          userId: posting.userId,
          companyId: await findOrCreateCompany(ctx, posting.userId, company),
          source: posting.portal,
          jobUrl: posting.url,
          notes: "",
          status: "discovered",
          savedAt: now,
          discoveredAt: now,
          statusChangedAt: now,
          ...details,
        })
      }
    }
    await ctx.db.patch(id, { applicationId, extraction: "done", error: undefined })
    if (applicationId) await advance(ctx, applicationId)
  },
})

/** The same role at the same company, found recently on another portal (or added by you), if there is one. */
async function findSameJob(
  ctx: QueryCtx,
  userId: string,
  company: string,
  role: string,
  location: string | undefined,
  description: string,
) {
  const since = Date.now() - DEDUPE_WINDOW_MS
  const candidates = await ctx.db
    .query("applications")
    .withIndex("by_user_dedupe", (q) => q.eq("userId", userId).eq("dedupeKey", dedupeKey(company, role)))
    .collect()
  let best: { application: Doc<"applications">; similarity: number } | null = null
  for (const application of candidates) {
    if (application._creationTime < since || !citiesCompatible(application.location, location)) continue
    const similarity = descriptionSimilarity(application.jobDescription, description)
    if (similarity >= SAME_JOB_SIMILARITY && (!best || similarity > best.similarity)) best = { application, similarity }
  }
  return best?.application ?? null
}

export const failExtraction = internalMutation({
  args: { id: v.id("jobPostings"), pageTextHash: v.string(), error: v.string() },
  handler: async (ctx, { id, pageTextHash, error }) => {
    const posting = await ctx.db.get(id)
    if (posting?.extraction === "pending" && posting.pageTextHash === pageTextHash) {
      await ctx.db.patch(id, { extraction: "failed", error })
    }
  },
})

/** Records an extraction that still failed after the pool's retries. */
export const onExtractionComplete = internalMutation({
  args: vOnCompleteValidator(v.object({ id: v.id("jobPostings"), pageTextHash: v.string() })),
  handler: async (ctx, { context, result }) => {
    if (result.kind === "success") return
    const posting = await ctx.db.get(context.id)
    if (posting?.extraction === "pending" && posting.pageTextHash === context.pageTextHash) {
      await ctx.db.patch(context.id, {
        extraction: "failed",
        error: "OpenAI was busy or unreachable for a while. Retry later.",
      })
    }
  },
})

export const retryPosting = mutation({
  args: { id: v.id("jobPostings") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const posting = await getOwned(ctx, userId, id)
    if (posting.extraction !== "failed" || !posting.pageTextHash) return
    await ctx.db.patch(id, { extraction: "pending", error: undefined, attempts: 0 })
    await queueExtraction(ctx, id, posting.pageTextHash)
  },
})

export const removePosting = mutation({
  args: { id: v.id("jobPostings") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const posting = await getOwned(ctx, userId, id)
    if (posting.extraction !== "failed") return
    // Kept without its page text, so the Job Scout doesn't collect it again.
    await ctx.db.patch(id, { extraction: "done", error: undefined, pageText: undefined, pageTextHash: undefined })
  },
})

// ---------------------------------------------------------------------------------------------------------------
// The inbox

export const shortlist = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, id)
    if (application.status !== "discovered" && application.status !== "dismissed") return
    const now = Date.now()
    await ctx.db.patch(id, { status: "saved", savedAt: now, statusChangedAt: now, dismissReason: undefined })
  },
})

export const dismiss = mutation({
  args: { id: v.id("applications"), reason: v.optional(v.string()) },
  handler: async (ctx, { id, reason }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, id)
    if (application.status !== "discovered") return
    await ctx.db.patch(id, {
      status: "dismissed",
      dismissReason: reason?.trim().slice(0, 200) || undefined,
      statusChangedAt: Date.now(),
    })
  },
})

export const restore = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, id)
    if (application.status !== "dismissed") return
    await ctx.db.patch(id, { status: "discovered", dismissReason: undefined, statusChangedAt: Date.now() })
    await advance(ctx, id)
  },
})

/** Inbox rows, best fit first, with what the automation did for each. */
async function inboxRows(ctx: QueryCtx, userId: string, status: "discovered" | "dismissed") {
  const [applications, resumes] = await Promise.all([
    ctx.db
      .query("applications")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", status))
      .collect(),
    ctx.db
      .query("baseResumes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  ])
  const labels = new Map(resumes.map((resume) => [resume._id, resume.label]))
  const companies = new Map<Id<"companies">, string>()
  const rows = await Promise.all(
    applications.map(async (application) => {
      if (!companies.has(application.companyId)) {
        companies.set(application.companyId, (await ctx.db.get(application.companyId))?.name ?? "Unknown company")
      }
      const [postings, analysis, suggestions] = await Promise.all([
        ctx.db
          .query("jobPostings")
          .withIndex("by_application", (q) => q.eq("applicationId", application._id))
          .collect(),
        application.baseResumeId
          ? ctx.db
              .query("analyses")
              .withIndex("by_application_resume", (q) =>
                q.eq("applicationId", application._id).eq("baseResumeId", application.baseResumeId!),
              )
              .unique()
          : null,
        application.baseResumeId
          ? ctx.db
              .query("resumeSuggestions")
              .withIndex("by_application_resume", (q) =>
                q.eq("applicationId", application._id).eq("baseResumeId", application.baseResumeId!),
              )
              .unique()
          : null,
      ])
      return {
        _id: application._id,
        company: companies.get(application.companyId)!,
        role: application.role,
        location: application.location,
        workMode: application.workMode,
        salaryText: application.salaryText,
        discoveredAt: application.discoveredAt ?? application.savedAt,
        lastSeenAt: Math.max(application.discoveredAt ?? application.savedAt, ...postings.map((p) => p.lastSeenAt)),
        dismissReason: application.dismissReason,
        portals: postings.map((posting) => ({ portal: posting.portal, url: posting.url })),
        fit: application.fit
          ? { score: application.fit.score, resume: labels.get(application.fit.baseResumeId) ?? "Removed resume" }
          : null,
        chosen:
          application.baseResumeId && analysis
            ? { score: analysis.score, resume: labels.get(application.baseResumeId) ?? "Removed resume" }
            : null,
        pipeline: application.pipeline ? { state: application.pipeline.state, reason: application.pipeline.reason } : null,
        suggestions: suggestions
          ? { status: suggestions.status, count: suggestions.result?.suggestions.length ?? 0 }
          : null,
      }
    }),
  )
  return rows.sort((a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1) || b.discoveredAt - a.discoveredAt)
}

export const inbox = query({
  args: { view: v.union(v.literal("inbox"), v.literal("dismissed")) },
  handler: async (ctx, { view }) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const [rows, { fitThreshold }, failed] = await Promise.all([
      inboxRows(ctx, userId, view === "inbox" ? "discovered" : "dismissed"),
      getSettings(ctx, userId),
      view === "inbox" ? failedPostings(ctx, userId) : [],
    ])
    return { fitThreshold, jobs: rows, failed }
  },
})

async function failedPostings(ctx: QueryCtx, userId: string) {
  // Recent postings only: failures older than a couple of weeks are noise.
  const since = Date.now() - 14 * 24 * 60 * 60 * 1000
  const postings = await ctx.db
    .query("jobPostings")
    .withIndex("by_user_first_seen", (q) => q.eq("userId", userId).gte("firstSeenAt", since))
    .collect()
  return postings
    .filter((posting) => posting.extraction !== "done")
    .map((posting) => ({
      _id: posting._id,
      portal: posting.portal,
      portalLabel: PORTAL_LABELS[posting.portal],
      url: posting.url,
      status: posting.extraction,
      error: posting.error,
      firstSeenAt: posting.firstSeenAt,
    }))
}

/** How many jobs in the inbox reach your fit threshold, for the nav badge. */
export const strongMatchCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return 0
    const [{ fitThreshold }, jobs] = await Promise.all([
      getSettings(ctx, userId),
      ctx.db
        .query("applications")
        .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "discovered"))
        .collect(),
    ])
    return jobs.filter((job) => (job.fit?.score ?? -1) >= fitThreshold).length
  },
})

// ---------------------------------------------------------------------------------------------------------------
// Reading the inbox from open-bot

function trackerLink(applicationId: Id<"applications">) {
  const site = (process.env.SITE_URL ?? "").replace(/\/$/, "")
  return site ? `${site}/inbox?app=${applicationId}` : null
}

type Row = Awaited<ReturnType<typeof inboxRows>>[number]

function summarize(row: Row) {
  return {
    company: row.company,
    role: row.role,
    location: row.location ?? null,
    score: row.chosen?.score ?? row.fit?.score ?? null,
    resume: row.chosen?.resume ?? row.fit?.resume ?? null,
    suggestionsReady: row.suggestions?.status === "ready",
    postings: row.portals.map((posting) => posting.url),
    trackerUrl: trackerLink(row._id),
  }
}

export const digest = internalQuery({
  args: { userId: v.string(), sinceHours: v.number() },
  handler: async (ctx, { userId, sinceHours }) => {
    const since = Date.now() - sinceHours * 60 * 60 * 1000
    const [rows, { fitThreshold }, postings] = await Promise.all([
      inboxRows(ctx, userId, "discovered"),
      getSettings(ctx, userId),
      ctx.db
        .query("jobPostings")
        .withIndex("by_user_first_seen", (q) => q.eq("userId", userId).gte("firstSeenAt", since))
        .collect(),
    ])
    const fresh = rows.filter((row) => row.discoveredAt >= since)
    const strong = fresh.filter((row) => (row.chosen?.score ?? row.fit?.score ?? -1) >= fitThreshold)
    return {
      sinceHours,
      fitThreshold,
      postingsCollected: postings.length,
      postingsFailed: postings.filter((posting) => posting.extraction === "failed").length,
      newJobs: fresh.length,
      strongMatches: strong.length,
      suggestionsReady: strong.filter((row) => row.suggestions?.status === "ready").length,
      waitingInInbox: rows.length,
      top: strong.slice(0, 5).map(summarize),
      inboxUrl: process.env.SITE_URL ? `${process.env.SITE_URL.replace(/\/$/, "")}/inbox` : null,
    }
  },
})

export const list = internalQuery({
  args: { userId: v.string(), minScore: v.optional(v.number()), limit: v.number() },
  handler: async (ctx, { userId, minScore, limit }) => {
    const rows = await inboxRows(ctx, userId, "discovered")
    return rows
      .filter((row) => minScore === undefined || (row.chosen?.score ?? row.fit?.score ?? -1) >= minScore)
      .slice(0, limit)
      .map(summarize)
  },
})
