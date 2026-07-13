import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, type MutationCtx } from "./_generated/server"
import { removeUndefined } from "./model"
import { prepFocusArea, prepPlanStatus } from "./schema"
import { getCurrentUserDoc } from "./users"

async function ensureApplication(
  ctx: MutationCtx,
  id: Id<"applications"> | undefined,
  userId: Id<"users">
) {
  if (!id) return
  const application = await ctx.db.get(id)
  if (!application || application.userId !== userId) {
    throw new Error("Application not found")
  }
}

async function ensureTargetCompany(
  ctx: MutationCtx,
  id: Id<"targetCompanies"> | undefined,
  userId: Id<"users">
) {
  if (!id) return
  const target = await ctx.db.get(id)
  if (!target || target.userId !== userId) {
    throw new Error("Target company not found")
  }
}

const optionalPrepFields = {
  applicationId: v.optional(v.id("applications")),
  targetCompanyId: v.optional(v.id("targetCompanies")),
  focusAreas: v.optional(v.array(prepFocusArea)),
  codingDrillsTarget: v.optional(v.number()),
  codingDrillsDone: v.optional(v.number()),
  systemDesignDrillsTarget: v.optional(v.number()),
  systemDesignDrillsDone: v.optional(v.number()),
  behavioralStoriesTarget: v.optional(v.number()),
  behavioralStoriesReady: v.optional(v.number()),
  mockInterviewsTarget: v.optional(v.number()),
  mockInterviewsDone: v.optional(v.number()),
  companyResearchDone: v.optional(v.boolean()),
  resumeDeepDiveDone: v.optional(v.boolean()),
  weaknessTags: v.optional(v.array(v.string())),
  nextAction: v.optional(v.string()),
  notes: v.optional(v.string()),
}

export const createPlan = mutation({
  args: {
    title: v.string(),
    status: prepPlanStatus,
    ...optionalPrepFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    await ensureApplication(ctx, args.applicationId, user._id)
    await ensureTargetCompany(ctx, args.targetCompanyId, user._id)
    const now = Date.now()

    return await ctx.db.insert("interviewPrepPlans", {
      userId: user._id,
      applicationId: args.applicationId,
      targetCompanyId: args.targetCompanyId,
      title: args.title,
      status: args.status,
      focusAreas: args.focusAreas ?? [],
      codingDrillsTarget: args.codingDrillsTarget ?? 20,
      codingDrillsDone: args.codingDrillsDone ?? 0,
      systemDesignDrillsTarget: args.systemDesignDrillsTarget ?? 4,
      systemDesignDrillsDone: args.systemDesignDrillsDone ?? 0,
      behavioralStoriesTarget: args.behavioralStoriesTarget ?? 6,
      behavioralStoriesReady: args.behavioralStoriesReady ?? 0,
      mockInterviewsTarget: args.mockInterviewsTarget ?? 2,
      mockInterviewsDone: args.mockInterviewsDone ?? 0,
      companyResearchDone: args.companyResearchDone ?? false,
      resumeDeepDiveDone: args.resumeDeepDiveDone ?? false,
      weaknessTags: args.weaknessTags ?? [],
      nextAction: args.nextAction,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updatePlan = mutation({
  args: {
    id: v.id("interviewPrepPlans"),
    title: v.optional(v.string()),
    status: v.optional(prepPlanStatus),
    applicationId: v.optional(v.union(v.id("applications"), v.null())),
    targetCompanyId: v.optional(v.union(v.id("targetCompanies"), v.null())),
    focusAreas: v.optional(v.array(prepFocusArea)),
    codingDrillsTarget: v.optional(v.number()),
    codingDrillsDone: v.optional(v.number()),
    systemDesignDrillsTarget: v.optional(v.number()),
    systemDesignDrillsDone: v.optional(v.number()),
    behavioralStoriesTarget: v.optional(v.number()),
    behavioralStoriesReady: v.optional(v.number()),
    mockInterviewsTarget: v.optional(v.number()),
    mockInterviewsDone: v.optional(v.number()),
    companyResearchDone: v.optional(v.boolean()),
    resumeDeepDiveDone: v.optional(v.boolean()),
    weaknessTags: v.optional(v.array(v.string())),
    nextAction: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const plan = await ctx.db.get(args.id)
    if (!plan || plan.userId !== user._id) {
      throw new Error("Interview prep plan not found")
    }
    await ensureApplication(ctx, args.applicationId ?? undefined, user._id)
    await ensureTargetCompany(ctx, args.targetCompanyId ?? undefined, user._id)
    const now = Date.now()

    const patch: Record<string, unknown> = removeUndefined({
      title: args.title,
      status: args.status,
      focusAreas: args.focusAreas,
      codingDrillsTarget: args.codingDrillsTarget,
      codingDrillsDone: args.codingDrillsDone,
      systemDesignDrillsTarget: args.systemDesignDrillsTarget,
      systemDesignDrillsDone: args.systemDesignDrillsDone,
      behavioralStoriesTarget: args.behavioralStoriesTarget,
      behavioralStoriesReady: args.behavioralStoriesReady,
      mockInterviewsTarget: args.mockInterviewsTarget,
      mockInterviewsDone: args.mockInterviewsDone,
      companyResearchDone: args.companyResearchDone,
      resumeDeepDiveDone: args.resumeDeepDiveDone,
      weaknessTags: args.weaknessTags,
      updatedAt: now,
    })
    for (const [key, value] of Object.entries({
      applicationId: args.applicationId,
      targetCompanyId: args.targetCompanyId,
      nextAction: args.nextAction,
      notes: args.notes,
    })) {
      if (value !== undefined) patch[key] = value === null ? undefined : value
    }

    await ctx.db.patch(args.id, patch as Partial<Doc<"interviewPrepPlans">>)
  },
})
