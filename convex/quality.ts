import { v } from "convex/values"

import { mutation } from "./_generated/server"
import { getCurrentUserDoc } from "./users"

export const addItem = mutation({
  args: {
    label: v.string(),
    description: v.optional(v.string()),
    weight: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const existing = await ctx.db
      .query("qualityChecklistItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect()
    const now = Date.now()
    const keyBase = args.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    return await ctx.db.insert("qualityChecklistItems", {
      userId: user._id,
      key: `${keyBase || "custom"}-${Date.now()}`,
      label: args.label,
      description: args.description,
      source: "custom",
      weight: args.weight,
      sortOrder: Math.max(-1, ...existing.map((item) => item.sortOrder)) + 1,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateItem = mutation({
  args: {
    id: v.id("qualityChecklistItems"),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    weight: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const item = await ctx.db.get(args.id)
    if (!item || item.userId !== user._id) {
      throw new Error("Quality item not found")
    }

    await ctx.db.patch(args.id, {
      label: args.label,
      description: args.description,
      weight: args.weight,
      enabled: args.enabled,
      updatedAt: Date.now(),
    })
  },
})

export const reorderItem = mutation({
  args: {
    id: v.id("qualityChecklistItems"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const items = (
      await ctx.db
        .query("qualityChecklistItems")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect()
    ).sort((a, b) => a.sortOrder - b.sortOrder)
    const index = items.findIndex((item) => item._id === args.id)
    const swapIndex = args.direction === "up" ? index - 1 : index + 1

    if (index < 0 || swapIndex < 0 || swapIndex >= items.length) {
      return
    }

    const now = Date.now()
    await ctx.db.patch(items[index]._id, {
      sortOrder: items[swapIndex].sortOrder,
      updatedAt: now,
    })
    await ctx.db.patch(items[swapIndex]._id, {
      sortOrder: items[index].sortOrder,
      updatedAt: now,
    })
  },
})
