import { ConvexError, v } from "convex/values"

import { inputFingerprint, validateSuggestions } from "../lib/resume-writing"
import { JOB_TIMEOUT_MS } from "../lib/resume-writing-limits"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, mutation, query, type QueryCtx } from "./_generated/server"
import { getOwned, getUserId, requireUserId } from "./helpers"
import { suggestionFields } from "./schema"

async function loadInputs(
  ctx: QueryCtx,
  userId: string,
  applicationId: Id<"applications">,
  baseResumeId: Id<"baseResumes">,
) {
  const [application, resume, accomplishments] = await Promise.all([
    getOwned(ctx, userId, applicationId),
    getOwned(ctx, userId, baseResumeId),
    ctx.db
      .query("accomplishments")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "confirmed"))
      .collect(),
  ])
  const company = await ctx.db.get(application.companyId)
  const reviewIds = [...new Set(accomplishments.map((item) => item.reviewId))]
  const reviews = new Map(await Promise.all(reviewIds.map(async (id) => [id, await ctx.db.get(id)] as const)))
  const evidence = accomplishments
    .flatMap((item) => {
      const review = reviews.get(item.reviewId)
      if (!review || review.userId !== userId) return []
      return [
        {
          accomplishmentId: item._id,
          reviewId: review._id,
          reviewTitle: review.title,
          company: review.company,
          role: review.role,
          period: review.period,
          title: item.title,
          description: item.description,
          skills: item.skills,
          sourceQuote: item.sourceQuote,
        },
      ]
    })
    .sort((a, b) => a.accomplishmentId.localeCompare(b.accomplishmentId))
  const inputs = {
    role: application.role,
    company: company?.name ?? "",
    jobDescription: application.jobDescription,
    baseResumeId,
    storageId: resume.storageId,
    resumeText: resume.text ?? "",
    resumeStatus: resume.textStatus,
    evidence,
  }
  return { inputs, fingerprint: await inputFingerprint(inputs) }
}

function assertReady(inputs: Awaited<ReturnType<typeof loadInputs>>["inputs"]) {
  if (inputs.resumeStatus !== "ready" || !inputs.resumeText)
    throw new ConvexError("Wait for the base resume PDF to finish reading, or retry its extraction.")
  if (inputs.jobDescription.trim().length < 80)
    throw new ConvexError("Paste the full job description in Details before generating suggestions.")
  if (!inputs.evidence.length)
    throw new ConvexError("Confirm an accomplishment in Experience before generating suggestions.")
  if (JSON.stringify(inputs).length > 300_000)
    throw new ConvexError(
      "The resume and experience library are too large for one request. Shorten long accomplishment descriptions and try again.",
    )
}

export const forResume = query({
  args: { applicationId: v.id("applications"), baseResumeId: v.id("baseResumes") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const [application, resume] = await Promise.all([ctx.db.get(args.applicationId), ctx.db.get(args.baseResumeId)])
    // A library change can delete the selected resume while this query is subscribed.
    if (!application || !resume || application.userId !== userId || resume.userId !== userId) return null
    const { inputs, fingerprint } = await loadInputs(ctx, userId, args.applicationId, args.baseResumeId)
    const job = await ctx.db
      .query("resumeSuggestions")
      .withIndex("by_application_resume", (q) =>
        q.eq("applicationId", args.applicationId).eq("baseResumeId", args.baseResumeId),
      )
      .unique()
    return {
      job,
      stale: Boolean(job?.result && job.result.fingerprint !== fingerprint),
      confirmedCount: inputs.evidence.length,
    }
  },
})

export const generate = mutation({
  args: { applicationId: v.id("applications"), baseResumeId: v.id("baseResumes") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const { inputs, fingerprint } = await loadInputs(ctx, userId, args.applicationId, args.baseResumeId)
    assertReady(inputs)
    const existing = await ctx.db
      .query("resumeSuggestions")
      .withIndex("by_application_resume", (q) =>
        q.eq("applicationId", args.applicationId).eq("baseResumeId", args.baseResumeId),
      )
      .unique()
    if (existing?.status === "generating" && Date.now() - existing.startedAt < JOB_TIMEOUT_MS) {
      throw new ConvexError("Suggestions are already being generated for this resume.")
    }
    const version = (existing?.version ?? 0) + 1
    const fields = {
      userId,
      ...args,
      status: "generating" as const,
      version,
      startedAt: Date.now(),
      requestFingerprint: fingerprint,
      error: undefined,
    }
    let id: Id<"resumeSuggestions">
    if (existing) {
      id = existing._id
      await ctx.db.patch(id, fields)
    } else {
      id = await ctx.db.insert("resumeSuggestions", fields)
    }
    await ctx.db.patch(args.applicationId, { baseResumeId: args.baseResumeId })
    await ctx.scheduler.runAfter(0, internal.suggestionsNode.generate, { id, version })
  },
})

export const getForGeneration = internalQuery({
  args: { id: v.id("resumeSuggestions"), version: v.number() },
  handler: async (ctx, { id, version }) => {
    const job = await ctx.db.get(id)
    if (!job || job.version !== version || job.status !== "generating") return null
    const loaded = await loadInputs(ctx, job.userId, job.applicationId, job.baseResumeId)
    if (loaded.fingerprint !== job.requestFingerprint)
      throw new ConvexError("Inputs changed while generation was starting. Generate suggestions again.")
    assertReady(loaded.inputs)
    return loaded.inputs
  },
})

export const finish = internalMutation({
  args: {
    id: v.id("resumeSuggestions"),
    version: v.number(),
    summary: v.string(),
    suggestions: v.array(v.object(suggestionFields)),
    model: v.string(),
  },
  handler: async (ctx, { id, version, summary, suggestions, model }) => {
    const job = await ctx.db.get(id)
    if (!job || job.version !== version || job.status !== "generating") return
    const { inputs, fingerprint } = await loadInputs(ctx, job.userId, job.applicationId, job.baseResumeId)
    if (fingerprint !== job.requestFingerprint) {
      await ctx.db.patch(id, {
        status: "failed",
        error: "The job, base resume, or confirmed experience changed during generation. Generate suggestions again.",
      })
      return
    }
    const validated = validateSuggestions(
      inputs.resumeText,
      inputs.evidence.map((item) => item.accomplishmentId),
      { summary, suggestions },
    )
    await ctx.db.patch(id, {
      status: "ready",
      error: undefined,
      result: {
        fingerprint,
        summary: validated.summary,
        model,
        generatedAt: Date.now(),
        suggestions: validated.suggestions.map((item) => ({
          ...item,
          accomplishmentIds: [...new Set(item.accomplishmentIds)],
          evidence: inputs.evidence.filter((evidence) => item.accomplishmentIds.includes(evidence.accomplishmentId)),
        })),
      },
    })
  },
})

export const fail = internalMutation({
  args: { id: v.id("resumeSuggestions"), version: v.number(), error: v.string() },
  handler: async (ctx, { id, version, error }) => {
    const job = await ctx.db.get(id)
    if (job?.version === version && job.status === "generating") await ctx.db.patch(id, { status: "failed", error })
  },
})
