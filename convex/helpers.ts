import { ConvexError } from "convex/values"

import { cleanCompanyName, companyKey, DEFAULT_FOLLOW_UP_DAYS, DEFAULT_WEEKLY_GOAL } from "../lib/domain"
import type { Id, TableNames } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { authComponent } from "./betterAuth/auth"

type Ctx = QueryCtx | MutationCtx

export async function getUserId(ctx: Ctx) {
  const user = await authComponent.safeGetAuthUser(ctx)
  return user ? String(user._id) : null
}

export async function requireUserId(ctx: Ctx) {
  const userId = await getUserId(ctx)
  if (!userId) throw new ConvexError("You need to sign in first.")
  return userId
}

type OwnedTable = Exclude<TableNames, "userSettings">

/** Loads a document and verifies it belongs to the user, so ids from the client can't reach other accounts. */
export async function getOwned<T extends OwnedTable>(ctx: Ctx, userId: string, id: Id<T>) {
  const doc = await ctx.db.get(id)
  if (!doc || doc.userId !== userId) throw new ConvexError("Not found.")
  return doc
}

export async function findOrCreateCompany(ctx: MutationCtx, userId: string, rawName: string) {
  const name = cleanCompanyName(rawName)
  if (!name) throw new ConvexError("Company name is required.")
  const nameKey = companyKey(name)
  const existing = await ctx.db
    .query("companies")
    .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("nameKey", nameKey))
    .unique()
  if (existing) return existing._id
  return await ctx.db.insert("companies", { userId, name, nameKey })
}

export async function getSettings(ctx: Ctx, userId: string) {
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique()
  return {
    followUpDays: settings?.followUpDays ?? DEFAULT_FOLLOW_UP_DAYS,
    weeklyGoal: settings?.weeklyGoal ?? DEFAULT_WEEKLY_GOAL,
  }
}

export async function getFollowUpDays(ctx: Ctx, userId: string) {
  return (await getSettings(ctx, userId)).followUpDays
}

export function cleanOptional(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function requireText(value: string, field: string) {
  const trimmed = value.trim()
  if (!trimmed) throw new ConvexError(`${field} is required.`)
  return trimmed
}
