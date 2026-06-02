import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { mutation, type MutationCtx } from "./_generated/server"
import { dateKeyFromTimestamp } from "./model"
import { taskKind } from "./schema"
import { getCurrentUserDoc } from "./users"

async function ensureApplication(
  ctx: MutationCtx,
  applicationId: Id<"applications"> | undefined,
  userId: Id<"users">
) {
  if (!applicationId) {
    return undefined
  }
  const application = await ctx.db.get(applicationId)
  if (!application || application.userId !== userId) {
    throw new Error("Application not found")
  }
  return application
}

async function ensureRelatedRecords(
  ctx: MutationCtx,
  args: {
    applicationId?: Id<"applications">
    relatedInterviewId?: Id<"applicationInterviews">
    relatedOfferId?: Id<"applicationOffers">
    userId: Id<"users">
  }
) {
  const application = await ensureApplication(ctx, args.applicationId, args.userId)

  if (args.relatedInterviewId) {
    const interview = await ctx.db.get(args.relatedInterviewId)
    if (!interview || interview.userId !== args.userId) {
      throw new Error("Interview not found")
    }
    if (application && interview.applicationId !== application._id) {
      throw new Error("Interview does not belong to application")
    }
  }

  if (args.relatedOfferId) {
    const offer = await ctx.db.get(args.relatedOfferId)
    if (!offer || offer.userId !== args.userId) {
      throw new Error("Offer not found")
    }
    if (application && offer.applicationId !== application._id) {
      throw new Error("Offer does not belong to application")
    }
  }
}

async function insertTaskActivity(args: {
  ctx: MutationCtx
  userId: Id<"users">
  applicationId: Id<"applications">
  taskId: Id<"tasks">
  title: string
  at: number
}) {
  await args.ctx.db.insert("activityEvents", {
    userId: args.userId,
    applicationId: args.applicationId,
    type: "task_completed",
    title: `Completed task: ${args.title}`,
    source: "auto",
    actorType: "system",
    eventAt: args.at,
    eventDate: dateKeyFromTimestamp(args.at),
    relatedEntityType: "task",
    relatedEntityId: String(args.taskId),
    dedupeKey: `${args.taskId}:completed`,
    createdAt: args.at,
  })
}

export const create = mutation({
  args: {
    applicationId: v.optional(v.id("applications")),
    relatedInterviewId: v.optional(v.id("applicationInterviews")),
    relatedOfferId: v.optional(v.id("applicationOffers")),
    title: v.string(),
    description: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    timezone: v.optional(v.string()),
    kind: taskKind,
    kindDetail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    await ensureRelatedRecords(ctx, { ...args, userId: user._id })

    if (!args.dueAt && !args.dueDate) {
      throw new Error("Task requires dueAt or dueDate")
    }

    const now = Date.now()
    return await ctx.db.insert("tasks", {
      userId: user._id,
      applicationId: args.applicationId,
      relatedInterviewId: args.relatedInterviewId,
      relatedOfferId: args.relatedOfferId,
      title: args.title,
      description: args.description,
      dueAt: args.dueAt,
      dueDate: args.dueDate,
      timezone: args.timezone,
      kind: args.kind,
      kindDetail: args.kindDetail,
      status: "pending",
      source: "manual",
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const complete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const task = await ctx.db.get(args.id)
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found")
    }

    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })

    if (task.applicationId) {
      await insertTaskActivity({
        ctx,
        userId: user._id,
        applicationId: task.applicationId,
        taskId: args.id,
        title: task.title,
        at: now,
      })
    }

    if (task.kind === "follow_up") {
      const dedupeKey = `${args.id}:follow_up_completed`
      const existing = await ctx.db
        .query("winLogEntries")
        .withIndex("by_userId_and_dedupeKey", (q) => q.eq("userId", user._id).eq("dedupeKey", dedupeKey))
        .first()
      if (!existing) {
        await ctx.db.insert("winLogEntries", {
          userId: user._id,
          applicationId: task.applicationId,
          type: "follow_up_completed",
          title: `Completed follow-up: ${task.title}`,
          occurredAt: now,
          occurredDate: dateKeyFromTimestamp(now),
          source: "auto",
          relatedEntityType: "task",
          relatedEntityId: String(args.id),
          dedupeKey,
          createdAt: now,
        })
      }
    }
  },
})
