"use node"

import { v } from "convex/values"
import { z } from "zod"

import { internal } from "./_generated/api"
import { action, internalAction } from "./_generated/server"
import { generateWriting, RetryableWritingError, writingError } from "./writingAi"

const analysisSchema = z.strictObject({
  score: z.number().int().min(0).max(100),
  verdict: z.string(),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(
    z.strictObject({
      keyword: z.string(),
      importance: z.enum(["required", "preferred"]),
    }),
  ),
})

const instructions = `You compare a candidate's resume against a job description so they know what to change before applying.

Return:
- score: 0-100 for how well the resume, as written, matches what this job asks for. Weigh required qualifications far above nice-to-haves. 85+ means ready to apply as is, 60-84 means worth tailoring, below 60 means a weak fit.
- verdict: one plain sentence (under 25 words) explaining the score.
- matchedKeywords: up to 15 skills, tools, or domain terms from the job description that the resume already shows.
- missingKeywords: up to 15 skills, tools, qualifications, or domain terms the job description asks for that the resume does not show. Mark each "required" if the posting treats it as a must-have, otherwise "preferred". Order by importance, most important first.

Keywords are short (1-4 words) and use the job description's wording, so the candidate can mirror it. Ignore boilerplate such as benefits, equal-opportunity statements, and company marketing. Never invent experience.`

/** The Analyze button in an application's Resume tab, for the selected base resume. */
export const run = action({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const inputs = await ctx.runQuery(internal.analyses.getInputs, { applicationId })
    const { data, model } = await generateWriting("resume_match", analysisSchema, instructions, inputs.prompt)
    await ctx.runMutation(internal.analyses.save, {
      userId: inputs.userId,
      applicationId,
      baseResumeId: inputs.baseResumeId,
      fingerprint: inputs.fingerprint,
      ...data,
      model,
    })
  },
})

/** Scores one base resume for a job in the inbox. Runs on the jobs pool, which retries passing failures. */
export const analyzeForPipeline = internalAction({
  args: { applicationId: v.id("applications"), baseResumeId: v.id("baseResumes"), fingerprint: v.string() },
  handler: async (ctx, args) => {
    const inputs = await ctx.runQuery(internal.analyses.getForPipeline, args)
    if (!inputs) {
      await ctx.runMutation(internal.pipeline.analysisSettled, args)
      return
    }
    try {
      const { data, model } = await generateWriting("resume_match", analysisSchema, instructions, inputs.prompt)
      await ctx.runMutation(internal.analyses.save, { ...args, userId: inputs.userId, ...data, model })
    } catch (error) {
      if (error instanceof RetryableWritingError) throw error
      await ctx.runMutation(internal.pipeline.analysisSettled, { ...args, error: writingError(error) })
    }
  },
})
