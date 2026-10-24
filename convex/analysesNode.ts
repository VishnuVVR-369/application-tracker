"use node"

import { ConvexError, v } from "convex/values"
import { z } from "zod"

import { internal } from "./_generated/api"
import { action } from "./_generated/server"

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

export const run = action({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const inputs = await ctx.runQuery(internal.analyses.getInputs, { applicationId })
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new ConvexError("Set OPENAI_API_KEY in your Convex environment to analyze resumes.")
    const model = process.env.OPENAI_MODEL ?? "gpt-5.5"

    let response: Response
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: instructions },
            {
              role: "user",
              content: `Role: ${inputs.role} at ${inputs.company}\n\n<job_description>\n${inputs.jobDescription}\n</job_description>\n\n<resume>\n${inputs.resumeText}\n</resume>`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "resume_match", strict: true, schema: z.toJSONSchema(analysisSchema, { target: "draft-7" }) },
          },
        }),
      })
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new ConvexError("The analysis timed out. Please try again.")
      }
      throw new ConvexError("Couldn't reach OpenAI. Please try again.")
    }
    if (!response.ok) {
      console.error("OpenAI error", response.status, await response.text())
      if (response.status === 429) throw new ConvexError("OpenAI is rate limiting or out of quota. Try again later.")
      if (response.status === 401) throw new ConvexError("OpenAI rejected the API key. Check OPENAI_API_KEY.")
      throw new ConvexError(`OpenAI request failed (${response.status}). Please try again.`)
    }

    const completion = (await response.json()) as {
      choices?: { message?: { content?: string | null; refusal?: string | null } }[]
    }
    const message = completion.choices?.[0]?.message
    if (message?.refusal) throw new ConvexError("The model declined to analyze this resume.")
    const parsed = analysisSchema.safeParse(JSON.parse(message?.content ?? "null"))
    if (!parsed.success) throw new ConvexError("Got an unexpected response from OpenAI. Please try again.")

    await ctx.runMutation(internal.analyses.save, {
      userId: inputs.userId,
      applicationId,
      baseResumeId: inputs.baseResumeId,
      ...parsed.data,
      model,
    })
  },
})
