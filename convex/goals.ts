import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { winType } from "./schema"
import { getCurrentUserDoc } from "./users"

function defaultGoal(weekStart: string, userId: Id<"users">, now: string) {
  return {
    userId,
    weekStart,
    applicationsSentTarget: 10,
    followUpsSentTarget: 5,
    interviewsReachedTarget: 2,
    resumeImprovementsTarget: 2,
    manualResumeImprovements: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export const getByWeek = query({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    return await ctx.db
      .query("weeklyGoals")
      .withIndex("by_userId_and_weekStart", (q) =>
        q.eq("userId", user._id).eq("weekStart", args.weekStart)
      )
      .unique()
  },
})

export const upsert = mutation({
  args: {
    weekStart: v.string(),
    applicationsSentTarget: v.optional(v.number()),
    followUpsSentTarget: v.optional(v.number()),
    interviewsReachedTarget: v.optional(v.number()),
    resumeImprovementsTarget: v.optional(v.number()),
    manualResumeImprovements: v.optional(v.number()),
    lessonsLearned: v.optional(v.string()),
    nextWeekFocus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const existing = await ctx.db
      .query("weeklyGoals")
      .withIndex("by_userId_and_weekStart", (q) =>
        q.eq("userId", user._id).eq("weekStart", args.weekStart)
      )
      .unique()
    const now = new Date().toISOString()
    const patch = Object.fromEntries(
      Object.entries({
        applicationsSentTarget: args.applicationsSentTarget,
        followUpsSentTarget: args.followUpsSentTarget,
        interviewsReachedTarget: args.interviewsReachedTarget,
        resumeImprovementsTarget: args.resumeImprovementsTarget,
        manualResumeImprovements: args.manualResumeImprovements,
        lessonsLearned: args.lessonsLearned,
        nextWeekFocus: args.nextWeekFocus,
        updatedAt: now,
      }).filter((entry) => entry[1] !== undefined)
    )

    if (!existing) {
      return await ctx.db.insert("weeklyGoals", {
        ...defaultGoal(args.weekStart, user._id, now),
        ...patch,
      })
    }

    await ctx.db.patch(existing._id, patch)
    return existing._id
  },
})

export const addWin = mutation({
  args: {
    applicationId: v.optional(v.id("applications")),
    type: winType,
    title: v.string(),
    notes: v.optional(v.string()),
    occurredAt: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    if (args.applicationId) {
      const application = await ctx.db.get(args.applicationId)
      if (!application || application.userId !== user._id) {
        throw new Error("Application not found")
      }
    }

    return await ctx.db.insert("winLogEntries", {
      userId: user._id,
      applicationId: args.applicationId,
      type: args.type,
      title: args.title,
      notes: args.notes,
      occurredAt: args.occurredAt,
      source: "manual",
      createdAt: new Date().toISOString(),
    })
  },
})
