import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, type MutationCtx } from "./_generated/server"
import { removeUndefined } from "./model"
import { storyCompetency } from "./schema"
import { getCurrentUserDoc } from "./users"

async function ensureStory(ctx: MutationCtx, id: Id<"storyBankEntries">, userId: Id<"users">) {
  const story = await ctx.db.get(id)
  if (!story || story.userId !== userId) {
    throw new Error("Story not found")
  }
  return story
}

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

async function ensureInterview(
  ctx: MutationCtx,
  id: Id<"applicationInterviews"> | undefined,
  userId: Id<"users">
) {
  if (!id) return
  const interview = await ctx.db.get(id)
  if (!interview || interview.userId !== userId) {
    throw new Error("Interview not found")
  }
}

const optionalStoryFields = {
  project: v.optional(v.string()),
  impactMetrics: v.optional(v.string()),
  technologies: v.optional(v.array(v.string())),
  competencies: v.optional(v.array(storyCompetency)),
  senioritySignal: v.optional(v.string()),
  notes: v.optional(v.string()),
}

export const createStory = mutation({
  args: {
    title: v.string(),
    situation: v.string(),
    task: v.string(),
    action: v.string(),
    result: v.string(),
    ...optionalStoryFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const now = Date.now()

    return await ctx.db.insert("storyBankEntries", {
      userId: user._id,
      title: args.title,
      project: args.project,
      situation: args.situation,
      task: args.task,
      action: args.action,
      result: args.result,
      impactMetrics: args.impactMetrics,
      technologies: args.technologies ?? [],
      competencies: args.competencies ?? [],
      senioritySignal: args.senioritySignal,
      notes: args.notes,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateStory = mutation({
  args: {
    id: v.id("storyBankEntries"),
    title: v.optional(v.string()),
    situation: v.optional(v.string()),
    task: v.optional(v.string()),
    action: v.optional(v.string()),
    result: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    ...optionalStoryFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    await ensureStory(ctx, args.id, user._id)
    const now = Date.now()
    const patch = removeUndefined({
      title: args.title,
      project: args.project,
      situation: args.situation,
      task: args.task,
      action: args.action,
      result: args.result,
      impactMetrics: args.impactMetrics,
      technologies: args.technologies,
      competencies: args.competencies,
      senioritySignal: args.senioritySignal,
      notes: args.notes,
      archived: args.archived,
      archivedAt: args.archived === undefined ? undefined : args.archived ? now : undefined,
      updatedAt: now,
    }) as Partial<Doc<"storyBankEntries">>

    await ctx.db.patch(args.id, patch)
  },
})

export const recordUsage = mutation({
  args: {
    storyId: v.id("storyBankEntries"),
    applicationId: v.optional(v.id("applications")),
    interviewId: v.optional(v.id("applicationInterviews")),
    usedAtDate: v.optional(v.string()),
    confidence: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    await ensureStory(ctx, args.storyId, user._id)
    await ensureApplication(ctx, args.applicationId, user._id)
    await ensureInterview(ctx, args.interviewId, user._id)
    const now = Date.now()

    return await ctx.db.insert("storyUsages", {
      userId: user._id,
      storyId: args.storyId,
      applicationId: args.applicationId,
      interviewId: args.interviewId,
      usedAtDate: args.usedAtDate,
      confidence: args.confidence,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    })
  },
})
