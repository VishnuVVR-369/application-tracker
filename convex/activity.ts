import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
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
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .collect()
  },
})

export const addManual = mutation({
  args: {
    applicationId: v.id("applications"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

    const now = new Date().toISOString()
    return await ctx.db.insert("activityEvents", {
      userId: user._id,
      applicationId: args.applicationId,
      type: "manual",
      title: args.title,
      description: args.description,
      source: "manual",
      eventDate: now,
      createdAt: now,
    })
  },
})

