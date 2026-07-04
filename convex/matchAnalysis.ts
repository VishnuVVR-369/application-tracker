"use node"

import { v } from "convex/values"
import { extractText, getDocumentProxy } from "unpdf"
import { z } from "zod"

import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { action } from "./_generated/server"

const DEFAULT_MODEL = "gpt-5.5"
const MAX_INPUT_CHARS = 16_000

// Explicit result type: annotating the action's return breaks the circular
// type inference that otherwise degrades the generated `api` types to `any`.
export type MatchAnalysisResult = {
  score: number
  summary: string
  matchedKeywords: string[]
  missingKeywords: string[]
  suggestions: string[]
  model: string
  analyzedAt: number
  resumeId: Id<"resumes">
  resumeLabel: string
}

const analysisSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().min(1),
  matchedKeywords: z.array(z.string()).max(30),
  missingKeywords: z.array(z.string()).max(30),
  suggestions: z.array(z.string()).min(1).max(8),
})

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "summary", "matchedKeywords", "missingKeywords", "suggestions"],
  properties: {
    score: {
      type: "integer",
      description: "0-100 fit between this resume and this job description.",
    },
    summary: {
      type: "string",
      description: "Two or three sentences on overall fit and the biggest gap.",
    },
    matchedKeywords: {
      type: "array",
      items: { type: "string" },
      description: "Important JD skills/requirements the resume clearly evidences.",
    },
    missingKeywords: {
      type: "array",
      items: { type: "string" },
      description: "Important JD skills/requirements the resume does not mention.",
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "3-5 concrete, specific edits to tailor this resume to this JD.",
    },
  },
} as const

async function callOpenAi(args: {
  apiKey: string
  model: string
  companyName: string
  roleTitle: string
  jobDescription: string
  resumeText: string
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert technical recruiter and resume coach. Compare a candidate's resume against a job description the way an ATS keyword screen plus a human recruiter would. Be specific and honest: only list a keyword as matched when the resume genuinely evidences it, and make every suggestion actionable for this exact posting.",
        },
        {
          role: "user",
          content: [
            `Role: ${args.roleTitle} at ${args.companyName}`,
            "",
            "=== JOB DESCRIPTION ===",
            args.jobDescription,
            "",
            "=== RESUME (extracted from PDF) ===",
            args.resumeText,
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "match_analysis",
          strict: true,
          schema: responseJsonSchema,
        },
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(
      `OpenAI request failed (${response.status}). ${detail.slice(0, 300)}`
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = payload.choices?.[0]?.message?.content
  if (!content) {
    throw new Error("OpenAI returned an empty response.")
  }

  const parsed = analysisSchema.safeParse(JSON.parse(content))
  if (!parsed.success) {
    throw new Error("OpenAI returned an unexpected response shape. Try again.")
  }
  return parsed.data
}

/**
 * Extracts text from the application's linked resume PDF, asks OpenAI to
 * grade it against the JD snapshot, and caches the result on the application.
 */
export const analyze = action({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args): Promise<MatchAnalysisResult> => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Run `npx convex env set OPENAI_API_KEY <key>` and try again."
      )
    }

    const context = await ctx.runQuery(internal.matchAnalysisData.getContext, {
      applicationId: args.applicationId,
    })

    const pdfBlob = await ctx.storage.get(context.resume.storageId)
    if (!pdfBlob) {
      throw new Error("The linked resume file could not be loaded from storage.")
    }

    const pdf = await getDocumentProxy(new Uint8Array(await pdfBlob.arrayBuffer()))
    const { text } = await extractText(pdf, { mergePages: true })
    const resumeText = text.replace(/\s+/g, " ").trim()
    if (resumeText.length < 100) {
      throw new Error(
        "Could not extract enough text from the resume PDF — it may be image-based. Re-export it with selectable text."
      )
    }

    const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL
    const analysis = await callOpenAi({
      apiKey,
      model,
      companyName: context.companyName,
      roleTitle: context.roleTitle,
      jobDescription: context.jobDescription.slice(0, MAX_INPUT_CHARS),
      resumeText: resumeText.slice(0, MAX_INPUT_CHARS),
    })

    return await ctx.runMutation(internal.matchAnalysisData.saveResult, {
      applicationId: args.applicationId,
      resumeId: context.resume.id,
      resumeLabel: context.resume.label,
      model,
      score: Math.round(analysis.score),
      summary: analysis.summary,
      matchedKeywords: analysis.matchedKeywords,
      missingKeywords: analysis.missingKeywords,
      suggestions: analysis.suggestions,
    })
  },
})
