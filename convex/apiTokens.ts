import { ConvexError, v, type Infer } from "convex/values"

import { inputFingerprint } from "../lib/resume-writing"
import { internal } from "./_generated/api"
import { action, internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server"
import { getOwned, getUserId, requireText, requireUserId } from "./helpers"
import { apiScope } from "./schema"

/** Every token can save and read collected jobs; scopes exist so later tokens can be narrower or broader. */
const SCOPES = ["jobs:read", "jobs:write"] as const
const MAX_TOKENS = 10
/** lastUsedAt is written at most this often, so a busy run doesn't write on every call. */
const TOUCH_INTERVAL_MS = 60_000

export function hashToken(token: string) {
  return inputFingerprint(`api-token:${token}`)
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const tokens = await ctx.db
      .query("apiTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
    return tokens
      .filter((token) => !token.revokedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(({ _id, name, prefix, scopes, createdAt, lastUsedAt }) => ({ _id, name, prefix, scopes, createdAt, lastUsedAt }))
  },
})

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return `at_${btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`
}

/** Creates a token for the signed-in user and returns it once. Generated in an action, where randomness is unrestricted. */
export const create = action({
  args: { name: v.string() },
  handler: async (ctx, { name }): Promise<string> => {
    const token = newToken()
    await ctx.runMutation(internal.apiTokens.store, { name, tokenHash: await hashToken(token), prefix: token.slice(0, 10) })
    return token
  },
})

/**
 * Issues a token for a user from the command line, for setting up a headless client:
 * `npx convex run apiTokens:issue '{"userId": "...", "name": "Job Scout"}'`. Internal, so no client can call it.
 */
export const issue = internalAction({
  args: { userId: v.string(), name: v.string() },
  handler: async (ctx, { userId, name }): Promise<string> => {
    const token = newToken()
    await ctx.runMutation(internal.apiTokens.storeFor, {
      userId,
      name,
      tokenHash: await hashToken(token),
      prefix: token.slice(0, 10),
    })
    return token
  },
})

const storeArgs = { name: v.string(), tokenHash: v.string(), prefix: v.string() }

export const store = internalMutation({
  args: storeArgs,
  handler: async (ctx, args) => {
    await insertToken(ctx, await requireUserId(ctx), args)
  },
})

export const storeFor = internalMutation({
  args: { userId: v.string(), ...storeArgs },
  handler: async (ctx, { userId, ...args }) => {
    await insertToken(ctx, userId, args)
  },
})

async function insertToken(
  ctx: MutationCtx,
  userId: string,
  { name, tokenHash, prefix }: { name: string; tokenHash: string; prefix: string },
) {
  const active = (
    await ctx.db
      .query("apiTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
  ).filter((token) => !token.revokedAt)
  if (active.length >= MAX_TOKENS) throw new ConvexError(`Revoke a token first; you can have ${MAX_TOKENS}.`)
  await ctx.db.insert("apiTokens", {
    userId,
    name: requireText(name, "Name").slice(0, 80),
    tokenHash,
    prefix,
    scopes: [...SCOPES],
    createdAt: Date.now(),
  })
}

export const revoke = mutation({
  args: { id: v.id("apiTokens") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const token = await getOwned(ctx, userId, id)
    if (!token.revokedAt) await ctx.db.patch(id, { revokedAt: Date.now() })
  },
})

/** The user and scopes behind a token's hash, or null for unknown and revoked tokens. */
export const authenticate = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const token = await ctx.db
      .query("apiTokens")
      .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique()
    if (!token || token.revokedAt) return null
    return { tokenId: token._id, userId: token.userId, scopes: token.scopes, lastUsedAt: token.lastUsedAt }
  },
})

export const touch = internalMutation({
  args: { id: v.id("apiTokens") },
  handler: async (ctx, { id }) => {
    const token = await ctx.db.get(id)
    if (token && !token.revokedAt && Date.now() - (token.lastUsedAt ?? 0) >= TOUCH_INTERVAL_MS) {
      await ctx.db.patch(id, { lastUsedAt: Date.now() })
    }
  },
})

export type ApiScope = Infer<typeof apiScope>
