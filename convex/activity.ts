import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { dateKeyFromTimestamp } from "./model"
import { getCurrentUserDoc } from "./users"

export const listForApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application || application.userId !== user._id) {
      return []
    }

    return await ctx.db
      .query("activityEvents")
      .withIndex("by_applicationId_and_eventAt", (q) =>
        q.eq("applicationId", args.applicationId)
      )
      .collect()
  },
})

export const addManual = mutation({
  args: {
    applicationId: v.id("applications"),
    title: v.string(),
    description: v.optional(v.string()),
    eventAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

    const now = Date.now()
    const eventAt = args.eventAt ?? now
    return await ctx.db.insert("activityEvents", {
      userId: user._id,
      applicationId: args.applicationId,
      type: "manual",
      title: args.title,
      description: args.description,
      source: "manual",
      actorType: "user",
      actorUserId: user._id,
      eventAt,
      eventDate: dateKeyFromTimestamp(eventAt),
      relatedEntityType: "application",
      relatedEntityId: String(args.applicationId),
      createdAt: now,
    })
  },
})
