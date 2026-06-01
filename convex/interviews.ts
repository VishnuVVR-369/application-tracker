import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx } from "./_generated/server"
import { dateKeyFromTimestamp, removeUndefined } from "./model"
import { interviewFormat, interviewResult, interviewStatus, interviewType } from "./schema"
import { getCurrentUserDoc } from "./users"

async function ensureApplicationAndContacts(args: {
  ctx: MutationCtx
  userId: Id<"users">
  applicationId: Id<"applications">
  contactIds: Array<Id<"applicationContacts">>
}) {
  const application = await args.ctx.db.get(args.applicationId)
  if (!application || application.userId !== args.userId) {
    throw new Error("Application not found")
  }

  await Promise.all(
    args.contactIds.map(async (contactId) => {
      const contact = await args.ctx.db.get(contactId)
      if (
        !contact ||
        contact.userId !== args.userId ||
        contact.applicationId !== args.applicationId
      ) {
        throw new Error("Contact not found")
      }
    })
  )
}

export const listForApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application || application.userId !== user._id) {
      return []
    }

    return await ctx.db
      .query("applicationInterviews")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .collect()
  },
})

export const create = mutation({
  args: {
    applicationId: v.id("applications"),
    roundNumber: v.optional(v.number()),
    roundLabel: v.optional(v.string()),
    interviewType: v.optional(interviewType),
    interviewTypeDetail: v.optional(v.string()),
    format: v.optional(interviewFormat),
    formatDetail: v.optional(v.string()),
    status: v.optional(interviewStatus),
    scheduledAt: v.optional(v.number()),
    scheduledDate: v.optional(v.string()),
    timezone: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    contactIds: v.optional(v.array(v.id("applicationContacts"))),
    prepNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const contactIds = args.contactIds ?? []
    await ensureApplicationAndContacts({
      ctx,
      userId: user._id,
      applicationId: args.applicationId,
      contactIds,
    })

    const now = Date.now()
    const interviewId = await ctx.db.insert("applicationInterviews", {
      userId: user._id,
      applicationId: args.applicationId,
      roundNumber: args.roundNumber,
      roundLabel: args.roundLabel,
      interviewType: args.interviewType,
      interviewTypeDetail: args.interviewTypeDetail,
      format: args.format,
      formatDetail: args.formatDetail,
      status: args.status ?? "scheduled",
      scheduledAt: args.scheduledAt,
      scheduledDate: args.scheduledDate,
      timezone: args.timezone,
      durationMinutes: args.durationMinutes,
      contactIds,
      prepNotes: args.prepNotes,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert("activityEvents", {
      userId: user._id,
      applicationId: args.applicationId,
      type: "interview_scheduled",
      title: args.roundLabel ? `Interview scheduled: ${args.roundLabel}` : "Interview scheduled",
      source: "auto",
      actorType: "system",
      eventAt: now,
      eventDate: dateKeyFromTimestamp(now),
      relatedEntityType: "interview",
      relatedEntityId: String(interviewId),
      createdAt: now,
    })

    return interviewId
  },
})

export const update = mutation({
  args: {
    id: v.id("applicationInterviews"),
    roundNumber: v.optional(v.number()),
    roundLabel: v.optional(v.string()),
    interviewType: v.optional(interviewType),
    interviewTypeDetail: v.optional(v.string()),
    format: v.optional(interviewFormat),
    formatDetail: v.optional(v.string()),
    status: v.optional(interviewStatus),
    scheduledAt: v.optional(v.number()),
    scheduledDate: v.optional(v.string()),
    timezone: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    contactIds: v.optional(v.array(v.id("applicationContacts"))),
    prepNotes: v.optional(v.string()),
    questions: v.optional(v.string()),
    feedback: v.optional(v.string()),
    result: v.optional(interviewResult),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const interview = await ctx.db.get(args.id)
    if (!interview || interview.userId !== user._id) {
      throw new Error("Interview not found")
    }
    if (args.contactIds) {
      await ensureApplicationAndContacts({
        ctx,
        userId: user._id,
        applicationId: interview.applicationId,
        contactIds: args.contactIds,
      })
    }
    const now = Date.now()
    await ctx.db.patch(
      args.id,
      removeUndefined({
        roundNumber: args.roundNumber,
        roundLabel: args.roundLabel,
        interviewType: args.interviewType,
        interviewTypeDetail: args.interviewTypeDetail,
        format: args.format,
        formatDetail: args.formatDetail,
        status: args.status,
        scheduledAt: args.scheduledAt,
        scheduledDate: args.scheduledDate,
        timezone: args.timezone,
        durationMinutes: args.durationMinutes,
        contactIds: args.contactIds,
        prepNotes: args.prepNotes,
        questions: args.questions,
        feedback: args.feedback,
        result: args.result,
        completedAt: args.status === "completed" ? interview.completedAt ?? now : undefined,
        canceledAt: args.status === "canceled" ? interview.canceledAt ?? now : undefined,
        updatedAt: now,
      })
    )
  },
})
