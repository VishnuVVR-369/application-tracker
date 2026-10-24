import { ConvexError, v } from "convex/values"

import { inputFingerprint } from "../lib/resume-writing"
import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { internalMutation, internalQuery, query, type QueryCtx } from "./_generated/server"
import { getOwned, getUserId, requireUserId } from "./helpers"
import { analysisFields } from "./schema"

export const forApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const application = await ctx.db.get(applicationId)
    if (!application || application.userId !== userId) return null
    return await ctx.db
      .query("analyses")
      .withIndex("by_application_resume", (q) => q.eq("applicationId", applicationId))
      .collect()
  },
})

/** What the model compares, and its fingerprint. Null when the pair can't be scored yet. */
export async function analysisInputs(ctx: QueryCtx, application: Doc<"applications">, resume: Doc<"baseResumes">) {
  if (resume.textStatus !== "ready" || !resume.text) return null
  if (application.jobDescription.trim().length < 80) return null
  const company = await ctx.db.get(application.companyId)
  const prompt = {
    role: application.role,
    company: company?.name ?? "",
    jobDescription: application.jobDescription,
    resumeText: resume.text,
  }
  return { prompt, fingerprint: await inputFingerprint(prompt) }
}

/** For the Analyze button: the signed-in user's selected resume. */
export const getInputs = internalQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, applicationId)
    if (!application.baseResumeId) throw new ConvexError("Pick a base resume first.")
    const resume = await getOwned(ctx, userId, application.baseResumeId)
    if (resume.textStatus === "extracting") throw new ConvexError("Still reading that resume PDF. Try again in a moment.")
    if (!resume.text) throw new ConvexError("Couldn't read text from that resume PDF. Re-upload it from the Resumes page.")
    const inputs = await analysisInputs(ctx, application, resume)
    if (!inputs) throw new ConvexError("Paste the full job description before analyzing.")
    return { userId, baseResumeId: resume._id, ...inputs }
  },
})

/** For the inbox pipeline: null once the job left the inbox or its inputs changed, so stale work is dropped. */
export const getForPipeline = internalQuery({
  args: { applicationId: v.id("applications"), baseResumeId: v.id("baseResumes"), fingerprint: v.string() },
  handler: async (ctx, { applicationId, baseResumeId, fingerprint }) => {
    const [application, resume] = await Promise.all([ctx.db.get(applicationId), ctx.db.get(baseResumeId)])
    if (!application || !resume || application.status !== "discovered" || resume.userId !== application.userId) {
      return null
    }
    const inputs = await analysisInputs(ctx, application, resume)
    return inputs?.fingerprint === fingerprint ? { userId: application.userId, prompt: inputs.prompt } : null
  },
})

export const save = internalMutation({
  args: {
    userId: v.string(),
    applicationId: v.id("applications"),
    baseResumeId: v.id("baseResumes"),
    fingerprint: v.string(),
    ...analysisFields,
    model: v.string(),
  },
  handler: async (ctx, args) => {
    // The application or resume may have been deleted while the model was thinking.
    const [application, resume] = await Promise.all([ctx.db.get(args.applicationId), ctx.db.get(args.baseResumeId)])
    if (!application || !resume) return
    const existing = await ctx.db
      .query("analyses")
      .withIndex("by_application_resume", (q) =>
        q.eq("applicationId", args.applicationId).eq("baseResumeId", args.baseResumeId),
      )
      .unique()
    const doc = { ...args, createdAt: Date.now() }
    if (existing) await ctx.db.replace(existing._id, doc)
    else await ctx.db.insert("analyses", doc)
    if (application.status === "discovered") {
      await ctx.scheduler.runAfter(0, internal.pipeline.analysisSettled, {
        applicationId: args.applicationId,
        baseResumeId: args.baseResumeId,
        fingerprint: args.fingerprint,
      })
    }
  },
})
