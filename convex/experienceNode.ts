"use node"

import { v } from "convex/values"

import { extractionSchema, validateExtraction } from "../lib/resume-writing"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"
import { generateWriting, writingError } from "./writingAi"

const instructions = `Extract distinct accomplishments from this performance review for a reusable experience library.
Return up to 30 concrete accomplishments. Do not manufacture accomplishments from generic praise.
Each needs a short title, factual description, explicitly supported skills, and one verbatim contiguous sourceQuote from the review.
Preserve the distinction between the person's contribution and team results. Never invent ownership, skills, dates, seniority, or metrics.
If personal contribution, attribution, or a metric is unclear, explain the uncertainty in description and ask a targeted question in clarification. Otherwise clarification is an empty string.
Use no more than the source establishes. These are drafts the user will confirm, not finished resume bullets.
Avoid duplicating the same work within this review. If nothing concrete is supported, return an empty accomplishments array.`

export const extract = internalAction({
  args: { reviewId: v.id("reviews"), version: v.number() },
  handler: async (ctx, args) => {
    const review = await ctx.runQuery(internal.experience.getForExtraction, args)
    if (!review) return
    try {
      const { data } = await generateWriting("review_accomplishments", extractionSchema, instructions, {
        company: review.company,
        role: review.role,
        period: review.period,
        review: review.text,
      })
      const validated = validateExtraction(review.text, data)
      await ctx.runMutation(internal.experience.finishExtraction, {
        ...args,
        accomplishments: validated.accomplishments,
      })
    } catch (error) {
      await ctx.runMutation(internal.experience.failExtraction, { ...args, error: writingError(error) })
    }
  },
})
