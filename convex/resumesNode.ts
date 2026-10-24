"use node"

import { v } from "convex/values"
import { extractText as extractPdfText, getDocumentProxy } from "unpdf"

import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

export const extractText = internalAction({
  args: { id: v.id("baseResumes") },
  handler: async (ctx, { id }) => {
    const resume = await ctx.runQuery(internal.resumes.getForExtraction, { id })
    if (!resume) return
    let text: string | undefined
    try {
      const blob = await ctx.storage.get(resume.storageId)
      if (blob) {
        const pdf = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()))
        const result = await extractPdfText(pdf, { mergePages: true })
        text = result.text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() || undefined
      }
    } catch (error) {
      console.error("PDF text extraction failed", error)
    }
    await ctx.runMutation(internal.resumes.saveExtraction, { id, storageId: resume.storageId, text })
  },
})
