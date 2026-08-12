import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { getCurrentUserDoc } from "./users"

const TOKEN_HASH_PATTERN = /^[a-f0-9]{64}$/
const TOKEN_PREFIX_PATTERN = /^wat_[A-Za-z0-9_-]{4,12}$/

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserDoc(ctx)
    const tokens = await ctx.db
      .query("extensionTokens")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect()

    return tokens
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((token) => ({
        _id: token._id,
        _creationTime: token._creationTime,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        createdAt: token.createdAt,
        lastUsedAt: token.lastUsedAt,
        revokedAt: token.revokedAt,
      }))
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const name = args.name.trim()
    const tokenHash = args.tokenHash.trim().toLowerCase()
    const tokenPrefix = args.tokenPrefix.trim()

    if (!name || name.length > 80) {
      throw new Error("Token name must be between 1 and 80 characters")
    }
    if (!TOKEN_HASH_PATTERN.test(tokenHash) || !TOKEN_PREFIX_PATTERN.test(tokenPrefix)) {
      throw new Error("Invalid extension token")
    }

    const existing = await ctx.db
      .query("extensionTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique()
    if (existing) {
      throw new Error("Extension token already exists")
    }

    const now = Date.now()
    return await ctx.db.insert("extensionTokens", {
      userId: user._id,
      name,
      tokenHash,
      tokenPrefix,
      createdAt: now,
    })
  },
})

export const revoke = mutation({
  args: { id: v.id("extensionTokens") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const token = await ctx.db.get(args.id)
    if (!token || token.userId !== user._id) {
      throw new Error("Extension token not found")
    }
    if (token.revokedAt) {
      return
    }
    await ctx.db.patch(token._id, { revokedAt: Date.now() })
  },
})
