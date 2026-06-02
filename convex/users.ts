import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { normalizeEmail } from "./model"

const DEFAULT_TIMEZONE = "UTC"

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

async function findUserByIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  const bySubject = await ctx.db
    .query("users")
    .withIndex("by_authSubject", (q) => q.eq("authSubject", identity.subject))
    .unique()

  if (bySubject) {
    return { identity, user: bySubject }
  }

  return { identity, user: null }
}

export async function getCurrentUserDoc(ctx: QueryCtx | MutationCtx) {
  const result = await findUserByIdentity(ctx)
  if (!result?.identity) {
    throw new Error("Not authenticated")
  }
  if (!result.user) {
    throw new Error("User profile not found")
  }
  return result.user
}

export async function getCurrentUserDocOrNull(ctx: QueryCtx | MutationCtx) {
  const result = await findUserByIdentity(ctx)
  return result?.user ?? null
}

async function ensureSettings(
  ctx: MutationCtx,
  userId: Id<"users">,
  displayName?: string,
  timezone?: string
) {
  const existing = await ctx.db
    .query("userSettings")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  const now = Date.now()

  if (!existing) {
    await ctx.db.insert("userSettings", {
      userId,
      displayName,
      theme: "dark",
      timezone: timezone ?? DEFAULT_TIMEZONE,
      weekStartsOn: "monday",
      createdAt: now,
      updatedAt: now,
    })
    return
  }

  await ctx.db.patch(existing._id, {
    displayName: displayName ?? existing.displayName,
    theme: existing.theme,
    timezone: timezone ?? existing.timezone,
    weekStartsOn: "monday",
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

  const now = Date.now()
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

export async function ensureCurrentUserDoc(
  ctx: MutationCtx,
  options?: { timezone?: string }
): Promise<Doc<"users">> {
  const result = await findUserByIdentity(ctx)
  if (!result?.identity) {
    throw new Error("Not authenticated")
  }

  const { identity } = result
  const now = Date.now()
  const patch = {
    authSubject: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    name: identity.name,
    email: identity.email,
    normalizedEmail: normalizeEmail(identity.email),
    imageUrl: identity.pictureUrl,
    lastSeenAt: now,
    updatedAt: now,
  }

  if (result.user) {
    await ctx.db.patch(result.user._id, patch)
    await ensureSettings(ctx, result.user._id, identity.name, options?.timezone)
    await ensureQualityDefaults(ctx, result.user._id)
    return (await ctx.db.get(result.user._id)) as Doc<"users">
  }

  const userId = await ctx.db.insert("users", {
    ...patch,
    createdAt: now,
  })
  await ensureSettings(ctx, userId, identity.name, options?.timezone)
  await ensureQualityDefaults(ctx, userId)
  return (await ctx.db.get(userId)) as Doc<"users">
}

export const ensureCurrent = mutation({
  args: {
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ensureCurrentUserDoc(ctx, { timezone: args.timezone })
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
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUserDoc(ctx)
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique()
    const now = Date.now()

    if (!settings) {
      await ctx.db.insert("userSettings", {
        userId: user._id,
        displayName: args.displayName ?? user.name,
        theme: args.theme ?? "dark",
        timezone: args.timezone ?? DEFAULT_TIMEZONE,
        weekStartsOn: "monday",
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
