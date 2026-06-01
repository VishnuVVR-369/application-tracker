import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx } from "./_generated/server"
import {
  applicationStage,
  applicationSource,
  applicationType,
  closedOutcome,
  offerDecision,
  qualityCheckSnapshot,
  referralStatus,
  rejectionReason,
  rejectionStage,
  workArrangement,
} from "./schema"
import { getCurrentUserDoc } from "./users"

const optionalApplicationFields = {
  location: v.optional(v.string()),
  workArrangement: v.optional(workArrangement),
  salaryMin: v.optional(v.number()),
  salaryMax: v.optional(v.number()),
  currency: v.optional(v.string()),
  postingUrl: v.optional(v.string()),
  source: v.optional(applicationSource),
  dateApplied: v.optional(v.string()),
  referralStatus: v.optional(referralStatus),
  applicationType: v.optional(applicationType),
  resumeId: v.optional(v.id("resumes")),
  applicationDeadlineAt: v.optional(v.string()),
  takeHomeDeadlineAt: v.optional(v.string()),
  offerResponseDeadlineAt: v.optional(v.string()),
  offerComp: v.optional(v.string()),
  offerDecision: v.optional(offerDecision),
  jobDescriptionSnapshot: v.optional(v.string()),
  notes: v.optional(v.string()),
  closedAt: v.optional(v.string()),
  closedOutcome: v.optional(closedOutcome),
  rejectionStage: v.optional(rejectionStage),
  rejectionReason: v.optional(rejectionReason),
  rejectionFeedback: v.optional(v.string()),
  rejectionLessons: v.optional(v.string()),
  reapplyAfter: v.optional(v.string()),
}

async function ensureResumeOwnership(
  ctx: MutationCtx,
  resumeId: Id<"resumes"> | undefined,
  userId: Id<"users">
) {
  if (!resumeId) {
    return
  }
  const resume = await ctx.db.get(resumeId)
  if (!resume || resume.userId !== userId) {
    throw new Error("Resume not found")
  }
}

async function getDefaultResumeId(ctx: MutationCtx, userId: Id<"users">) {
  const resume = await ctx.db
    .query("resumes")
    .withIndex("by_userId_and_isDefault", (q) =>
      q.eq("userId", userId).eq("isDefault", true)
    )
    .first()
  return resume && !resume.archived ? resume._id : undefined
}

async function getQualitySnapshot(ctx: MutationCtx, userId: Id<"users">) {
  const items = (
    await ctx.db
      .query("qualityChecklistItems")
      .withIndex("by_userId_and_enabled", (q) => q.eq("userId", userId).eq("enabled", true))
      .collect()
  ).sort((a, b) => a.sortOrder - b.sortOrder)

  return items.map((item) => ({
    key: item.key,
    label: item.label,
    checked: false,
    weight: item.weight,
    source: item.source,
  }))
}

async function addActivity(
  ctx: MutationCtx,
  userId: Id<"users">,
  applicationId: Id<"applications">,
  event: Omit<Doc<"activityEvents">, "_id" | "_creationTime" | "userId" | "applicationId">
) {
  await ctx.db.insert("activityEvents", {
    userId,
    applicationId,
    ...event,
  })
}

async function addAutoWin(
  ctx: MutationCtx,
  userId: Id<"users">,
  application: Doc<"applications">,
  type:
    | "application_submitted"
    | "response_received"
    | "interview_reached"
    | "offer_received",
  at: string
) {
  await ctx.db.insert("winLogEntries", {
    userId,
    applicationId: application._id,
    type,
    title:
      type === "application_submitted"
        ? `Submitted ${application.companyName}`
        : type === "response_received"
          ? `Response from ${application.companyName}`
          : type === "interview_reached"
            ? `Reached interview at ${application.companyName}`
            : `Offer from ${application.companyName}`,
    occurredAt: at,
    source: "auto",
    createdAt: at,
  })
}

async function addMilestoneWins(
  ctx: MutationCtx,
  userId: Id<"users">,
  application: Doc<"applications">,
  at: string
) {
  if (application.stage !== "saved") {
    await addAutoWin(ctx, userId, application, "application_submitted", at)
  }
  if (["phone_screen", "interview", "offer", "closed"].includes(application.stage)) {
    await addAutoWin(ctx, userId, application, "response_received", at)
  }
  if (["interview", "offer", "closed"].includes(application.stage)) {
    await addAutoWin(ctx, userId, application, "interview_reached", at)
  }
  if (application.stage === "offer") {
    await addAutoWin(ctx, userId, application, "offer_received", at)
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserDoc(ctx)
    return await ctx.db
      .query("applications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect()
  },
})

export const get = query({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.id)
    if (!application || application.userId !== user._id) {
      return null
    }
    return application
  },
})

export const create = mutation({
  args: {
    companyName: v.string(),
    roleTitle: v.string(),
    stage: applicationStage,
    ...optionalApplicationFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const now = new Date().toISOString()
    const resumeId = args.resumeId ?? (await getDefaultResumeId(ctx, user._id))
    await ensureResumeOwnership(ctx, resumeId, user._id)

    const applicationId = await ctx.db.insert("applications", {
      userId: user._id,
      companyName: args.companyName,
      roleTitle: args.roleTitle,
      location: args.location,
      workArrangement: args.workArrangement,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      currency: args.currency ?? "USD",
      postingUrl: args.postingUrl,
      source: args.source,
      dateApplied: args.dateApplied,
      stage: args.stage,
      referralStatus: args.referralStatus ?? "not_checked",
      applicationType: args.applicationType,
      resumeId,
      qualityChecks: await getQualitySnapshot(ctx, user._id),
      applicationDeadlineAt: args.applicationDeadlineAt,
      takeHomeDeadlineAt: args.takeHomeDeadlineAt,
      offerResponseDeadlineAt: args.offerResponseDeadlineAt,
      offerComp: args.offerComp,
      offerDecision: args.offerDecision,
      jobDescriptionSnapshot: args.jobDescriptionSnapshot,
      notes: args.notes,
      closedAt: args.closedAt,
      closedOutcome: args.closedOutcome,
      rejectionStage: args.rejectionStage,
      rejectionReason: args.rejectionReason,
      rejectionFeedback: args.rejectionFeedback,
      rejectionLessons: args.rejectionLessons,
      reapplyAfter: args.reapplyAfter,
      archived: false,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    })

    await addActivity(ctx, user._id, applicationId, {
      type: "created",
      title: "Application created",
      source: "auto",
      eventDate: now,
      createdAt: now,
    })

    const application = await ctx.db.get(applicationId)
    if (application) {
      await addMilestoneWins(ctx, user._id, application, now)
    }

    return applicationId
  },
})

export const update = mutation({
  args: {
    id: v.id("applications"),
    companyName: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
    stage: v.optional(applicationStage),
    qualityChecks: v.optional(v.array(qualityCheckSnapshot)),
    archived: v.optional(v.boolean()),
    ...optionalApplicationFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.id)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }
    await ensureResumeOwnership(ctx, args.resumeId, user._id)

    const now = new Date().toISOString()
    const patch = {
      companyName: args.companyName,
      roleTitle: args.roleTitle,
      location: args.location,
      workArrangement: args.workArrangement,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      currency: args.currency,
      postingUrl: args.postingUrl,
      source: args.source,
      dateApplied: args.dateApplied,
      stage: args.stage,
      referralStatus: args.referralStatus,
      applicationType: args.applicationType,
      resumeId: args.resumeId,
      qualityChecks: args.qualityChecks,
      applicationDeadlineAt: args.applicationDeadlineAt,
      takeHomeDeadlineAt: args.takeHomeDeadlineAt,
      offerResponseDeadlineAt: args.offerResponseDeadlineAt,
      offerComp: args.offerComp,
      offerDecision: args.offerDecision,
      jobDescriptionSnapshot: args.jobDescriptionSnapshot,
      notes: args.notes,
      closedAt: args.closedAt,
      closedOutcome: args.closedOutcome,
      rejectionStage: args.rejectionStage,
      rejectionReason: args.rejectionReason,
      rejectionFeedback: args.rejectionFeedback,
      rejectionLessons: args.rejectionLessons,
      reapplyAfter: args.reapplyAfter,
      archived: args.archived,
      updatedAt: now,
      lastActivityAt: now,
    }

    await ctx.db.patch(
      args.id,
      Object.fromEntries(
        Object.entries(patch).filter((entry) => entry[1] !== undefined)
      )
    )

    const updated = await ctx.db.get(args.id)
    if (args.stage && args.stage !== application.stage && updated) {
      await addActivity(ctx, user._id, args.id, {
        type: "stage_changed",
        title: `Moved to ${args.stage}`,
        description: `${application.stage} to ${args.stage}`,
        source: "auto",
        eventDate: now,
        createdAt: now,
        fromStage: application.stage,
        toStage: args.stage,
      })
      await addMilestoneWins(ctx, user._id, updated, now)
    } else {
      await addActivity(ctx, user._id, args.id, {
        type: "edited",
        title: "Application updated",
        source: "auto",
        eventDate: now,
        createdAt: now,
      })
    }
  },
})

export const moveStage = mutation({
  args: {
    id: v.id("applications"),
    stage: applicationStage,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.id)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }
    if (application.stage === args.stage) {
      return
    }

    const now = new Date().toISOString()
    await ctx.db.patch(args.id, {
      stage: args.stage,
      updatedAt: now,
      lastActivityAt: now,
    })
    const updated = await ctx.db.get(args.id)
    await addActivity(ctx, user._id, args.id, {
      type: "stage_changed",
      title: `Moved to ${args.stage}`,
      description: `${application.stage} to ${args.stage}`,
      source: "auto",
      eventDate: now,
      createdAt: now,
      fromStage: application.stage,
      toStage: args.stage,
    })
    if (updated) {
      await addMilestoneWins(ctx, user._id, updated, now)
    }
  },
})

export const updateQualityCheck = mutation({
  args: {
    id: v.id("applications"),
    key: v.string(),
    checked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.id)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

    await ctx.db.patch(args.id, {
      qualityChecks: application.qualityChecks.map((check) =>
        check.key === args.key ? { ...check, checked: args.checked } : check
      ),
      updatedAt: new Date().toISOString(),
    })
  },
})
