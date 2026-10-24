import { ConvexError, v } from "convex/values"

import { MAX_WEEKLY_GOAL } from "../lib/domain"
import { mutation, query, type MutationCtx } from "./_generated/server"
import { getSettings, getUserId, requireUserId } from "./helpers"

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    return await getSettings(ctx, userId)
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

async function saveSettings(
  ctx: MutationCtx,
  userId: string,
  patch: { followUpDays?: number; weeklyGoal?: number },
) {
  const existing = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique()
  if (existing) await ctx.db.patch(existing._id, patch)
  else await ctx.db.insert("userSettings", { userId, ...(await getSettings(ctx, userId)), ...patch })
}
