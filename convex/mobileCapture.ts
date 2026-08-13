import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { createApplicationRecord } from "./applications"
import { canonicalizePostingUrl, POSTING_URL_CANONICAL_VERSION } from "./model"
import { applicationSource, workArrangement } from "./schema"
import { userLocalDateKey } from "./userDate"
import { getCurrentUserDoc } from "./users"

const captureArgs = {
  postingUrl: v.string(),
  companyName: v.string(),
  roleTitle: v.string(),
  stage: v.union(v.literal("saved"), v.literal("applied")),
  location: v.optional(v.string()),
  workArrangement: v.optional(workArrangement),
  source: v.optional(applicationSource),
  currentResumeId: v.optional(v.id("resumes")),
  jobDescriptionSnapshot: v.optional(v.string()),
  notes: v.optional(v.string()),
}

function requiredText(value: string, label: string, maxLength: number) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} is required`)
  if (normalized.length > maxLength) throw new Error(`${label} is too long`)
  return normalized
}

function optionalText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim()
  if (!normalized) return undefined
  if (normalized.length > maxLength) throw new Error("Capture field is too long")
  return normalized
}

function inferSource(postingUrl: string): Doc<"applications">["source"] {
  const hostname = new URL(postingUrl).hostname.toLowerCase()
  if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) return "linkedin"
  if (hostname === "indeed.com" || hostname.endsWith(".indeed.com")) return "indeed"
  if (hostname === "wellfound.com" || hostname.endsWith(".wellfound.com")) return "wellfound"
  return "other"
}

function result(application: Doc<"applications">) {
  return {
    applicationId: application._id,
    companyName: application.companyName,
    roleTitle: application.roleTitle,
    stage: application.stage,
    archived: application.archived,
  }
}

async function findByCanonicalUrl(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  postingUrl: string
) {
  if (postingUrl.length > 2_048) throw new Error("Posting URL is too long")
  const canonical = canonicalizePostingUrl(postingUrl)
  if (!canonical) throw new Error("Enter a valid HTTP or HTTPS posting URL")

  const outdated = await ctx.db
    .query("applications")
    .withIndex("by_userId_and_postingUrlCanonicalVersion", (q) =>
      q
        .eq("userId", userId)
        .lt("postingUrlCanonicalVersion", POSTING_URL_CANONICAL_VERSION)
    )
    .first()
  if (outdated) throw new Error("Application links are still being prepared. Try again shortly.")

  const application = await ctx.db
    .query("applications")
    .withIndex("by_userId_and_postingUrlCanonical", (q) =>
      q.eq("userId", userId).eq("postingUrlCanonical", canonical)
    )
    .first()
  return { canonical, application }
}

export const prepareCanonicalUrls = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserDoc(ctx)
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_userId_and_postingUrlCanonicalVersion", (q) =>
        q
          .eq("userId", user._id)
          .lt("postingUrlCanonicalVersion", POSTING_URL_CANONICAL_VERSION)
      )
      .take(50)

    for (const application of applications) {
      await ctx.db.patch(application._id, {
        postingUrlCanonical: canonicalizePostingUrl(application.postingUrl),
        postingUrlCanonicalVersion: POSTING_URL_CANONICAL_VERSION,
      })
    }

    return { done: applications.length < 50 }
  },
})

export const findDuplicate = query({
  args: { postingUrl: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const existing = (await findByCanonicalUrl(ctx, user._id, args.postingUrl)).application
    return existing ? result(existing) : null
  },
})

export const create = mutation({
  args: captureArgs,
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const { canonical, application: existing } = await findByCanonicalUrl(
      ctx,
      user._id,
      args.postingUrl
    )
    if (existing) return { status: "exists" as const, application: result(existing) }

    const now = Date.now()
    const today = await userLocalDateKey(ctx, user._id, now)
    const applicationId = await createApplicationRecord(ctx, user, {
      postingUrl: canonical,
      postingCapturedAt: now,
      companyName: requiredText(args.companyName, "Company", 300),
      roleTitle: requiredText(args.roleTitle, "Role", 300),
      stage: args.stage,
      location: optionalText(args.location, 300),
      workArrangement: args.workArrangement,
      source: args.source ?? inferSource(canonical),
      sourceSystem: "mobile_share",
      currentResumeId: args.currentResumeId,
      jobDescriptionSnapshot: optionalText(args.jobDescriptionSnapshot, 50_000),
      notes: optionalText(args.notes, 10_000),
      dateSavedDate: today,
      dateAppliedDate: args.stage === "applied" ? today : undefined,
    })
    const application = await ctx.db.get(applicationId)
    if (!application) throw new Error("Could not create application")
    return { status: "created" as const, application: result(application) }
  },
})
