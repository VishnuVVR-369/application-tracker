import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { mutation, type MutationCtx } from "./_generated/server"
import { dateKeyFromTimestamp } from "./model"
import { offerDecision } from "./schema"
import { getCurrentUserDoc } from "./users"

const TERMINAL_DECISIONS = ["accepted", "declined", "expired"]

async function ensureOffer(
  ctx: MutationCtx,
  offerId: Id<"applicationOffers">,
  userId: Id<"users">
) {
  const offer = await ctx.db.get(offerId)
  if (!offer || offer.userId !== userId) {
    throw new Error("Offer not found")
  }
  return offer
}

export const setDecision = mutation({
  args: {
    id: v.id("applicationOffers"),
    decision: offerDecision,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const offer = await ensureOffer(ctx, args.id, user._id)

    const now = Date.now()
    await ctx.db.patch(args.id, {
      decision: args.decision,
      decidedAt: TERMINAL_DECISIONS.includes(args.decision) ? now : undefined,
      notes: args.notes ?? offer.notes,
      updatedAt: now,
    })

    await ctx.db.insert("activityEvents", {
      userId: user._id,
      applicationId: offer.applicationId,
      type: "offer_recorded",
      title: `Offer ${args.decision}`,
      source: "auto",
      actorType: "system",
      eventAt: now,
      eventDate: dateKeyFromTimestamp(now),
      relatedEntityType: "offer",
      relatedEntityId: String(args.id),
      createdAt: now,
    })

    await ctx.db.patch(offer.applicationId, { lastActivityAt: now, updatedAt: now })
  },
})

// Promote an older offer version back to the current one (e.g. comparing a
// revised offer against the original and keeping the original).
export const setCurrent = mutation({
  args: { id: v.id("applicationOffers") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const offer = await ensureOffer(ctx, args.id, user._id)

    const now = Date.now()
    const siblings = await ctx.db
      .query("applicationOffers")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", offer.applicationId))
      .collect()
    await Promise.all(
      siblings
        .filter((sibling) => sibling.isCurrent && sibling._id !== args.id)
        .map((sibling) => ctx.db.patch(sibling._id, { isCurrent: false, updatedAt: now }))
    )
    await ctx.db.patch(args.id, { isCurrent: true, updatedAt: now })
  },
})
