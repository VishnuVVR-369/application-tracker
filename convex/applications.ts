import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, type MutationCtx } from "./_generated/server"
import {
  applicationSource,
  applicationStage,
  applicationType,
  closedOutcome,
  compensationPeriod,
  offerDecision,
  qualityCheckSnapshot,
  referralStatus,
  rejectionReason,
  rejectionStage,
  sourceSystem,
  workArrangement,
} from "./schema"
import {
  buildResumeSnapshot,
  canonicalizeUrl,
  dateKeyFromTimestamp,
  getDomain,
  normalizeKey,
  removeUndefined,
} from "./model"
import { getCurrentUserDoc } from "./users"

const optionalApplicationFields = {
  companyWebsite: v.optional(v.string()),
  location: v.optional(v.string()),
  workArrangement: v.optional(workArrangement),
  compensationMin: v.optional(v.number()),
  compensationMax: v.optional(v.number()),
  compensationCurrency: v.optional(v.string()),
  compensationPeriod: v.optional(compensationPeriod),
  compensationNotes: v.optional(v.string()),
  postingUrl: v.optional(v.string()),
  postingTitleSnapshot: v.optional(v.string()),
  postingCompanySnapshot: v.optional(v.string()),
  postingCapturedAt: v.optional(v.number()),
  jobDescriptionSnapshot: v.optional(v.string()),
  source: v.optional(applicationSource),
  sourceDetail: v.optional(v.string()),
  sourceSystem: v.optional(sourceSystem),
  sourceExternalId: v.optional(v.string()),
  dateSavedDate: v.optional(v.string()),
  dateAppliedDate: v.optional(v.string()),
  referralStatus: v.optional(referralStatus),
  applicationType: v.optional(applicationType),
  currentResumeId: v.optional(v.id("resumes")),
  applicationDeadlineDate: v.optional(v.string()),
  takeHomeDeadlineDate: v.optional(v.string()),
  offerResponseDeadlineDate: v.optional(v.string()),
  notes: v.optional(v.string()),
  closedAt: v.optional(v.number()),
  closedDate: v.optional(v.string()),
  closedOutcome: v.optional(closedOutcome),
  rejectionStage: v.optional(rejectionStage),
  rejectionStageDetail: v.optional(v.string()),
  rejectionReason: v.optional(rejectionReason),
  rejectionReasonDetail: v.optional(v.string()),
  rejectionFeedback: v.optional(v.string()),
  rejectionLessons: v.optional(v.string()),
  reapplyAfterDate: v.optional(v.string()),
}

async function ensureResumeOwnership(
  ctx: MutationCtx,
  resumeId: Id<"resumes"> | undefined,
  userId: Id<"users">
) {
  if (!resumeId) {
    return undefined
  }
  const resume = await ctx.db.get(resumeId)
  if (!resume || resume.userId !== userId) {
    throw new Error("Resume not found")
  }
  return resume
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
    itemId: item._id,
    label: item.label,
    checked: false,
    weight: item.weight,
    source: item.source,
    sortOrder: item.sortOrder,
  }))
}

export async function addActivity(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">
    applicationId: Id<"applications">
    type: Doc<"activityEvents">["type"]
    title: string
    description?: string
    source?: "auto" | "manual"
    eventAt: number
    relatedEntityType?: Doc<"activityEvents">["relatedEntityType"]
    relatedEntityId?: string
    metadata?: unknown
    dedupeKey?: string
  }
) {
  return await ctx.db.insert("activityEvents", {
    userId: args.userId,
    applicationId: args.applicationId,
    type: args.type,
    title: args.title,
    description: args.description,
    source: args.source ?? "auto",
    actorType: args.source === "manual" ? "user" : "system",
    actorUserId: args.source === "manual" ? args.userId : undefined,
    eventAt: args.eventAt,
    eventDate: dateKeyFromTimestamp(args.eventAt),
    relatedEntityType: args.relatedEntityType,
    relatedEntityId: args.relatedEntityId,
    metadataJson: args.metadata === undefined ? undefined : JSON.stringify(args.metadata),
    dedupeKey: args.dedupeKey,
    createdAt: args.eventAt,
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
  at: number
) {
  const dedupeKey = `${application._id}:${type}`
  const existing = await ctx.db
    .query("winLogEntries")
    .withIndex("by_userId_and_dedupeKey", (q) => q.eq("userId", userId).eq("dedupeKey", dedupeKey))
    .first()
  if (existing) {
    return
  }

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
    occurredDate: dateKeyFromTimestamp(at),
    source: "auto",
    relatedEntityType: "application",
    relatedEntityId: String(application._id),
    dedupeKey,
    createdAt: at,
  })
}

async function addMilestoneWins(
  ctx: MutationCtx,
  userId: Id<"users">,
  application: Doc<"applications">,
  at: number
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

async function insertStageHistory(
  ctx: MutationCtx,
  userId: Id<"users">,
  applicationId: Id<"applications">,
  stage: Doc<"applications">["stage"],
  at: number,
  fromStage?: Doc<"applications">["stage"],
  activityEventId?: Id<"activityEvents">,
  source: Doc<"applicationStageHistory">["source"] = "user"
) {
  return await ctx.db.insert("applicationStageHistory", {
    userId,
    applicationId,
    stage,
    enteredAt: at,
    enteredFromStage: fromStage,
    source,
    activityEventId,
    createdAt: at,
    updatedAt: at,
  })
}

export async function transitionStage(
  ctx: MutationCtx,
  userId: Id<"users">,
  application: Doc<"applications">,
  nextStage: Doc<"applications">["stage"],
  at: number,
  source: Doc<"applicationStageHistory">["source"] = "user"
) {
  if (application.stage === nextStage) {
    return undefined
  }

  const openHistory = (
    await ctx.db
      .query("applicationStageHistory")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", application._id))
      .collect()
  ).find((item) => item.exitedAt === undefined)

  if (openHistory) {
    await ctx.db.patch(openHistory._id, {
      exitedAt: at,
      exitedToStage: nextStage,
      updatedAt: at,
    })
  }

  const eventId = await addActivity(ctx, {
    userId,
    applicationId: application._id,
    type: "stage_changed",
    title: `Moved to ${nextStage}`,
    description: `${application.stage} to ${nextStage}`,
    eventAt: at,
    relatedEntityType: "application",
    relatedEntityId: String(application._id),
    metadata: { fromStage: application.stage, toStage: nextStage },
    dedupeKey: `${application._id}:stage:${application.stage}:${nextStage}:${at}`,
  })

  await insertStageHistory(
    ctx,
    userId,
    application._id,
    nextStage,
    at,
    application.stage,
    eventId,
    source
  )
  return eventId
}

async function setCurrentResumeLink(
  ctx: MutationCtx,
  userId: Id<"users">,
  applicationId: Id<"applications">,
  resumeId: Id<"resumes">,
  at: number
) {
  const resume = await ensureResumeOwnership(ctx, resumeId, userId)
  if (!resume) {
    return
  }

  const currentLinks = await ctx.db
    .query("applicationResumeLinks")
    .withIndex("by_userId_and_applicationId_and_isCurrent", (q) =>
      q.eq("userId", userId).eq("applicationId", applicationId).eq("isCurrent", true)
    )
    .collect()

  await Promise.all(
    currentLinks.map((link) =>
      ctx.db.patch(link._id, {
        isCurrent: false,
        unlinkedAt: at,
        updatedAt: at,
      })
    )
  )

  await ctx.db.insert("applicationResumeLinks", {
    userId,
    applicationId,
    resumeId,
    isCurrent: true,
    linkedAt: at,
    resumeSnapshot: buildResumeSnapshot(resume),
    createdAt: at,
    updatedAt: at,
  })

  await addActivity(ctx, {
    userId,
    applicationId,
    type: "resume_linked",
    title: `Linked resume: ${resume.label}`,
    eventAt: at,
    relatedEntityType: "resume",
    relatedEntityId: String(resume._id),
  })
}

type ApplicationPatchInput = {
  companyName?: string
  companyWebsite?: string
  roleTitle?: string
  location?: string
  workArrangement?: Doc<"applications">["workArrangement"]
  compensationMin?: number
  compensationMax?: number
  compensationCurrency?: string
  compensationPeriod?: Doc<"applications">["compensationPeriod"]
  compensationNotes?: string
  postingUrl?: string
  postingTitleSnapshot?: string
  postingCompanySnapshot?: string
  postingCapturedAt?: number
  jobDescriptionSnapshot?: string
  source?: Doc<"applications">["source"]
  sourceDetail?: string
  sourceSystem?: Doc<"applications">["sourceSystem"]
  sourceExternalId?: string
  dateSavedDate?: string
  dateAppliedDate?: string
  stage?: Doc<"applications">["stage"]
  referralStatus?: Doc<"applications">["referralStatus"]
  applicationType?: Doc<"applications">["applicationType"]
  currentResumeId?: Id<"resumes">
  qualityChecks?: Doc<"applications">["qualityChecks"]
  applicationDeadlineDate?: string
  takeHomeDeadlineDate?: string
  offerResponseDeadlineDate?: string
  notes?: string
  closedAt?: number
  closedDate?: string
  closedOutcome?: Doc<"applications">["closedOutcome"]
  rejectionStage?: Doc<"applications">["rejectionStage"]
  rejectionStageDetail?: string
  rejectionReason?: Doc<"applications">["rejectionReason"]
  rejectionReasonDetail?: string
  rejectionFeedback?: string
  rejectionLessons?: string
  reapplyAfterDate?: string
  archived?: boolean
  archivedAt?: number
}

function buildApplicationPatch(args: ApplicationPatchInput) {
  const companyName = args.companyName
  const roleTitle = args.roleTitle
  const postingUrl = args.postingUrl
  const companyWebsite = args.companyWebsite

  return removeUndefined({
    companyName,
    companyKey: companyName === undefined ? undefined : normalizeKey(companyName),
    companyWebsite,
    companyDomain:
      companyWebsite === undefined ? undefined : getDomain(companyWebsite),
    roleTitle,
    roleKey: roleTitle === undefined ? undefined : normalizeKey(roleTitle),
    location: args.location,
    workArrangement: args.workArrangement,
    compensationMin: args.compensationMin,
    compensationMax: args.compensationMax,
    compensationCurrency: args.compensationCurrency,
    compensationPeriod: args.compensationPeriod,
    compensationNotes: args.compensationNotes,
    postingUrl,
    postingUrlCanonical:
      postingUrl === undefined ? undefined : canonicalizeUrl(postingUrl),
    postingTitleSnapshot: args.postingTitleSnapshot,
    postingCompanySnapshot: args.postingCompanySnapshot,
    postingCapturedAt: args.postingCapturedAt,
    jobDescriptionSnapshot: args.jobDescriptionSnapshot,
    source: args.source,
    sourceDetail: args.sourceDetail,
    sourceSystem: args.sourceSystem,
    sourceExternalId: args.sourceExternalId,
    dateSavedDate: args.dateSavedDate,
    dateAppliedDate: args.dateAppliedDate,
    stage: args.stage,
    referralStatus: args.referralStatus,
    applicationType: args.applicationType,
    currentResumeId: args.currentResumeId,
    qualityChecks: args.qualityChecks,
    applicationDeadlineDate: args.applicationDeadlineDate,
    takeHomeDeadlineDate: args.takeHomeDeadlineDate,
    offerResponseDeadlineDate: args.offerResponseDeadlineDate,
    notes: args.notes,
    closedAt: args.closedAt,
    closedDate: args.closedDate,
    closedOutcome: args.closedOutcome,
    rejectionStage: args.rejectionStage,
    rejectionStageDetail: args.rejectionStageDetail,
    rejectionReason: args.rejectionReason,
    rejectionReasonDetail: args.rejectionReasonDetail,
    rejectionFeedback: args.rejectionFeedback,
    rejectionLessons: args.rejectionLessons,
    reapplyAfterDate: args.reapplyAfterDate,
    archived: args.archived,
    archivedAt: args.archivedAt,
  }) as Partial<Doc<"applications">>
}

export const create = mutation({
  args: {
    companyName: v.string(),
    roleTitle: v.string(),
    stage: applicationStage,
    ...optionalApplicationFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const now = Date.now()
    const currentResumeId =
      args.currentResumeId ?? (await getDefaultResumeId(ctx, user._id))
    await ensureResumeOwnership(ctx, currentResumeId, user._id)

    const stage = args.stage
    const patch = buildApplicationPatch({
      ...args,
      companyName: args.companyName,
      roleTitle: args.roleTitle,
      currentResumeId,
      dateSavedDate: args.dateSavedDate ?? dateKeyFromTimestamp(now),
      dateAppliedDate:
        args.dateAppliedDate ??
        (stage === "saved" ? undefined : dateKeyFromTimestamp(now)),
    })

    const applicationId = await ctx.db.insert("applications", {
      userId: user._id,
      companyName: args.companyName,
      companyKey: normalizeKey(args.companyName),
      roleTitle: args.roleTitle,
      roleKey: normalizeKey(args.roleTitle),
      stage,
      currentStageEnteredAt: now,
      referralStatus: args.referralStatus ?? "not_checked",
      sourceSystem: args.sourceSystem ?? "manual",
      compensationCurrency: args.compensationCurrency ?? "USD",
      qualityChecks: await getQualitySnapshot(ctx, user._id),
      archived: false,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      ...patch,
    })

    const eventId = await addActivity(ctx, {
      userId: user._id,
      applicationId,
      type: "created",
      title: "Application created",
      eventAt: now,
      relatedEntityType: "application",
      relatedEntityId: String(applicationId),
    })
    await insertStageHistory(ctx, user._id, applicationId, stage, now, undefined, eventId)

    if (currentResumeId) {
      await setCurrentResumeLink(ctx, user._id, applicationId, currentResumeId, now)
    }

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

    await ensureResumeOwnership(ctx, args.currentResumeId, user._id)

    const now = Date.now()
    const nextStage = args.stage
    if (nextStage && nextStage !== application.stage) {
      await transitionStage(ctx, user._id, application, nextStage, now)
    }

    const archivedAt =
      args.archived === undefined
        ? undefined
        : args.archived
          ? application.archivedAt ?? now
          : undefined

    const nextClosedAt =
      nextStage === "closed" && args.closedAt === undefined
        ? now
        : args.closedAt
    const nextClosedDate =
      nextStage === "closed" && args.closedDate === undefined
        ? dateKeyFromTimestamp(nextClosedAt ?? now)
        : args.closedDate

    const patch = {
      ...buildApplicationPatch({
        ...args,
        archivedAt,
        closedAt: nextClosedAt,
        closedDate: nextClosedDate,
      }),
      currentStageEnteredAt:
        nextStage && nextStage !== application.stage ? now : undefined,
      updatedAt: now,
      lastActivityAt: now,
    }

    await ctx.db.patch(args.id, removeUndefined(patch))

    if (
      args.currentResumeId &&
      args.currentResumeId !== application.currentResumeId
    ) {
      await setCurrentResumeLink(ctx, user._id, args.id, args.currentResumeId, now)
    }

    const updated = await ctx.db.get(args.id)
    if (updated) {
      if (nextStage && nextStage !== application.stage) {
        await addMilestoneWins(ctx, user._id, updated, now)
      } else {
        await addActivity(ctx, {
          userId: user._id,
          applicationId: args.id,
          type: "edited",
          title: "Application updated",
          eventAt: now,
          relatedEntityType: "application",
          relatedEntityId: String(args.id),
        })
      }
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

    const now = Date.now()
    await transitionStage(ctx, user._id, application, args.stage, now)
    await ctx.db.patch(args.id, {
      stage: args.stage,
      currentStageEnteredAt: now,
      dateAppliedDate:
        application.dateAppliedDate ??
        (args.stage === "saved" ? undefined : dateKeyFromTimestamp(now)),
      updatedAt: now,
      lastActivityAt: now,
    })
    const updated = await ctx.db.get(args.id)
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
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.id)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

    const now = Date.now()
    await ctx.db.patch(args.id, {
      qualityChecks: application.qualityChecks.map((check) =>
        check.key === args.key
          ? {
              ...check,
              checked: args.checked,
              checkedAt: args.checked ? now : undefined,
              notes: args.notes ?? check.notes,
            }
          : check
      ),
      updatedAt: now,
      lastActivityAt: now,
    })
  },
})

export const recordOffer = mutation({
  args: {
    applicationId: v.id("applications"),
    offeredDate: v.optional(v.string()),
    responseDeadlineDate: v.optional(v.string()),
    baseAmount: v.optional(v.number()),
    bonusAmount: v.optional(v.number()),
    equitySummary: v.optional(v.string()),
    currency: v.optional(v.string()),
    period: v.optional(v.union(
      v.literal("year"),
      v.literal("day"),
      v.literal("month"),
      v.literal("hour"),
      v.literal("contract"),
      v.literal("unknown")
    )),
    compensationNotes: v.optional(v.string()),
    decision: offerDecision,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

    const now = Date.now()
    const existingOffers = await ctx.db
      .query("applicationOffers")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .collect()
    await Promise.all(
      existingOffers
        .filter((offer) => offer.isCurrent)
        .map((offer) => ctx.db.patch(offer._id, { isCurrent: false, updatedAt: now }))
    )

    const offerId = await ctx.db.insert("applicationOffers", {
      userId: user._id,
      applicationId: args.applicationId,
      versionNumber: existingOffers.length + 1,
      isCurrent: true,
      offeredAt: now,
      offeredDate: args.offeredDate ?? dateKeyFromTimestamp(now),
      responseDeadlineDate: args.responseDeadlineDate,
      baseAmount: args.baseAmount,
      bonusAmount: args.bonusAmount,
      equitySummary: args.equitySummary,
      currency: args.currency ?? application.compensationCurrency ?? "USD",
      period: args.period ?? application.compensationPeriod ?? "year",
      compensationNotes: args.compensationNotes,
      decision: args.decision,
      decidedAt: ["accepted", "declined", "expired"].includes(args.decision) ? now : undefined,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    })

    if (application.stage !== "offer") {
      await transitionStage(ctx, user._id, application, "offer", now)
    }

    await ctx.db.patch(args.applicationId, {
      stage: "offer",
      currentStageEnteredAt: application.stage === "offer" ? application.currentStageEnteredAt : now,
      offerResponseDeadlineDate: args.responseDeadlineDate,
      updatedAt: now,
      lastActivityAt: now,
    })

    await addActivity(ctx, {
      userId: user._id,
      applicationId: args.applicationId,
      type: "offer_recorded",
      title: "Offer recorded",
      eventAt: now,
      relatedEntityType: "offer",
      relatedEntityId: String(offerId),
    })

    const updated = await ctx.db.get(args.applicationId)
    if (updated) {
      await addMilestoneWins(ctx, user._id, updated, now)
    }

    return offerId
  },
})
