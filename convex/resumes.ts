import { v } from "convex/values"

import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server"
import { assertUploadedPdf } from "./applications"
import { getOwned, getUserId, requireText, requireUserId } from "./helpers"
import { scheduleInboxRefresh } from "./pipeline"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const resumes = await ctx.db
      .query("baseResumes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
    const rows = await Promise.all(
      resumes.map(async ({ text, ...resume }) => ({
        ...resume,
        wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
        url: await ctx.storage.getUrl(resume.storageId),
      })),
    )
    return rows.sort((a, b) => a.label.localeCompare(b.label))
  },
})

export const create = mutation({
  args: { label: v.string(), storageId: v.id("_storage"), fileName: v.string() },
  handler: async (ctx, { label, storageId, fileName }) => {
    const userId = await requireUserId(ctx)
    await assertUploadedPdf(ctx, storageId)
    const id = await ctx.db.insert("baseResumes", {
      userId,
      label: requireText(label, "Label"),
      storageId,
      fileName: requireText(fileName, "File name"),
      textStatus: "extracting",
      uploadedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.resumesNode.extractText, { id })
    return id
  },
})

export const rename = mutation({
  args: { id: v.id("baseResumes"), label: v.string() },
  handler: async (ctx, { id, label }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await ctx.db.patch(id, { label: requireText(label, "Label") })
  },
})

/** Swaps in a new PDF. Old analyses compared a different resume, so they're dropped. */
export const replaceFile = mutation({
  args: { id: v.id("baseResumes"), storageId: v.id("_storage"), fileName: v.string() },
  handler: async (ctx, { id, storageId, fileName }) => {
    const userId = await requireUserId(ctx)
    const resume = await getOwned(ctx, userId, id)
    await assertUploadedPdf(ctx, storageId)
    await ctx.storage.delete(resume.storageId)
    await deleteAnalysesFor(ctx, id)
    await ctx.db.patch(id, {
      storageId,
      fileName: requireText(fileName, "File name"),
      text: undefined,
      textStatus: "extracting",
      uploadedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.resumesNode.extractText, { id })
  },
})

export const retryExtraction = mutation({
  args: { id: v.id("baseResumes") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await ctx.db.patch(id, { textStatus: "extracting" })
    await ctx.scheduler.runAfter(0, internal.resumesNode.extractText, { id })
  },
})

export const remove = mutation({
  args: { id: v.id("baseResumes") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const resume = await getOwned(ctx, userId, id)
    await deleteAnalysesFor(ctx, id)
    const linked = await ctx.db
      .query("applications")
      .withIndex("by_base_resume", (q) => q.eq("baseResumeId", id))
      .collect()
    await Promise.all(
      linked.map((application) =>
        ctx.db.patch(application._id, { baseResumeId: undefined, baseResumePinned: undefined }),
      ),
    )
    const suggestions = await ctx.db.query("resumeSuggestions").withIndex("by_base_resume", (q) => q.eq("baseResumeId", id)).collect()
    await Promise.all(suggestions.map((item) => ctx.db.delete(item._id)))
    await ctx.storage.delete(resume.storageId)
    await ctx.db.delete(id)
    // Inbox jobs that used this resume pick the best of the rest.
    await scheduleInboxRefresh(ctx, userId)
  },
})

async function deleteAnalysesFor(ctx: MutationCtx, baseResumeId: Id<"baseResumes">) {
  const analyses = await ctx.db
    .query("analyses")
    .withIndex("by_base_resume", (q) => q.eq("baseResumeId", baseResumeId))
    .collect()
  await Promise.all(analyses.map((analysis) => ctx.db.delete(analysis._id)))
}

export const getForExtraction = internalQuery({
  args: { id: v.id("baseResumes") },
  handler: async (ctx, { id }) => {
    const resume = await ctx.db.get(id)
    return resume ? { storageId: resume.storageId } : null
  },
})

export const saveExtraction = internalMutation({
  args: { id: v.id("baseResumes"), storageId: v.id("_storage"), text: v.optional(v.string()) },
  handler: async (ctx, { id, storageId, text }) => {
    const resume = await ctx.db.get(id)
    // The file may have been replaced while extraction ran; only the latest upload's result counts.
    if (!resume || resume.storageId !== storageId) return
    await ctx.db.patch(id, text ? { text, textStatus: "ready" } : { text: undefined, textStatus: "failed" })
    // A new or replaced resume is scored against the jobs waiting in the inbox.
    if (text) await scheduleInboxRefresh(ctx, resume.userId)
  },
})
