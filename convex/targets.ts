import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, type MutationCtx } from "./_generated/server"
import {
  canonicalizeUrl,
  getDomain,
  normalizeEmail,
  normalizeKey,
  removeUndefined,
} from "./model"
import {
  referralOutreachSource,
  referralOutreachStatus,
  targetCompanyStatus,
  targetCompanyTier,
  workArrangement,
} from "./schema"
import { getCurrentUserDoc } from "./users"

async function ensureTargetCompany(
  ctx: MutationCtx,
  id: Id<"targetCompanies"> | undefined,
  userId: Id<"users">
) {
  if (!id) {
    return undefined
  }
  const target = await ctx.db.get(id)
  if (!target || target.userId !== userId) {
    throw new Error("Target company not found")
  }
  return target
}

async function ensureApplication(
  ctx: MutationCtx,
  id: Id<"applications"> | undefined,
  userId: Id<"users">
) {
  if (!id) {
    return undefined
  }
  const application = await ctx.db.get(id)
  if (!application || application.userId !== userId) {
    throw new Error("Application not found")
  }
  return application
}

const optionalTargetFields = {
  website: v.optional(v.string()),
  targetRoles: v.optional(v.array(v.string())),
  targetLevel: v.optional(v.string()),
  locationPreference: v.optional(v.string()),
  workArrangement: v.optional(workArrangement),
  priorityScore: v.optional(v.number()),
  roleFitScore: v.optional(v.number()),
  referralGoal: v.optional(v.number()),
  applicationWindowStartDate: v.optional(v.string()),
  applicationWindowEndDate: v.optional(v.string()),
  researchNotes: v.optional(v.string()),
  hiringBarNotes: v.optional(v.string()),
  interviewProcessNotes: v.optional(v.string()),
  compensationNotes: v.optional(v.string()),
  notes: v.optional(v.string()),
}

export const createCompany = mutation({
  args: {
    companyName: v.string(),
    tier: targetCompanyTier,
    status: targetCompanyStatus,
    ...optionalTargetFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const now = Date.now()
    const website = canonicalizeUrl(args.website)

    return await ctx.db.insert("targetCompanies", {
      userId: user._id,
      companyName: args.companyName,
      companyKey: normalizeKey(args.companyName),
      website,
      domain: getDomain(website),
      tier: args.tier,
      status: args.status,
      targetRoles: args.targetRoles ?? [],
      targetLevel: args.targetLevel,
      locationPreference: args.locationPreference,
      workArrangement: args.workArrangement,
      priorityScore: args.priorityScore ?? 50,
      roleFitScore: args.roleFitScore ?? 50,
      referralGoal: args.referralGoal ?? 2,
      applicationWindowStartDate: args.applicationWindowStartDate,
      applicationWindowEndDate: args.applicationWindowEndDate,
      researchNotes: args.researchNotes,
      hiringBarNotes: args.hiringBarNotes,
      interviewProcessNotes: args.interviewProcessNotes,
      compensationNotes: args.compensationNotes,
      notes: args.notes,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateCompany = mutation({
  args: {
    id: v.id("targetCompanies"),
    companyName: v.optional(v.string()),
    tier: v.optional(targetCompanyTier),
    status: v.optional(targetCompanyStatus),
    archived: v.optional(v.boolean()),
    ...optionalTargetFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    await ensureTargetCompany(ctx, args.id, user._id)
    const now = Date.now()
    const website = args.website === undefined ? undefined : canonicalizeUrl(args.website)

    const patch = removeUndefined({
      companyName: args.companyName,
      companyKey: args.companyName === undefined ? undefined : normalizeKey(args.companyName),
      website,
      domain: args.website === undefined ? undefined : getDomain(website),
      tier: args.tier,
      status: args.status,
      targetRoles: args.targetRoles,
      targetLevel: args.targetLevel,
      locationPreference: args.locationPreference,
      workArrangement: args.workArrangement,
      priorityScore: args.priorityScore,
      roleFitScore: args.roleFitScore,
      referralGoal: args.referralGoal,
      applicationWindowStartDate: args.applicationWindowStartDate,
      applicationWindowEndDate: args.applicationWindowEndDate,
      researchNotes: args.researchNotes,
      hiringBarNotes: args.hiringBarNotes,
      interviewProcessNotes: args.interviewProcessNotes,
      compensationNotes: args.compensationNotes,
      notes: args.notes,
      archived: args.archived,
      archivedAt: args.archived === undefined ? undefined : args.archived ? now : undefined,
      updatedAt: now,
    }) as Partial<Doc<"targetCompanies">>

    await ctx.db.patch(args.id, patch)
  },
})

const optionalOutreachFields = {
  targetCompanyId: v.optional(v.id("targetCompanies")),
  applicationId: v.optional(v.id("applications")),
  contactRole: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  email: v.optional(v.string()),
  firstContactedDate: v.optional(v.string()),
  lastContactedDate: v.optional(v.string()),
  followUpDate: v.optional(v.string()),
  messageTemplate: v.optional(v.string()),
  notes: v.optional(v.string()),
}

export const createOutreach = mutation({
  args: {
    contactName: v.string(),
    source: referralOutreachSource,
    status: referralOutreachStatus,
    ...optionalOutreachFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    await ensureTargetCompany(ctx, args.targetCompanyId, user._id)
    await ensureApplication(ctx, args.applicationId, user._id)
    const now = Date.now()

    return await ctx.db.insert("referralOutreach", {
      userId: user._id,
      targetCompanyId: args.targetCompanyId,
      applicationId: args.applicationId,
      contactName: args.contactName,
      contactRole: args.contactRole,
      source: args.source,
      status: args.status,
      linkedinUrl: canonicalizeUrl(args.linkedinUrl),
      email: args.email,
      normalizedEmail: normalizeEmail(args.email),
      firstContactedDate: args.firstContactedDate,
      lastContactedDate: args.lastContactedDate,
      followUpDate: args.followUpDate,
      messageTemplate: args.messageTemplate,
      notes: args.notes,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateOutreach = mutation({
  args: {
    id: v.id("referralOutreach"),
    contactName: v.optional(v.string()),
    source: v.optional(referralOutreachSource),
    status: v.optional(referralOutreachStatus),
    archived: v.optional(v.boolean()),
    ...optionalOutreachFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const outreach = await ctx.db.get(args.id)
    if (!outreach || outreach.userId !== user._id) {
      throw new Error("Referral outreach not found")
    }
    await ensureTargetCompany(ctx, args.targetCompanyId, user._id)
    await ensureApplication(ctx, args.applicationId, user._id)
    const now = Date.now()

    const patch = removeUndefined({
      targetCompanyId: args.targetCompanyId,
      applicationId: args.applicationId,
      contactName: args.contactName,
      contactRole: args.contactRole,
      source: args.source,
      status: args.status,
      linkedinUrl: args.linkedinUrl === undefined ? undefined : canonicalizeUrl(args.linkedinUrl),
      email: args.email,
      normalizedEmail: args.email === undefined ? undefined : normalizeEmail(args.email),
      firstContactedDate: args.firstContactedDate,
      lastContactedDate: args.lastContactedDate,
      followUpDate: args.followUpDate,
      messageTemplate: args.messageTemplate,
      notes: args.notes,
      archived: args.archived,
      archivedAt: args.archived === undefined ? undefined : args.archived ? now : undefined,
      updatedAt: now,
    }) as Partial<Doc<"referralOutreach">>

    await ctx.db.patch(args.id, patch)
  },
})
