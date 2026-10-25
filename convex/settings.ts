import { ConvexError, v } from "convex/values"

import { MAX_WEEKLY_GOAL } from "../lib/domain"
import { mutation, query } from "./_generated/server"
import { getSettings, getUserId, requireUserId, saveSettings } from "./helpers"
import { scheduleInboxRefresh } from "./pipeline"

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const { followUpDays, weeklyGoal, fitThreshold } = await getSettings(ctx, userId)
    return { followUpDays, weeklyGoal, fitThreshold }
  },
})

export const setFollowUpDays = mutation({
  args: { days: v.number() },
  handler: async (ctx, { days }) => {
    const userId = await requireUserId(ctx)
    if (!Number.isInteger(days) || days < 1 || days > 30) {
      throw new ConvexError("Pick a whole number of days between 1 and 30.")
    }
    await saveSettings(ctx, userId, { followUpDays: days })
  },
})

export const setWeeklyGoal = mutation({
  args: { goal: v.number() },
  handler: async (ctx, { goal }) => {
    const userId = await requireUserId(ctx)
    if (!Number.isInteger(goal) || goal < 1 || goal > MAX_WEEKLY_GOAL) {
      throw new ConvexError(`Pick a weekly goal between 1 and ${MAX_WEEKLY_GOAL}.`)
    }
    await saveSettings(ctx, userId, { weeklyGoal: goal })
  },
})

export const setFitThreshold = mutation({
  args: { threshold: v.number() },
  handler: async (ctx, { threshold }) => {
    const userId = await requireUserId(ctx)
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
      throw new ConvexError("Pick a whole number between 0 and 100.")
    }
    await saveSettings(ctx, userId, { fitThreshold: threshold })
    // Jobs in the inbox that now reach the threshold get their suggestions.
    await scheduleInboxRefresh(ctx, userId)
  },
})
