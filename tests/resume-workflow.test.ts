/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import type { UserIdentity } from "convex/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api, internal } from "../convex/_generated/api"
import schema from "../convex/schema"
import { containsQuote, inputFingerprint, validateExtraction, validateSuggestions } from "../lib/resume-writing"

// Stub only the external Better Auth identity lookup. Real functions, indexes,
// ownership checks, storage, scheduling, schema validation, and writes run in convex-test.
vi.mock("../convex/betterAuth/auth", () => ({
  authComponent: {
    safeGetAuthUser: async (ctx: { auth: { getUserIdentity: () => Promise<UserIdentity | null> } }) => {
      const identity = await ctx.auth.getUserIdentity()
      return identity ? { _id: identity.subject } : null
    },
  },
}))

const modules = import.meta.glob("../convex/**/*.{ts,js}")
const reviewText =
  "I implemented request tracing for the payments API using OpenTelemetry. Our team reduced incident investigation time by 40%."
const draft = {
  title: "Payments request tracing",
  description: "Implemented request tracing for the payments API using OpenTelemetry.",
  skills: ["OpenTelemetry"],
  sourceQuote: "I implemented request tracing for the payments API using OpenTelemetry.",
  clarification: "",
}
const baseText = "Backend Engineer at Example. Built the payments API. Skills: TypeScript."
const reviewFields = {
  title: "Q3 review",
  company: "Example",
  role: "Backend Engineer",
  period: "Q3 2026",
  text: reviewText,
}

function completion(data: unknown) {
  return new Response(
    JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(data) } }] }),
    { status: 200 },
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("OPENAI_API_KEY", "test-key")
  vi.stubEnv("OPENAI_MODEL", "test-model")
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function seed() {
  const t = convexTest(schema, modules)
  const owner = t.withIdentity({ subject: "owner" })
  const other = t.withIdentity({ subject: "other" })
  const ids = await t.run(async (ctx) => {
    const companyId = await ctx.db.insert("companies", { userId: "owner", name: "Example", nameKey: "example" })
    const storageId = await ctx.storage.store(new Blob(["%PDF-test"], { type: "application/pdf" }))
    const baseResumeId = await ctx.db.insert("baseResumes", {
      userId: "owner",
      label: "Backend",
      storageId,
      fileName: "backend.pdf",
      text: baseText,
      textStatus: "ready",
      uploadedAt: Date.now(),
    })
    const applicationId = await ctx.db.insert("applications", {
      userId: "owner",
      companyId,
      role: "Backend Engineer",
      source: "company_site",
      jobDescription:
        "Build reliable backend services and APIs. Experience with distributed tracing, observability and TypeScript is required.",
      notes: "",
      status: "saved",
      savedAt: Date.now(),
      statusChangedAt: Date.now(),
      baseResumeId,
    })
    const reviewId = await ctx.db.insert("reviews", {
      ...reviewFields,
      userId: "owner",
      status: "ready",
      version: 1,
      startedAt: Date.now(),
      createdAt: Date.now(),
    })
    const accomplishmentId = await ctx.db.insert("accomplishments", {
      ...draft,
      reviewId,
      userId: "owner",
      status: "confirmed",
      updatedAt: Date.now(),
    })
    return { applicationId, baseResumeId, reviewId, accomplishmentId }
  })
  const suggestion = {
    kind: "replace" as const,
    section: "Experience → Example",
    currentText: "Built the payments API.",
    suggestedText: "Implemented OpenTelemetry request tracing for the payments API.",
    reason: "Demonstrates the distributed tracing experience requested by the job.",
    accomplishmentIds: [ids.accomplishmentId],
    resumeQuote: "Built the payments API.",
  }
  return { t, owner, other, ...ids, suggestion }
}

describe("review and confirmation workflow", () => {
  it("extracts pasted reviews in the background as drafts and retains their source", async () => {
    const t = convexTest(schema, modules)
    const owner = t.withIdentity({ subject: "owner" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => completion({ accomplishments: [draft] })),
    )
    const reviewId = await owner.mutation(api.experience.addReview, reviewFields)
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const library = await owner.query(api.experience.list)
    expect(library?.reviews[0]).toMatchObject({ _id: reviewId, text: reviewText, status: "ready" })
    expect(library?.accomplishments).toHaveLength(1)
    expect(library?.accomplishments[0]).toMatchObject({ ...draft, status: "draft", reviewId })
    expect(await t.query(api.experience.list)).toBeNull()
    await expect(t.mutation(api.experience.addReview, reviewFields)).rejects.toThrow("sign in")
  })

  it("fails unsupported source quotes and allows a clean retry without duplicate accomplishments", async () => {
    const t = convexTest(schema, modules)
    const owner = t.withIdentity({ subject: "owner" })
    const fetchMock = vi.fn(async () =>
      completion({ accomplishments: [{ ...draft, sourceQuote: "Invented a 90% improvement" }] }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const reviewId = await owner.mutation(api.experience.addReview, reviewFields)
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect((await owner.query(api.experience.list))?.reviews[0].status).toBe("failed")
    expect((await owner.query(api.experience.list))?.accomplishments).toHaveLength(0)
    fetchMock.mockImplementation(async () => completion({ accomplishments: [draft, draft] }))
    await owner.mutation(api.experience.retryExtraction, { reviewId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect((await owner.query(api.experience.list))?.accomplishments).toHaveLength(1)
    await expect(owner.mutation(api.experience.retryExtraction, { reviewId })).rejects.toThrow("already been extracted")
  })

  it("requires clarification before direct confirmation and keeps source passages immutable", async () => {
    const { t, owner, accomplishmentId } = await seed()
    await t.run(async (ctx) => {
      await ctx.db.patch(accomplishmentId, { status: "draft", clarification: "What did you personally own?" })
    })
    await expect(
      owner.mutation(api.experience.setAccomplishmentStatus, { id: accomplishmentId, status: "confirmed" }),
    ).rejects.toThrow("clarify")
    await expect(
      owner.mutation(api.experience.updateAccomplishment, {
        id: accomplishmentId,
        ...draft,
        sourceQuote: "A new metric",
        status: "confirmed",
      }),
    ).rejects.toThrow("cannot be changed")
    await owner.mutation(api.experience.updateAccomplishment, {
      id: accomplishmentId,
      ...draft,
      description: "I implemented tracing; the team reported the incident-time improvement.",
      status: "confirmed",
    })
    expect((await owner.query(api.experience.list))?.accomplishments[0]).toMatchObject({
      status: "confirmed",
      clarification: "",
      sourceQuote: draft.sourceQuote,
    })
    await owner.mutation(api.experience.setAccomplishmentStatus, { id: accomplishmentId, status: "draft" })
    expect((await owner.query(api.experience.list))?.accomplishments[0].status).toBe("draft")
  })

  it("isolates libraries and rejects cross-user edits, review deletion, and resume generation", async () => {
    const { owner, other, reviewId, accomplishmentId, applicationId, baseResumeId } = await seed()
    expect((await other.query(api.experience.list))?.reviews).toHaveLength(0)
    expect((await owner.query(api.experience.list))?.reviews).toHaveLength(1)
    await expect(other.mutation(api.experience.removeReview, { reviewId })).rejects.toThrow("Not found")
    await expect(
      other.mutation(api.experience.setAccomplishmentStatus, { id: accomplishmentId, status: "confirmed" }),
    ).rejects.toThrow("Not found")
    await expect(
      other.mutation(api.experience.updateAccomplishment, { id: accomplishmentId, ...draft, status: "confirmed" }),
    ).rejects.toThrow("Not found")
    expect(await other.query(api.suggestions.forResume, { applicationId, baseResumeId })).toBeNull()
    await expect(other.mutation(api.suggestions.generate, { applicationId, baseResumeId })).rejects.toThrow("Not found")
  })
})

describe("application suggestions", () => {
  it("uses only confirmed experience, saves evidence snapshots, and shares the library across applications", async () => {
    const { t, owner, reviewId, applicationId, baseResumeId, accomplishmentId, suggestion } = await seed()
    await t.run(async (ctx) => {
      await ctx.db.insert("accomplishments", {
        ...draft,
        title: "Unconfirmed",
        description: "Unconfirmed draft detail",
        reviewId,
        userId: "owner",
        status: "draft",
        updatedAt: Date.now(),
      })
      await ctx.db.insert("accomplishments", {
        ...draft,
        title: "Dismissed",
        description: "Dismissed detail",
        reviewId,
        userId: "owner",
        status: "dismissed",
        updatedAt: Date.now(),
      })
    })
    const fetchMock = vi.fn(async () => completion({ summary: "Emphasize observability.", suggestions: [suggestion] }))
    vi.stubGlobal("fetch", fetchMock)
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const saved = await owner.query(api.suggestions.forResume, { applicationId, baseResumeId })
    expect(saved).toMatchObject({ stale: false, confirmedCount: 1, job: { status: "ready" } })
    expect(saved?.job?.result?.suggestions[0].evidence[0]).toMatchObject({
      accomplishmentId,
      sourceQuote: draft.sourceQuote,
      reviewTitle: "Q3 review",
      role: "Backend Engineer",
    })
    const request = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    const prompt = JSON.parse(request.messages[1].content)
    expect(prompt.evidence.map((item: { accomplishmentId: string }) => item.accomplishmentId)).toEqual([
      accomplishmentId,
    ])
    expect(JSON.stringify(prompt)).not.toContain("Unconfirmed draft detail")
    expect(JSON.stringify(prompt)).not.toContain("Dismissed detail")
    const secondApplicationId = await t.run(async (ctx) => {
      const application = await ctx.db.get(applicationId)
      if (!application) throw new Error("Missing fixture")
      const { _id, _creationTime, ...fields } = application
      void _id
      void _creationTime
      return ctx.db.insert("applications", { ...fields, role: "Platform Engineer" })
    })
    await owner.mutation(api.suggestions.generate, { applicationId: secondApplicationId, baseResumeId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(
      (await owner.query(api.suggestions.forResume, { applicationId: secondApplicationId, baseResumeId }))?.job?.result
        ?.suggestions,
    ).toHaveLength(1)
    expect(
      (await owner.query(api.experience.list))?.accomplishments.filter((item) => item.status === "confirmed"),
    ).toHaveLength(1)
  })

  it("detects outdated inputs and retains saved evidence after a review is deleted", async () => {
    const { t, owner, reviewId, applicationId, baseResumeId, suggestion } = await seed()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => completion({ summary: "Emphasize observability.", suggestions: [suggestion] })),
    )
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await t.run(async (ctx) => {
      await ctx.db.patch(applicationId, {
        jobDescription:
          "Updated role asking for more observability work and the operation of reliable distributed services.",
      })
    })
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.stale).toBe(true)
    await owner.mutation(api.experience.removeReview, { reviewId })
    const saved = await owner.query(api.suggestions.forResume, { applicationId, baseResumeId })
    expect(saved?.confirmedCount).toBe(0)
    expect(saved?.job?.result?.suggestions[0].evidence[0].sourceQuote).toBe(draft.sourceQuote)
    expect((await owner.query(api.experience.list))?.accomplishments).toHaveLength(0)
  })

  it("rejects in-flight results when evidence changes and rejects old generation versions", async () => {
    const { t, owner, applicationId, baseResumeId, accomplishmentId, suggestion } = await seed()
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    const job = (await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))!.job!
    await owner.mutation(api.experience.setAccomplishmentStatus, { id: accomplishmentId, status: "draft" })
    await t.mutation(internal.suggestions.finish, {
      id: job._id,
      version: job.version,
      summary: "Old output",
      suggestions: [suggestion],
      model: "test-model",
    })
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.job).toMatchObject({
      status: "failed",
      error: expect.stringContaining("changed during generation"),
    })
    await t.mutation(internal.suggestions.finish, {
      id: job._id,
      version: job.version - 1,
      summary: "Old output",
      suggestions: [suggestion],
      model: "test-model",
    })
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.job?.result).toBeUndefined()
  })

  it("preserves previous suggestions when regeneration returns fabricated citations", async () => {
    const { t, owner, applicationId, baseResumeId, suggestion } = await seed()
    const fetchMock = vi.fn(async () => completion({ summary: "Valid output", suggestions: [suggestion] }))
    vi.stubGlobal("fetch", fetchMock)
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    fetchMock.mockImplementation(async () =>
      completion({ summary: "Invalid output", suggestions: [{ ...suggestion, accomplishmentIds: ["invented"] }] }),
    )
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const saved = await owner.query(api.suggestions.forResume, { applicationId, baseResumeId })
    expect(saved?.job?.status).toBe("failed")
    expect(saved?.job?.result?.summary).toBe("Valid output")
    expect(saved?.job?.error).toContain("unconfirmed accomplishment")
  })

  it("handles provider errors and prevents duplicate concurrent requests", async () => {
    const { t, owner, applicationId, baseResumeId } = await seed()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("quota", { status: 429 })),
    )
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    await expect(owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })).rejects.toThrow(
      "already being generated",
    )
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.job).toMatchObject({
      status: "failed",
      error: expect.stringContaining("rate limiting"),
    })
  })

  it("marks replaced PDFs and edited confirmed accomplishments outdated, but ignores draft changes", async () => {
    const { t, owner, applicationId, baseResumeId, accomplishmentId, reviewId, suggestion } = await seed()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => completion({ summary: "Valid output", suggestions: [suggestion] })),
    )
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await t.run(async (ctx) => {
      await ctx.db.insert("accomplishments", {
        ...draft,
        description: "Still unconfirmed",
        reviewId,
        userId: "owner",
        status: "draft",
        updatedAt: Date.now(),
      })
    })
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.stale).toBe(false)
    await owner.mutation(api.experience.updateAccomplishment, {
      id: accomplishmentId,
      ...draft,
      description: "Implemented tracing and documented the workflow.",
      status: "confirmed",
    })
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.stale).toBe(true)
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.stale).toBe(false)
    await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["%PDF-new"], { type: "application/pdf" }))
      await ctx.db.patch(baseResumeId, { storageId })
    })
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.stale).toBe(true)
  })

  it("rejects unreadable resumes, short job descriptions, and libraries with no confirmations", async () => {
    const { t, owner, applicationId, baseResumeId, accomplishmentId } = await seed()
    await t.run(async (ctx) => {
      await ctx.db.patch(baseResumeId, { textStatus: "failed", text: undefined })
    })
    await expect(owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })).rejects.toThrow(
      "finish reading",
    )
    await t.run(async (ctx) => {
      await ctx.db.patch(baseResumeId, { textStatus: "ready", text: baseText })
      await ctx.db.patch(applicationId, { jobDescription: "too short" })
    })
    await expect(owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })).rejects.toThrow(
      "full job description",
    )
    await t.run(async (ctx) => {
      await ctx.db.patch(applicationId, {
        jobDescription:
          "A complete job description for backend engineers who build and operate reliable distributed API services.",
      })
    })
    await owner.mutation(api.experience.setAccomplishmentStatus, { id: accomplishmentId, status: "dismissed" })
    await expect(owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })).rejects.toThrow(
      "Confirm an accomplishment",
    )
  })

  it("does not allow an owned application to use another user's base resume", async () => {
    const { t, owner, applicationId, baseResumeId } = await seed()
    await t.run(async (ctx) => {
      await ctx.db.patch(baseResumeId, { userId: "other" })
    })
    expect(await owner.query(api.suggestions.forResume, { applicationId, baseResumeId })).toBeNull()
    await expect(owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })).rejects.toThrow("Not found")
  })

  it("allows recovery from abandoned jobs and ignores late output from the previous attempt", async () => {
    const { t, owner, applicationId, baseResumeId, suggestion } = await seed()
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    const previous = (await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))!.job!
    await t.run(async (ctx) => {
      await ctx.db.patch(previous._id, { startedAt: Date.now() - 180_001 })
    })
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    const next = (await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))!.job!
    expect(next.version).toBe(previous.version + 1)
    await t.mutation(internal.suggestions.finish, {
      id: next._id,
      version: previous.version,
      summary: "Late output",
      suggestions: [suggestion],
      model: "test-model",
    })
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.job?.result).toBeUndefined()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => completion({ summary: "New output", suggestions: [suggestion] })),
    )
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.job?.result?.summary).toBe(
      "New output",
    )
  })

  it("reports missing provider configuration and incomplete model output as retryable failures", async () => {
    const { t, owner, applicationId, baseResumeId } = await seed()
    vi.stubEnv("OPENAI_API_KEY", "")
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.job?.error).toContain(
      "OPENAI_API_KEY",
    )
    vi.stubEnv("OPENAI_API_KEY", "test-key")
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: "{" } }] })),
      ),
    )
    await owner.mutation(api.suggestions.generate, { applicationId, baseResumeId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect((await owner.query(api.suggestions.forResume, { applicationId, baseResumeId }))?.job?.error).toContain(
      "incomplete",
    )
  })

  it("cleans up suggestion records on application or base-resume deletion", async () => {
    const first = await seed()
    await first.owner.mutation(api.suggestions.generate, {
      applicationId: first.applicationId,
      baseResumeId: first.baseResumeId,
    })
    await first.owner.mutation(api.applications.remove, { id: first.applicationId })
    expect(await first.t.run(async (ctx) => ctx.db.query("resumeSuggestions").collect())).toHaveLength(0)
    const second = await seed()
    await second.owner.mutation(api.suggestions.generate, {
      applicationId: second.applicationId,
      baseResumeId: second.baseResumeId,
    })
    await second.owner.mutation(api.resumes.remove, { id: second.baseResumeId })
    expect(await second.t.run(async (ctx) => ctx.db.query("resumeSuggestions").collect())).toHaveLength(0)
    expect((await second.t.run(async (ctx) => ctx.db.get(second.applicationId)))?.baseResumeId).toBeUndefined()
  })
})

describe("evidence validation", () => {
  it("allows PDF whitespace differences but rejects invented evidence or original wording", () => {
    expect(containsQuote("Built\n the  payments API.", "Built the payments API.")).toBe(true)
    expect(() =>
      validateExtraction(reviewText, { accomplishments: [{ ...draft, sourceQuote: "Made up metric" }] }),
    ).toThrow()
    const suggestion = {
      kind: "replace",
      section: "Experience",
      currentText: "Text not in the resume",
      suggestedText: "Updated bullet",
      reason: "Relevant",
      accomplishmentIds: ["approved"],
      resumeQuote: "",
    }
    expect(() =>
      validateSuggestions(baseText, ["approved"], { summary: "Changes", suggestions: [suggestion] }),
    ).toThrow("original text")
    expect(() =>
      validateSuggestions(baseText, [], {
        summary: "Changes",
        suggestions: [{ ...suggestion, kind: "add", currentText: "", accomplishmentIds: [] }],
      }),
    ).toThrow("missing supporting evidence")
  })

  it("fingerprints actual content changes rather than generation time", async () => {
    expect(await inputFingerprint({ text: "same" })).toBe(await inputFingerprint({ text: "same" }))
    expect(await inputFingerprint({ text: "old" })).not.toBe(await inputFingerprint({ text: "new" }))
  })
})
