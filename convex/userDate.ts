import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"

export function dateKeyInTimeZone(timestamp: number, timeZone: string) {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(timestamp)
  } catch {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(timestamp)
  }
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export async function userLocalDateKey(
  ctx: MutationCtx,
  userId: Id<"users">,
  timestamp: number
) {
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  return dateKeyInTimeZone(timestamp, settings?.timezone ?? "UTC")
}
