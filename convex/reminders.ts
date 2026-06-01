import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { reminderType } from "./schema"
import { getCurrentUserDoc } from "./users"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserDoc(ctx)
    return await ctx.db
      .query("reminders")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect()
  },
})

export const create = mutation({
  args: {
    applicationId: v.optional(v.id("applications")),
    title: v.string(),
    description: v.optional(v.string()),
    dueAt: v.string(),
    reminderType,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    if (args.applicationId) {
      const application = await ctx.db.get(args.applicationId)
      if (!application || application.userId !== user._id) {
        throw new Error("Application not found")
      }
    }

    const now = new Date().toISOString()
    return await ctx.db.insert("reminders", {
      userId: user._id,
      applicationId: args.applicationId,
      title: args.title,
      description: args.description,
      dueAt: args.dueAt,
      status: "pending",
      reminderType: args.reminderType,
      createdAt: now,
    })
  },
})

export const complete = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const reminder = await ctx.db.get(args.id)
    if (!reminder || reminder.userId !== user._id) {
      throw new Error("Reminder not found")
    }

    const now = new Date().toISOString()
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: now,
    })

    if (reminder.applicationId) {
      await ctx.db.insert("activityEvents", {
        userId: user._id,
        applicationId: reminder.applicationId,
        type: "reminder_completed",
        title: `Completed reminder: ${reminder.title}`,
        source: "auto",
        eventDate: now,
        createdAt: now,
      })
    }

    if (reminder.reminderType === "follow_up") {
      await ctx.db.insert("winLogEntries", {
        userId: user._id,
        applicationId: reminder.applicationId,
        type: "follow_up_completed",
        title: `Completed follow-up: ${reminder.title}`,
        occurredAt: now,
        source: "auto",
        createdAt: now,
      })
    }
  },
})

export const dismiss = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const reminder = await ctx.db.get(args.id)
    if (!reminder || reminder.userId !== user._id) {
      throw new Error("Reminder not found")
    }

    await ctx.db.patch(args.id, {
      status: "dismissed",
      dismissedAt: new Date().toISOString(),
    })
  },
})

