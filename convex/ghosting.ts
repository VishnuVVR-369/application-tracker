import { v } from "convex/values"

import { GHOST_SNOOZE_DAYS } from "../lib/ghosting-model"
import { mutation } from "./_generated/server"
import { addActivity } from "./applications"
import { dateKeyFromTimestamp } from "./model"
import { getCurrentUserDoc } from "./users"

/** Record that the user followed up, resetting the ghost silence clock. */
export const logFollowUp = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.id)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

    const now = Date.now()
    await addActivity(ctx, {
      userId: user._id,
      applicationId: args.id,
      type: "note",
      title: "Followed up",
      source: "manual",
      eventAt: now,
      relatedEntityType: "application",
      relatedEntityId: String(args.id),
    })
    await ctx.db.patch(args.id, {
      ghostNudgeSnoozedUntilDate: undefined,
      updatedAt: now,
      lastActivityAt: now,
    })
  },
})

/** Hide ghost reminders for a week without changing the application stage. */
export const snoozeGhostNudge = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.id)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

    const now = Date.now()
    await ctx.db.patch(args.id, {
      ghostNudgeSnoozedUntilDate: dateKeyFromTimestamp(
        now + GHOST_SNOOZE_DAYS * 24 * 60 * 60 * 1000
      ),
      updatedAt: now,
    })
  },
})
