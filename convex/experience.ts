import { ConvexError, v } from "convex/values"

import { accomplishmentSchema, validateExtraction } from "../lib/resume-writing"
import { JOB_TIMEOUT_MS, MAX_REVIEW_LENGTH } from "../lib/resume-writing-limits"
import { internal } from "./_generated/api"
import { internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { getOwned, getUserId, requireText, requireUserId } from "./helpers"
import { scheduleInboxRefresh } from "./pipeline"
import { accomplishmentFields, accomplishmentStatus } from "./schema"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const [reviews, accomplishments] = await Promise.all([
      ctx.db
        .query("reviews")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("accomplishments")
        .withIndex("by_user_status", (q) => q.eq("userId", userId))
        .collect(),
    ])
    return {
      reviews: reviews.sort((a, b) => b.createdAt - a.createdAt),
      accomplishments,
    }
  },
})

export const addReview = mutation({
  args: { title: v.string(), company: v.string(), role: v.string(), period: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const fields = Object.fromEntries(
      Object.entries(args).map(([key, value]) => [key, requireText(value, key)]),
    ) as typeof args
    if (fields.text.length > MAX_REVIEW_LENGTH) throw new ConvexError("Keep each review under 50,000 characters.")
    for (const key of ["title", "company", "role", "period"] as const) {
      if (fields[key].length > 200) throw new ConvexError("Keep review labels under 200 characters.")
    }
    const now = Date.now()
    const id = await ctx.db.insert("reviews", {
      ...fields,
      userId,
      status: "extracting",
      version: 1,
      startedAt: now,
      createdAt: now,
    })
    await ctx.scheduler.runAfter(0, internal.experienceNode.extract, { reviewId: id, version: 1 })
    return id
  },
})

export const retryExtraction = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, { reviewId }) => {
    const userId = await requireUserId(ctx)
    const review = await getOwned(ctx, userId, reviewId)
    if (review.status === "ready") throw new ConvexError("This review has already been extracted.")
    if (review.status === "extracting" && Date.now() - review.startedAt < JOB_TIMEOUT_MS) {
      throw new ConvexError("This review is still being extracted.")
    }
    const version = review.version + 1
    await ctx.db.patch(reviewId, { status: "extracting", version, startedAt: Date.now(), error: undefined })
    await ctx.scheduler.runAfter(0, internal.experienceNode.extract, { reviewId, version })
  },
})

export const updateAccomplishment = mutation({
  args: { id: v.id("accomplishments"), ...accomplishmentFields, status: accomplishmentStatus },
  handler: async (ctx, { id, status, ...fields }) => {
    const userId = await requireUserId(ctx)
    const accomplishment = await getOwned(ctx, userId, id)
    const parsed = accomplishmentSchema.safeParse(fields)
    if (!parsed.success) throw new ConvexError("Add a title and description, and keep the original source passage.")
    // Source evidence is immutable; edits and personal clarification belong in the description.
    if (parsed.data.sourceQuote !== accomplishment.sourceQuote)
      throw new ConvexError("The original review passage cannot be changed.")
    await ctx.db.patch(id, {
      ...parsed.data,
      status,
      clarification: status === "confirmed" ? "" : parsed.data.clarification,
      updatedAt: Date.now(),
    })
    if (status === "confirmed" || accomplishment.status === "confirmed") await scheduleInboxRefresh(ctx, userId)
  },
})

export const setAccomplishmentStatus = mutation({
  args: { id: v.id("accomplishments"), status: accomplishmentStatus },
  handler: async (ctx, { id, status }) => {
    const userId = await requireUserId(ctx)
    const accomplishment = await getOwned(ctx, userId, id)
    if (status === "confirmed" && accomplishment.clarification) {
      throw new ConvexError("Edit this accomplishment to clarify your contribution before confirming it.")
    }
    await ctx.db.patch(id, { status, updatedAt: Date.now() })
    // Confirmed experience feeds suggestions, so inbox jobs waiting for it (or using it) are refreshed.
    if (status === "confirmed" || accomplishment.status === "confirmed") await scheduleInboxRefresh(ctx, userId)
  },
})

export const removeReview = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, { reviewId }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, reviewId)
    const accomplishments = await ctx.db
      .query("accomplishments")
      .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
      .collect()
    await Promise.all(accomplishments.map((item) => ctx.db.delete(item._id)))
    await ctx.db.delete(reviewId)
    if (accomplishments.some((item) => item.status === "confirmed")) await scheduleInboxRefresh(ctx, userId)
  },
})

export const getForExtraction = internalQuery({
  args: { reviewId: v.id("reviews"), version: v.number() },
  handler: async (ctx, { reviewId, version }) => {
    const review = await ctx.db.get(reviewId)
    return review?.version === version && review.status === "extracting" ? review : null
  },
})

export const finishExtraction = internalMutation({
  args: { reviewId: v.id("reviews"), version: v.number(), accomplishments: v.array(v.object(accomplishmentFields)) },
  handler: async (ctx, { reviewId, version, accomplishments }) => {
    const review = await ctx.db.get(reviewId)
    if (!review || review.version !== version || review.status !== "extracting") return
    const parsed = validateExtraction(review.text, { accomplishments })
    const seen = new Set<string>()
    for (const item of parsed.accomplishments) {
      const key = item.description.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      await ctx.db.insert("accomplishments", {
        ...item,
        reviewId,
        userId: review.userId,
        status: "draft",
        updatedAt: Date.now(),
      })
    }
    await ctx.db.patch(reviewId, { status: "ready", error: undefined })
  },
})

export const failExtraction = internalMutation({
  args: { reviewId: v.id("reviews"), version: v.number(), error: v.string() },
  handler: async (ctx, { reviewId, version, error }) => {
    const review = await ctx.db.get(reviewId)
    if (review?.version === version && review.status === "extracting") {
      await ctx.db.patch(reviewId, { status: "failed", error })
    }
  },
})
