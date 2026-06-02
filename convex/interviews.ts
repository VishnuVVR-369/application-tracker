import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, type MutationCtx } from "./_generated/server"
import { dateKeyFromTimestamp, removeUndefined } from "./model"
import {
  interviewFormat,
  interviewResult,
  interviewStatus,
  interviewType,
} from "./schema"
import { getCurrentUserDoc } from "./users"

async function ensureApplication(
  ctx: MutationCtx,
  applicationId: Id<"applications">,
  userId: Id<"users">
) {
  const application = await ctx.db.get(applicationId)
  if (!application || application.userId !== userId) {
    throw new Error("Application not found")
  }
  return application
}

async function ensureInterview(
  ctx: MutationCtx,
  interviewId: Id<"applicationInterviews">,
  userId: Id<"users">
) {
  const interview = await ctx.db.get(interviewId)
  if (!interview || interview.userId !== userId) {
    throw new Error("Interview not found")
  }
  return interview
}

// Keep only the contact ids that actually belong to this application.
async function sanitizeContactIds(
  ctx: MutationCtx,
  applicationId: Id<"applications">,
  userId: Id<"users">,
  contactIds: Id<"applicationContacts">[] | undefined
) {
  if (!contactIds?.length) {
    return [] as Id<"applicationContacts">[]
  }
  const resolved = await Promise.all(contactIds.map((id) => ctx.db.get(id)))
  return resolved
    .filter(
      (contact): contact is Doc<"applicationContacts"> =>
        contact !== null &&
        contact.userId === userId &&
        contact.applicationId === applicationId
    )
    .map((contact) => contact._id)
}

const optionalInterviewFields = {
  roundNumber: v.optional(v.number()),
  roundLabel: v.optional(v.string()),
  interviewType: v.optional(interviewType),
  interviewTypeDetail: v.optional(v.string()),
  format: v.optional(interviewFormat),
  formatDetail: v.optional(v.string()),
  scheduledAt: v.optional(v.number()),
  scheduledDate: v.optional(v.string()),
  timezone: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  prepNotes: v.optional(v.string()),
  questions: v.optional(v.string()),
}

export const create = mutation({
  args: {
    applicationId: v.id("applications"),
    status: v.optional(interviewStatus),
    contactIds: v.optional(v.array(v.id("applicationContacts"))),
    ...optionalInterviewFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ensureApplication(ctx, args.applicationId, user._id)

    const now = Date.now()
    const existing = await ctx.db
      .query("applicationInterviews")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .collect()
    const contactIds = await sanitizeContactIds(ctx, args.applicationId, user._id, args.contactIds)
    const scheduledDate =
      args.scheduledDate ??
      (args.scheduledAt !== undefined ? dateKeyFromTimestamp(args.scheduledAt) : undefined)

    const interviewId = await ctx.db.insert("applicationInterviews", {
      userId: user._id,
      applicationId: args.applicationId,
      roundNumber: args.roundNumber ?? existing.length + 1,
      roundLabel: args.roundLabel,
      interviewType: args.interviewType,
      interviewTypeDetail: args.interviewTypeDetail,
      format: args.format,
      formatDetail: args.formatDetail,
      status: args.status ?? "scheduled",
      scheduledAt: args.scheduledAt,
      scheduledDate,
      timezone: args.timezone,
      durationMinutes: args.durationMinutes,
      contactIds,
      prepNotes: args.prepNotes,
      questions: args.questions,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert("activityEvents", {
      userId: user._id,
      applicationId: args.applicationId,
      type: "interview_scheduled",
      title: args.roundLabel
        ? `Interview scheduled: ${args.roundLabel}`
        : "Interview scheduled",
      description: scheduledDate ? `On ${scheduledDate}` : undefined,
      source: "auto",
      actorType: "system",
      eventAt: now,
      eventDate: dateKeyFromTimestamp(now),
      relatedEntityType: "interview",
      relatedEntityId: String(interviewId),
      createdAt: now,
    })

    await ctx.db.patch(args.applicationId, { lastActivityAt: now, updatedAt: now })
    // Stage stays under the user's control; if they're still pre-interview we
    // surface a nudge in the UI rather than silently moving the application.
    void application
    return interviewId
  },
})

export const update = mutation({
  args: {
    id: v.id("applicationInterviews"),
    status: v.optional(interviewStatus),
    result: v.optional(interviewResult),
    feedback: v.optional(v.string()),
    contactIds: v.optional(v.array(v.id("applicationContacts"))),
    ...optionalInterviewFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const interview = await ensureInterview(ctx, args.id, user._id)

    const now = Date.now()
    const contactIds =
      args.contactIds === undefined
        ? undefined
        : await sanitizeContactIds(ctx, interview.applicationId, user._id, args.contactIds)
    const scheduledDate =
      args.scheduledDate ??
      (args.scheduledAt !== undefined ? dateKeyFromTimestamp(args.scheduledAt) : undefined)

    const patch = removeUndefined({
      roundNumber: args.roundNumber,
      roundLabel: args.roundLabel,
      interviewType: args.interviewType,
      interviewTypeDetail: args.interviewTypeDetail,
      format: args.format,
      formatDetail: args.formatDetail,
      status: args.status,
      result: args.result,
      feedback: args.feedback,
      scheduledAt: args.scheduledAt,
      scheduledDate,
      timezone: args.timezone,
      durationMinutes: args.durationMinutes,
      prepNotes: args.prepNotes,
      questions: args.questions,
      contactIds,
      completedAt: args.status === "completed" ? interview.completedAt ?? now : undefined,
      updatedAt: now,
    }) as Partial<Doc<"applicationInterviews">>

    await ctx.db.patch(args.id, patch)
    await ctx.db.patch(interview.applicationId, { lastActivityAt: now, updatedAt: now })
  },
})

export const setResult = mutation({
  args: {
    id: v.id("applicationInterviews"),
    result: interviewResult,
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const interview = await ensureInterview(ctx, args.id, user._id)

    const now = Date.now()
    await ctx.db.patch(args.id, {
      result: args.result,
      feedback: args.feedback ?? interview.feedback,
      status: interview.status === "scheduled" ? "completed" : interview.status,
      completedAt: interview.completedAt ?? now,
      updatedAt: now,
    })
    await ctx.db.patch(interview.applicationId, { lastActivityAt: now, updatedAt: now })
  },
})

// Cancel pending tasks tied to an interview so an interview that goes away
// doesn't leave orphaned prep/follow-up reminders behind.
async function cancelLinkedTasks(
  ctx: MutationCtx,
  interviewId: Id<"applicationInterviews">,
  at: number
) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_relatedInterviewId", (q) => q.eq("relatedInterviewId", interviewId))
    .collect()
  await Promise.all(
    tasks
      .filter((task) => task.status === "pending")
      .map((task) =>
        ctx.db.patch(task._id, { status: "canceled", canceledAt: at, updatedAt: at })
      )
  )
}

export const cancel = mutation({
  args: { id: v.id("applicationInterviews") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const interview = await ensureInterview(ctx, args.id, user._id)

    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: "canceled",
      canceledAt: now,
      updatedAt: now,
    })
    await cancelLinkedTasks(ctx, args.id, now)
    await ctx.db.patch(interview.applicationId, { lastActivityAt: now, updatedAt: now })
  },
})

export const remove = mutation({
  args: { id: v.id("applicationInterviews") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    await ensureInterview(ctx, args.id, user._id)
    await cancelLinkedTasks(ctx, args.id, Date.now())
    await ctx.db.delete(args.id)
  },
})
