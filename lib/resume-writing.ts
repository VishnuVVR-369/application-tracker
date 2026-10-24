import { z } from "zod"

export const accomplishmentSchema = z.strictObject({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(3000),
  skills: z.array(z.string().trim().min(1).max(80)).max(20),
  sourceQuote: z.string().trim().min(1).max(4000),
  clarification: z.string().trim().max(1000),
})

export const extractionSchema = z.strictObject({
  accomplishments: z.array(accomplishmentSchema).max(30),
})

export const suggestionSchema = z.strictObject({
  kind: z.enum(["replace", "add", "shorten", "remove", "reorder"]),
  section: z.string().trim().min(1).max(200),
  currentText: z.string().trim().max(4000),
  suggestedText: z.string().trim().min(1).max(4000),
  reason: z.string().trim().min(1).max(1500),
  accomplishmentIds: z.array(z.string()).max(10),
  resumeQuote: z.string().trim().max(4000),
})

export const suggestionsSchema = z.strictObject({
  summary: z.string().trim().min(1).max(1500),
  suggestions: z.array(suggestionSchema).max(8),
})

export function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

export function containsQuote(source: string, quote: string) {
  const normalized = normalizeText(quote)
  return normalized.length > 0 && normalizeText(source).includes(normalized)
}

/** Validate citations before generated text can enter the library or a saved suggestion. */
export function validateExtraction(text: string, value: unknown) {
  const parsed = extractionSchema.parse(value)
  if (parsed.accomplishments.some((item) => !containsQuote(text, item.sourceQuote))) {
    throw new Error("The extracted evidence did not match the review. Try extracting again.")
  }
  return parsed
}

export function validateSuggestions(resumeText: string, confirmedIds: string[], value: unknown) {
  const parsed = suggestionsSchema.parse(value)
  const allowedIds = new Set(confirmedIds)
  for (const suggestion of parsed.suggestions) {
    if (suggestion.accomplishmentIds.some((id) => !allowedIds.has(id))) {
      throw new Error("A suggestion cited an unconfirmed accomplishment. Generate suggestions again.")
    }
    if (suggestion.resumeQuote && !containsQuote(resumeText, suggestion.resumeQuote)) {
      throw new Error("A suggestion's evidence did not match the base resume. Generate suggestions again.")
    }
    if (!suggestion.accomplishmentIds.length && !suggestion.resumeQuote) {
      throw new Error("A suggestion was missing supporting evidence. Generate suggestions again.")
    }
    if (suggestion.kind !== "add" && !containsQuote(resumeText, suggestion.currentText)) {
      throw new Error("A suggestion's original text did not match the base resume. Generate suggestions again.")
    }
  }
  return parsed
}

export async function inputFingerprint(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}
