import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"

const DEFAULT_QUALITY_ITEMS = [
  {
    key: "role-fit",
    label: "Role and level are a strong fit.",
    description: "The role scope matches current experience and target level.",
    weight: 25,
  },
  {
    key: "tailored-resume",
    label: "Resume is tailored to the posting.",
    description: "The resume uses language and evidence from this posting.",
    weight: 25,
  },
  {
    key: "skills-reflected",
    label: "Required skills are reflected in the resume.",
    description: "Important skills are represented with real examples.",
    weight: 20,
  },
  {
    key: "referral-checked",
    label: "Referral path has been checked or acted on.",
    description: "A referral route was checked, requested, or ruled out.",
    weight: 15,
  },
  {
    key: "materials-complete",
    label: "Application materials are complete and specific.",
    description: "The submission has tailored notes, cover copy, or answers where needed.",
    weight: 15,
  },
]

export async function getCurrentUserDoc(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Not authenticated")
  }

  const byToken = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique()

  if (byToken) {
    return byToken
  }

  const byAuthId = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()

  if (!byAuthId) {
    throw new Error("User profile not found")
  }

  return byAuthId
}

export async function getCurrentUserDocOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique()
}

async function ensureSettings(ctx: MutationCtx, userId: Id<"users">, displayName?: string) {
  const existing = await ctx.db
    .query("userSettings")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()

  if (!existing) {
    const now = new Date().toISOString()
    await ctx.db.insert("userSettings", {
      userId,
      displayName,
      theme: "dark",
      createdAt: now,
      updatedAt: now,
    })
    return
  }

  const now = new Date().toISOString()
  await ctx.db.patch(existing._id, {
    displayName: existing.displayName ?? displayName,
    theme: existing.theme ?? "dark",
    updatedAt: now,
  })
}

async function ensureQualityDefaults(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("qualityChecklistItems")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first()

  if (existing) {
    return
  }

  const now = new Date().toISOString()
  await Promise.all(
    DEFAULT_QUALITY_ITEMS.map((item, index) =>
      ctx.db.insert("qualityChecklistItems", {
        userId,
        key: item.key,
        label: item.label,
        description: item.description,
        source: "default",
        weight: item.weight,
        sortOrder: index,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })
    )
  )
}

export async function ensureCurrentUserDoc(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Not authenticated")
  }

  const now = new Date().toISOString()
  const existing = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique()

  if (existing) {
    await ctx.db.patch(existing._id, {
      authUserId: identity.subject,
      name: identity.name,
      email: identity.email,
      imageUrl: identity.pictureUrl,
      updatedAt: now,
    })
    await ensureSettings(ctx, existing._id, identity.name)
    await ensureQualityDefaults(ctx, existing._id)
    return (await ctx.db.get(existing._id)) as Doc<"users">
  }

  const userId = await ctx.db.insert("users", {
    authUserId: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    name: identity.name,
    email: identity.email,
    imageUrl: identity.pictureUrl,
    createdAt: now,
    updatedAt: now,
  })
  await ensureSettings(ctx, userId, identity.name)
  await ensureQualityDefaults(ctx, userId)
  return (await ctx.db.get(userId)) as Doc<"users">
}

export const ensureCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensureCurrentUserDoc(ctx)
  },
})

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserDocOrNull(ctx)
    if (!user) {
      return null
    }
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique()

    return { user, settings }
  },
})

export const updateSettings = mutation({
  args: {
    displayName: v.optional(v.string()),
    theme: v.optional(v.union(v.literal("dark"), v.literal("light"), v.literal("system"))),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUserDoc(ctx)
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique()
    const now = new Date().toISOString()

    if (!settings) {
      await ctx.db.insert("userSettings", {
        userId: user._id,
        displayName: args.displayName ?? user.name,
        theme: args.theme ?? "dark",
        createdAt: now,
        updatedAt: now,
      })
      return
    }

    await ctx.db.patch(settings._id, {
      ...args,
      updatedAt: now,
    })
  },
})
