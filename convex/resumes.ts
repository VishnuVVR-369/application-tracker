import { v } from "convex/values"

import { mutation } from "./_generated/server"
import { getCurrentUserDoc } from "./users"

const MAX_RESUME_BYTES = 10 * 1024 * 1024

function validateResumeMetadata(args: {
  fileName: string
  mimeType: string
  sizeBytes: number
}) {
  if (!args.fileName.toLowerCase().endsWith(".pdf")) {
    throw new Error("Resume upload must use a .pdf extension")
  }
  if (args.mimeType !== "application/pdf") {
    throw new Error("Resume upload must be application/pdf")
  }
  if (args.sizeBytes > MAX_RESUME_BYTES) {
    throw new Error("Resume upload must be 10 MB or smaller")
  }
  if (args.sizeBytes < 0) {
    throw new Error("Resume size must be non-negative")
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserDoc(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const create = mutation({
  args: {
    label: v.string(),
    fileName: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.literal("application/pdf"),
    sizeBytes: v.number(),
    fileHash: v.optional(v.string()),
    notes: v.optional(v.string()),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    validateResumeMetadata(args)
    const now = Date.now()

    if (args.isDefault) {
      const defaults = await ctx.db
        .query("resumes")
        .withIndex("by_userId_and_isDefault", (q) =>
          q.eq("userId", user._id).eq("isDefault", true)
        )
        .collect()
      await Promise.all(
        defaults.map((resume) =>
          ctx.db.patch(resume._id, { isDefault: false, updatedAt: now })
        )
      )
    }

    return await ctx.db.insert("resumes", {
      userId: user._id,
      label: args.label,
      fileName: args.fileName,
      storageId: args.storageId,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      fileHash: args.fileHash,
      notes: args.notes,
      isDefault: args.isDefault,
      defaultedAt: args.isDefault ? now : undefined,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("resumes"),
    label: v.optional(v.string()),
    notes: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const resume = await ctx.db.get(args.id)
    if (!resume || resume.userId !== user._id) {
      throw new Error("Resume not found")
    }

    const now = Date.now()
    if (args.isDefault) {
      const defaults = await ctx.db
        .query("resumes")
        .withIndex("by_userId_and_isDefault", (q) =>
          q.eq("userId", user._id).eq("isDefault", true)
        )
        .collect()
      await Promise.all(
        defaults
          .filter((item) => item._id !== args.id)
          .map((item) => ctx.db.patch(item._id, { isDefault: false, updatedAt: now }))
      )
    }

    await ctx.db.patch(
      args.id,
      Object.fromEntries(
        Object.entries({
          label: args.label,
          notes: args.notes,
          archived: args.archived,
          archivedAt:
            args.archived === undefined
              ? undefined
              : args.archived
                ? resume.archivedAt ?? now
                : undefined,
          isDefault: args.archived ? false : args.isDefault,
          defaultedAt: args.isDefault ? now : undefined,
          updatedAt: now,
        }).filter((entry) => entry[1] !== undefined)
      )
    )
  },
})

export const setDefault = mutation({
  args: { id: v.id("resumes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const resume = await ctx.db.get(args.id)
    if (!resume || resume.userId !== user._id || resume.archived) {
      throw new Error("Resume not found")
    }

    const now = Date.now()
    const resumes = await ctx.db
      .query("resumes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect()
    await Promise.all(
      resumes.map((item) =>
        ctx.db.patch(item._id, {
          isDefault: item._id === args.id,
          defaultedAt: item._id === args.id ? now : item.defaultedAt,
          updatedAt: now,
        })
      )
    )
  },
})
