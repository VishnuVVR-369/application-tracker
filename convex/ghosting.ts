import { v } from "convex/values"

import {
  GHOST_AUTO_CLOSE_AFTER_DAYS,
  GHOST_SNOOZE_DAYS,
  shouldAutoCloseAsGhosted,
} from "../lib/ghosting-model"
import { internalMutation, mutation } from "./_generated/server"
import { addActivity, transitionStage } from "./applications"
import { dateKeyFromTimestamp } from "./model"
import { getCurrentUserDoc } from "./users"

/**
 * Daily sweep: close "applied" applications with 45+ days of silence as
 * ghosted. Runs for every user; snoozed applications are skipped.
 */
export const autoCloseGhosted = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const nowDate = new Date(now)
    const users = await ctx.db.query("users").collect()
    let closedCount = 0

    for (const user of users) {
      const appliedApps = await ctx.db
        .query("applications")
        .withIndex("by_userId_and_stage", (q) =>
          q.eq("userId", user._id).eq("stage", "applied")
        )
        .collect()

      for (const application of appliedApps) {
        if (!shouldAutoCloseAsGhosted(application, nowDate)) {
          continue
        }

        await transitionStage(ctx, user._id, application, "closed", now, "system")
        await ctx.db.patch(application._id, {
          stage: "closed",
          currentStageEnteredAt: now,
          closedAt: now,
          closedDate: dateKeyFromTimestamp(now),
          closedOutcome: "ghosted",
          updatedAt: now,
          lastActivityAt: now,
        })
        await addActivity(ctx, {
          userId: user._id,
          applicationId: application._id,
          type: "note",
          title: `Auto-closed as ghosted after ${GHOST_AUTO_CLOSE_AFTER_DAYS}+ days of silence`,
          description: "Reopen it from the pipeline if the company resurfaces.",
          eventAt: now,
          relatedEntityType: "application",
          relatedEntityId: String(application._id),
          dedupeKey: `${application._id}:auto_ghosted:${dateKeyFromTimestamp(now)}`,
        })
        closedCount += 1
      }
    }

    return { closedCount }
  },
})

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

/** Hide ghost nudges (and defer auto-close) for a week. */
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
