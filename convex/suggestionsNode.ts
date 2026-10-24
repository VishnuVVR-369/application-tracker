"use node"

import { v } from "convex/values"

import { suggestionsSchema } from "../lib/resume-writing"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"
import { generateWriting, writingError } from "./writingAi"

const instructions = `Suggest focused, useful plain-text edits to this base resume for this job description, using only facts in the base resume and confirmed accomplishment evidence.
Return a short summary and up to 8 prioritized suggestions. Return fewer, or none, when no useful supported edit exists. Do not optimize for an invented ATS score.
Each suggestion has kind replace/add/shorten/remove/reorder, a precise section (including company or project), currentText, suggestedText, reason, accomplishmentIds, and resumeQuote.
For all kinds except add, currentText must be an exact contiguous quote from the base resume. For add, currentText is empty. For remove/reorder, suggestedText is a concrete plain-text instruction. For replace/add/shorten, suggestedText is the actual copyable resume wording.
Cite the exact accomplishmentId values from the supplied evidence for facts you use. When using resume evidence, resumeQuote is an exact contiguous quote from the base resume; otherwise empty. Every suggestion must have at least one accomplishment citation or a resumeQuote.
Never introduce unsupported tools, metrics, years of experience, titles, ownership, or outcomes. Do not turn team results into personal results. Use metrics exactly as confirmed. Missing job requirements do not establish experience.
Respect each accomplishment's company, role, and period: never move experience into another employer or imply technologies were used together without evidence.
Reasons should connect the edit to an actual job requirement. Preserve important existing qualifications and avoid redundant bullets. No whole-resume rewrite, Markdown, or LaTeX.`

export const generate = internalAction({
  args: { id: v.id("resumeSuggestions"), version: v.number() },
  handler: async (ctx, args) => {
    try {
      const inputs = await ctx.runQuery(internal.suggestions.getForGeneration, args)
      if (!inputs) return
      const { data, model } = await generateWriting("resume_suggestions", suggestionsSchema, instructions, inputs)
      await ctx.runMutation(internal.suggestions.finish, { ...args, ...data, model })
    } catch (error) {
      await ctx.runMutation(internal.suggestions.fail, { ...args, error: writingError(error) })
    }
  },
})
