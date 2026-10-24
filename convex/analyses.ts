import { ConvexError, v } from "convex/values"

import { internalMutation, internalQuery, query } from "./_generated/server"
import { getOwned, getUserId, requireUserId } from "./helpers"

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

export const getInputs = internalQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, applicationId)
    if (!application.baseResumeId) throw new ConvexError("Pick a base resume first.")
    const resume = await getOwned(ctx, userId, application.baseResumeId)
    if (resume.textStatus === "extracting") throw new ConvexError("Still reading that resume PDF. Try again in a moment.")
    if (!resume.text) throw new ConvexError("Couldn't read text from that resume PDF. Re-upload it from the Resumes page.")
    if (application.jobDescription.trim().length < 80) {
      throw new ConvexError("Paste the full job description before analyzing.")
    }
    const company = await ctx.db.get(application.companyId)
    return {
      userId,
      baseResumeId: resume._id,
      resumeText: resume.text,
      jobDescription: application.jobDescription,
      role: application.role,
      company: company?.name ?? "",
    }
  },
})

export const save = internalMutation({
  args: {
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
  },
})
