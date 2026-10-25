import { vOnCompleteValidator } from "@convex-dev/workpool"
import { ConvexError, v } from "convex/values"

import { DAY_MS } from "../lib/domain"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, mutation, type MutationCtx } from "./_generated/server"
import { analysisInputs } from "./analyses"
import { getOwned, getSettings, requireUserId, saveSettings } from "./helpers"
import { jobsPool } from "./pool"
import { loadInputs, startSuggestions } from "./suggestions"

type Pipeline = NonNullable<Doc<"applications">["pipeline"]>

/** Queued suggestions older than this are treated as lost and queued again. */
const QUEUED_SUGGESTIONS_TIMEOUT_MS = 30 * 60 * 1000
/** A refresh after resumes or experience change re-checks inbox jobs collected this recently. */
const REFRESH_WINDOW_MS = 30 * DAY_MS
/** Edits in a row (confirming several accomplishments, say) collapse into one refresh. */
const REFRESH_DELAY_MS = 30_000

/**
 * Moves a job in the inbox one step further: score it against every base resume, pick the best one, and get
 * suggested edits when the score reaches your fit threshold. Safe to call any number of times: finished work
 * is recognized by its inputs' fingerprints, and jobs that left the inbox are never touched.
 */
export async function advance(ctx: MutationCtx, applicationId: Id<"applications">, options: { retry?: boolean } = {}) {
  const application = await ctx.db.get(applicationId)
  if (!application || application.status !== "discovered") return
  const previous = application.pipeline
  let pending = options.retry ? [] : (previous?.pending ?? [])
  let failures = options.retry ? [] : (previous?.failures ?? [])
  const save = (state: Pipeline["state"], reason?: string) =>
    ctx.db.patch(applicationId, { pipeline: { state, reason, pending, failures, updatedAt: Date.now() } })

  const resumes = (
    await ctx.db
      .query("baseResumes")
      .withIndex("by_user", (q) => q.eq("userId", application.userId))
      .collect()
  ).filter((resume) => resume.textStatus === "ready" && resume.text)
  if (!resumes.length) return save("waiting", "Upload a base resume to score this job.")
  const resumeIds = new Set(resumes.map((resume) => resume._id))
  pending = pending.filter((item) => resumeIds.has(item.baseResumeId))
  failures = failures.filter((item) => resumeIds.has(item.baseResumeId))

  const analyses = await ctx.db
    .query("analyses")
    .withIndex("by_application_resume", (q) => q.eq("applicationId", applicationId))
    .collect()
  const scored: { resume: Doc<"baseResumes">; score: number }[] = []
  let analyzing = false
  for (const resume of resumes) {
    const inputs = await analysisInputs(ctx, application, resume)
    if (!inputs) return save("failed", "The job description is too short to score.")
    const { fingerprint } = inputs
    const analysis = analyses.find((item) => item.baseResumeId === resume._id)
    if (analysis?.fingerprint === fingerprint) {
      scored.push({ resume, score: analysis.score })
      continue
    }
    const same = (item: { baseResumeId: Id<"baseResumes">; fingerprint: string }) =>
      item.baseResumeId === resume._id && item.fingerprint === fingerprint
    if (pending.some(same)) {
      analyzing = true
      continue
    }
    if (failures.some(same)) continue
    // Older attempts for this resume compared inputs that no longer exist.
    pending = pending.filter((item) => item.baseResumeId !== resume._id)
    failures = failures.filter((item) => item.baseResumeId !== resume._id)
    const args = { applicationId, baseResumeId: resume._id, fingerprint }
    await jobsPool.enqueueAction(ctx, internal.analysesNode.analyzeForPipeline, args, {
      retry: true,
      onComplete: internal.pipeline.onAnalysisComplete,
      context: args,
    })
    pending.push({ baseResumeId: resume._id, fingerprint })
    analyzing = true
  }
  if (analyzing) return save("analyzing")
  if (!scored.length) return save("failed", failures[0]?.error ?? "Couldn't score this job.")

  // Ties go to the most recently uploaded resume.
  const best = scored.reduce((a, b) =>
    b.score > a.score || (b.score === a.score && b.resume.uploadedAt > a.resume.uploadedAt) ? b : a,
  )
  const pinned = application.baseResumePinned
    ? scored.find((item) => item.resume._id === application.baseResumeId)
    : undefined
  const chosen = pinned ?? best
  await ctx.db.patch(applicationId, {
    fit: { score: best.score, baseResumeId: best.resume._id },
    baseResumeId: chosen.resume._id,
  })

  const { fitThreshold } = await getSettings(ctx, application.userId)
  if (chosen.score < fitThreshold) return save("done")

  const { inputs, fingerprint } = await loadInputs(ctx, application.userId, applicationId, chosen.resume._id)
  if (!inputs.evidence.length) return save("waiting", "Confirm an accomplishment in Experience to get suggested edits.")
  const job = await ctx.db
    .query("resumeSuggestions")
    .withIndex("by_application_resume", (q) =>
      q.eq("applicationId", applicationId).eq("baseResumeId", chosen.resume._id),
    )
    .unique()
  if (job?.result?.fingerprint === fingerprint && job.status !== "generating") return save("done")
  if (
    job?.status === "generating" &&
    job.requestFingerprint === fingerprint &&
    Date.now() - job.startedAt < QUEUED_SUGGESTIONS_TIMEOUT_MS
  ) {
    return save("suggesting")
  }
  if (job?.status === "failed" && job.requestFingerprint === fingerprint && !options.retry) {
    return save("failed", job.error ?? "Couldn't generate suggestions.")
  }
  try {
    await startSuggestions(ctx, application.userId, applicationId, chosen.resume._id, "pool")
  } catch (error) {
    if (error instanceof ConvexError && typeof error.data === "string") return save("failed", error.data)
    throw error
  }
  return save("suggesting")
}

export const advanceJob = internalMutation({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    await advance(ctx, applicationId)
  },
})

/** A queued analysis finished, was dropped because its inputs changed, or failed for good. */
export const analysisSettled = internalMutation({
  args: {
    applicationId: v.id("applications"),
    baseResumeId: v.id("baseResumes"),
    fingerprint: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await settleAnalysis(ctx, args)
  },
})

/** Records an analysis that still failed after the pool's retries. */
export const onAnalysisComplete = internalMutation({
  args: vOnCompleteValidator(
    v.object({ applicationId: v.id("applications"), baseResumeId: v.id("baseResumes"), fingerprint: v.string() }),
  ),
  handler: async (ctx, { context, result }) => {
    if (result.kind === "success") return
    await settleAnalysis(ctx, { ...context, error: "OpenAI was busy or unreachable for a while. Retry later." })
  },
})

async function settleAnalysis(
  ctx: MutationCtx,
  {
    applicationId,
    baseResumeId,
    fingerprint,
    error,
  }: { applicationId: Id<"applications">; baseResumeId: Id<"baseResumes">; fingerprint: string; error?: string },
) {
  const application = await ctx.db.get(applicationId)
  if (!application?.pipeline || application.status !== "discovered") return
  const same = (item: { baseResumeId: Id<"baseResumes">; fingerprint: string }) =>
    item.baseResumeId === baseResumeId && item.fingerprint === fingerprint
  const { pipeline } = application
  await ctx.db.patch(applicationId, {
    pipeline: {
      ...pipeline,
      pending: pipeline.pending.filter((item) => !same(item)),
      failures: error
        ? [...pipeline.failures.filter((item) => !same(item)), { baseResumeId, fingerprint, error }]
        : pipeline.failures,
    },
  })
  await advance(ctx, applicationId)
}

/** Re-checks every recent inbox job, each in its own transaction. */
export const refreshInbox = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await saveSettings(ctx, userId, { inboxRefreshId: undefined })
    const since = Date.now() - REFRESH_WINDOW_MS
    const jobs = await ctx.db
      .query("applications")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "discovered"))
      .collect()
    for (const job of jobs) {
      if ((job.discoveredAt ?? job.savedAt) < since) continue
      await ctx.scheduler.runAfter(0, internal.pipeline.advanceJob, { applicationId: job._id })
    }
  },
})

/** Called when a base resume, your confirmed experience or the fit threshold changes. */
export async function scheduleInboxRefresh(ctx: MutationCtx, userId: string) {
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique()
  if (settings?.inboxRefreshId) {
    const scheduled = await ctx.db.system.get(settings.inboxRefreshId)
    if (scheduled?.state.kind === "pending") await ctx.scheduler.cancel(settings.inboxRefreshId)
  }
  const inboxRefreshId = await ctx.scheduler.runAfter(REFRESH_DELAY_MS, internal.pipeline.refreshInbox, { userId })
  await saveSettings(ctx, userId, { inboxRefreshId })
}

/** The Retry button on a job whose scoring or suggestions failed. */
export const retry = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, id)
    if (application.status !== "discovered") throw new ConvexError("Only jobs in the inbox are retried here.")
    await advance(ctx, id, { retry: true })
  },
})
