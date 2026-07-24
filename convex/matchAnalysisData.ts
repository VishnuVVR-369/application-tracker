import { v } from "convex/values"

import { internalMutation, internalQuery } from "./_generated/server"
import { addActivity } from "./applications"
import { getCurrentUserDoc } from "./users"

/** Everything the match-analysis action needs, with ownership enforced. */
export const getContext = internalQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

    const jobDescription = application.jobDescriptionSnapshot?.trim()
    if (!jobDescription) {
      throw new Error("Save a job description snapshot on this application first.")
    }

    const resume = application.currentResumeId
      ? await ctx.db.get(application.currentResumeId)
      : null
    if (!resume || resume.userId !== user._id) {
      throw new Error("Link a resume to this application first.")
    }

    return {
      companyName: application.companyName,
      roleTitle: application.roleTitle,
      jobDescription,
      resume: {
        id: resume._id,
        storageId: resume.storageId,
        label: resume.label,
      },
    }
  },
})

export const saveResult = internalMutation({
  args: {
    applicationId: v.id("applications"),
    resumeId: v.id("resumes"),
    resumeLabel: v.string(),
    model: v.string(),
    summary: v.string(),
    matchedKeywords: v.array(v.string()),
    missingKeywords: v.array(v.string()),
    requirements: v.array(
      v.object({
        requirement: v.string(),
        evidence: v.string(),
        status: v.union(
          v.literal("supported"),
          v.literal("partial"),
          v.literal("missing")
        ),
      })
    ),
    suggestions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

    const now = Date.now()
    const matchAnalysis = {
      summary: args.summary,
      matchedKeywords: args.matchedKeywords,
      missingKeywords: args.missingKeywords,
      requirements: args.requirements,
      suggestions: args.suggestions,
      model: args.model,
      analyzedAt: now,
      resumeId: args.resumeId,
      resumeLabel: args.resumeLabel,
    }

    await ctx.db.patch(args.applicationId, {
      matchAnalysis,
      updatedAt: now,
      lastActivityAt: now,
    })
    await addActivity(ctx, {
      userId: user._id,
      applicationId: args.applicationId,
      type: "note",
      title: "Resume evidence analysis updated",
      eventAt: now,
      relatedEntityType: "resume",
      relatedEntityId: String(args.resumeId),
    })

    return matchAnalysis
  },
})
