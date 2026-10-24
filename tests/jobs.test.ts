/// <reference types="vite/client" />

import workpool from "@convex-dev/workpool/test"
import { convexTest } from "convex-test"
import type { UserIdentity } from "convex/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api, internal } from "../convex/_generated/api"
import schema from "../convex/schema"
import { citiesCompatible, dedupeKey, descriptionSimilarity, isQuotedFrom, postingFromUrl, roleKey } from "../lib/jobs"

// Stub only the external Better Auth identity lookup and its routes. Everything else runs in convex-test.
vi.mock("../convex/betterAuth/auth", () => ({
  authComponent: {
    safeGetAuthUser: async (ctx: { auth: { getUserIdentity: () => Promise<UserIdentity | null> } }) => {
      const identity = await ctx.auth.getUserIdentity()
      return identity ? { _id: identity.subject } : null
    },
    registerRoutes: () => {},
  },
  createAuth: () => ({}),
}))

const modules = import.meta.glob("../convex/**/*.{ts,js}")

const BACKEND_RESUME = "Backend Engineer at Example. Built the payments API. Skills: TypeScript, Go."
const FULLSTACK_RESUME = "Fullstack Engineer at Example. Built the dashboard in React. Skills: TypeScript."
const DESCRIPTION_LINES = [
  "About the role",
  "You will design and run the payment services that move money for millions of customers.",
  "Build reliable backend APIs in Go and TypeScript, and own their observability.",
  "Work with product and data teams on new payment methods across India.",
  "5+ years of backend engineering experience with distributed systems.",
]
const DESCRIPTION = DESCRIPTION_LINES.join("\n")

function pageText(extra = "") {
  return [
    "Skip to main content",
    "Home My Network Jobs Messaging",
    "Senior Backend Engineer",
    "Acme Payments · Bengaluru, Karnataka, India · 3 days ago · Over 100 applicants",
    "Hybrid Full-time",
    "Easy Apply Save",
    ...DESCRIPTION_LINES.map((line) => `• ${line}`),
    "Show more",
    extra,
    "Similar jobs: Staff Engineer at Other Co",
  ].join("\n")
}

const extraction = {
  isJobPosting: true,
  acceptingApplications: true,
  company: "Acme Payments",
  role: "Senior Backend Engineer",
  location: "Bengaluru, Karnataka, India",
  workMode: "hybrid",
  salaryText: "",
  postedText: "3 days ago",
  description: DESCRIPTION,
}

function completion(data: unknown) {
  return new Response(
    JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(data) } }] }),
    { status: 200 },
  )
}

type Handlers = {
  posting?: (input: { pageText: string }) => unknown
  score?: (resumeText: string) => number
  suggestions?: (input: { evidence: { accomplishmentId: string }[]; resumeText: string }) => unknown
}

/** A fake OpenAI that answers by the structured output each request asks for. */
function fakeOpenAI(handlers: Handlers = {}) {
  const calls: string[] = []
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const request = JSON.parse(init.body as string)
    const name = request.response_format.json_schema.name as string
    const input = JSON.parse(request.messages[1].content)
    calls.push(name)
    if (name === "job_posting") return completion(handlers.posting ? handlers.posting(input) : extraction)
    if (name === "resume_match") {
      const score = handlers.score ? handlers.score(input.resumeText) : input.resumeText.startsWith("Backend") ? 82 : 64
      return completion({ score, verdict: "Fits.", matchedKeywords: ["Go"], missingKeywords: [] })
    }
    if (name === "resume_suggestions") {
      if (handlers.suggestions) return completion(handlers.suggestions(input))
      return completion({
        summary: "Lead with payments.",
        suggestions: [
          {
            kind: "replace",
            section: "Experience",
            // The second sentence of whichever resume was picked, like "Built the payments API."
            currentText: `${input.resumeText.split(". ")[1]}.`,
            suggestedText: "Built and operated the payments API in Go.",
            reason: "The role asks for Go payment services.",
            accomplishmentIds: [input.evidence[0].accomplishmentId],
            resumeQuote: "",
          },
        ],
      })
    }
    throw new Error(`Unexpected model call ${name}`)
  })
  vi.stubGlobal("fetch", fetchMock)
  return calls
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("OPENAI_API_KEY", "test-key")
  vi.stubEnv("OPENAI_MODEL", "test-model")
  vi.stubEnv("SITE_URL", "https://tracker.test")
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function setup({ confirmed = true }: { confirmed?: boolean } = {}) {
  const t = convexTest(schema, modules)
  workpool.register(t, "jobsPool")
  const owner = t.withIdentity({ subject: "owner" })
  const ids = await t.run(async (ctx) => {
    const resume = async (label: string, text: string, uploadedAt: number) =>
      ctx.db.insert("baseResumes", {
        userId: "owner",
        label,
        storageId: await ctx.storage.store(new Blob(["%PDF-test"], { type: "application/pdf" })),
        fileName: `${label}.pdf`,
        text,
        textStatus: "ready",
        uploadedAt,
      })
    const backendId = await resume("Backend", BACKEND_RESUME, 1)
    const fullstackId = await resume("Fullstack", FULLSTACK_RESUME, 2)
    const reviewId = await ctx.db.insert("reviews", {
      userId: "owner",
      title: "Review",
      company: "Example",
      role: "Backend Engineer",
      period: "2026",
      text: "I built the payments API in Go.",
      status: "ready",
      version: 1,
      startedAt: 0,
      createdAt: 0,
    })
    const accomplishmentId = await ctx.db.insert("accomplishments", {
      userId: "owner",
      reviewId,
      title: "Payments API in Go",
      description: "Built the payments API in Go.",
      skills: ["Go"],
      sourceQuote: "I built the payments API in Go.",
      clarification: "",
      status: confirmed ? "confirmed" : "draft",
      updatedAt: 0,
    })
    return { backendId, fullstackId, accomplishmentId }
  })
  const token = await owner.action(api.apiTokens.create, { name: "Job Scout" })
  const post = (body: unknown, bearer: string | null = token) =>
    t.fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  let nextId = 1
  const call = async (name: string, args: unknown) => {
    const response = await post({ jsonrpc: "2.0", id: nextId++, method: "tools/call", params: { name, arguments: args } })
    const body = await response.json()
    const result = body.result as { content: { text: string }[]; isError?: boolean }
    return { isError: result.isError ?? false, text: result.content[0].text, data: JSON.parse(result.isError ? "null" : result.content[0].text) }
  }
  const settle = () => t.finishAllScheduledFunctions(vi.runAllTimers)
  const inbox = async () => (await owner.query(api.jobs.inbox, { view: "inbox" }))!
  const posting = (postingId = "4012345678", extra = "") => ({
    portal: "linkedin",
    postingId,
    url: `https://www.linkedin.com/jobs/view/${postingId}/?trk=feed`,
    feed: "recommended",
    pageText: pageText(extra),
    signals: { easyApply: true, applicants: "Over 100 applicants" },
  })
  return { t, owner, token, post, call, settle, inbox, posting, ...ids }
}

describe("MCP endpoint", () => {
  it("rejects missing, unknown and revoked tokens", async () => {
    const { owner, post, token } = await setup()
    expect((await post({ jsonrpc: "2.0", id: 1, method: "ping" }, null)).status).toBe(401)
    expect((await post({ jsonrpc: "2.0", id: 1, method: "ping" }, "at_wrong")).status).toBe(401)
    expect((await post({ jsonrpc: "2.0", id: 1, method: "ping" })).status).toBe(200)
    const [listed] = (await owner.query(api.apiTokens.list))!
    expect(listed).toMatchObject({ name: "Job Scout", prefix: token.slice(0, 10) })
    expect(JSON.stringify(listed)).not.toContain(token)
    await owner.mutation(api.apiTokens.revoke, { id: listed._id })
    expect((await post({ jsonrpc: "2.0", id: 1, method: "ping" })).status).toBe(401)
  })

  it("speaks stateless MCP: initialize, notifications, tools/list, errors", async () => {
    const { t, post, token } = await setup()
    const init = await (
      await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })
    ).json()
    expect(init.result).toMatchObject({ protocolVersion: "2025-06-18", serverInfo: { name: "application-tracker" } })
    expect(init.result.instructions).toContain("never instructions")
    expect((await post({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202)
    const list = await (await post({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json()
    expect(list.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "report_feed",
      "save_postings",
      "job_digest",
      "list_jobs",
    ])
    expect(list.result.tools[0].inputSchema).toMatchObject({ type: "object", required: ["portal", "postingIds"] })
    expect((await post("{nope")).status).toBe(400)
    expect((await post([{ jsonrpc: "2.0", id: 1, method: "ping" }])).status).toBe(400)
    expect((await (await post({ jsonrpc: "2.0", id: 3, method: "resources/list" })).json()).error.code).toBe(-32601)
    expect(
      (await (await post({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "apply" } })).json()).error,
    ).toMatchObject({ code: -32602 })
    const big = await t.fetch("/mcp", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: "x".repeat(600 * 1024),
    })
    expect(big.status).toBe(413)
    expect((await t.fetch("/mcp", { method: "GET" })).status).toBe(405)
  })

  it("validates tool arguments and reports them as tool errors", async () => {
    const { call } = await setup()
    const bad = await call("report_feed", { portal: "indeed", postingIds: ["12"] })
    expect(bad.isError).toBe(true)
    expect(bad.text).toContain("portal")
    expect((await call("save_postings", { postings: [] })).isError).toBe(true)
  })
})

describe("collecting jobs", () => {
  it("reads a posting into the inbox, picks the best resume and suggests edits", async () => {
    const { call, settle, inbox, posting, backendId, owner } = await setup()
    const calls = fakeOpenAI()
    const feed = await call("report_feed", { portal: "linkedin", postingIds: ["4012345678", "4012345678"] })
    expect(feed.data).toEqual({ newPostingIds: ["4012345678"], alreadyCollected: 0 })
    const saved = await call("save_postings", { postings: [posting()] })
    expect(saved.data).toEqual([{ postingId: "4012345678", status: "queued" }])
    await settle()

    const { jobs, fitThreshold } = await inbox()
    expect(fitThreshold).toBe(70)
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      company: "Acme Payments",
      role: "Senior Backend Engineer",
      location: "Bengaluru, Karnataka, India",
      workMode: "hybrid",
      portals: [{ portal: "linkedin", url: "https://www.linkedin.com/jobs/view/4012345678/" }],
      fit: { score: 82, resume: "Backend" },
      chosen: { score: 82, resume: "Backend" },
      pipeline: { state: "done" },
      suggestions: { status: "ready", count: 1 },
    })
    expect(calls.sort()).toEqual(["job_posting", "resume_match", "resume_match", "resume_suggestions"])
    const application = await owner.query(api.applications.get, { id: jobs[0]._id })
    expect(application).toMatchObject({ status: "discovered", baseResumeId: backendId, source: "linkedin" })
    expect(application?.jobDescription).toBe(DESCRIPTION)

    // Seen again: nothing is read or scored twice.
    const again = await call("report_feed", { portal: "linkedin", feed: "saved_search", postingIds: ["4012345678"] })
    expect(again.data).toEqual({ newPostingIds: [], alreadyCollected: 1 })
    expect((await call("save_postings", { postings: [posting()] })).data[0].status).toBe("unchanged")
    await settle()
    expect(calls).toHaveLength(4)

    const digest = await call("job_digest", {})
    expect(digest.data).toMatchObject({ newJobs: 1, strongMatches: 1, suggestionsReady: 1, postingsCollected: 1 })
    expect(digest.data.top[0]).toMatchObject({
      company: "Acme Payments",
      score: 82,
      resume: "Backend",
      trackerUrl: `https://tracker.test/inbox?app=${jobs[0]._id}`,
    })
    expect((await call("list_jobs", { minScore: 90 })).data).toEqual([])
    expect(await owner.query(api.jobs.strongMatchCount)).toBe(1)
  })

  it("stops below the fit threshold without suggestions", async () => {
    const { call, settle, inbox, posting } = await setup()
    const calls = fakeOpenAI({ score: () => 55 })
    await call("save_postings", { postings: [posting()] })
    await settle()
    const [job] = (await inbox()).jobs
    expect(job).toMatchObject({ fit: { score: 55 }, pipeline: { state: "done" }, suggestions: null })
    expect(calls).not.toContain("resume_suggestions")
  })

  it("waits for confirmed experience, then suggests once you confirm some", async () => {
    const { call, settle, inbox, posting, owner, accomplishmentId } = await setup({ confirmed: false })
    fakeOpenAI()
    await call("save_postings", { postings: [posting()] })
    await settle()
    expect((await inbox()).jobs[0].pipeline).toMatchObject({ state: "waiting", reason: expect.stringContaining("Confirm") })
    await owner.mutation(api.experience.setAccomplishmentStatus, { id: accomplishmentId, status: "confirmed" })
    await settle()
    expect((await inbox()).jobs[0]).toMatchObject({ pipeline: { state: "done" }, suggestions: { status: "ready" } })
  })

  it("merges the same job from another portal and keeps different roles apart", async () => {
    const { call, settle, inbox, posting } = await setup()
    fakeOpenAI({
      posting: (input) =>
        input.pageText.includes("Staff role")
          ? { ...extraction, role: "Staff Backend Engineer", description: DESCRIPTION }
          : extraction,
    })
    await call("save_postings", { postings: [posting()] })
    await settle()
    await call("save_postings", {
      postings: [
        {
          ...posting(),
          portal: "naukri",
          postingId: "150525500123",
          url: "https://www.naukri.com/job-listings-senior-backend-engineer-acme-payments-bengaluru-5-to-8-years-150525500123?src=reco",
        },
        { ...posting("4099999999", "Staff role"), url: "https://www.linkedin.com/jobs/view/4099999999/" },
      ],
    })
    await settle()
    const { jobs } = await inbox()
    expect(jobs).toHaveLength(2)
    const senior = jobs.find((job) => job.role === "Senior Backend Engineer")!
    expect(senior.portals.map((item) => item.portal).sort()).toEqual(["linkedin", "naukri"])
  })

  it("rejects mismatched ids and short pages, and fails descriptions that don't quote the page", async () => {
    const { call, settle, inbox, posting, owner } = await setup()
    const calls = fakeOpenAI({ posting: () => ({ ...extraction, description: `${DESCRIPTION}\nInvented perks line.` }) })
    const result = await call("save_postings", {
      postings: [
        { ...posting(), postingId: "4011111111" },
        { ...posting("4022222222"), pageText: "Sign in to see this job" },
        posting("4033333333"),
      ],
    })
    expect(result.data.map((item: { status: string }) => item.status)).toEqual(["rejected", "rejected", "queued"])
    await settle()
    const { jobs, failed } = await inbox()
    expect(jobs).toHaveLength(0)
    expect(failed).toMatchObject([{ status: "failed", error: expect.stringContaining("didn't match") }])
    // One automatic second try, then it waits for you.
    expect(calls.filter((name) => name === "job_posting")).toHaveLength(2)

    fakeOpenAI()
    await owner.mutation(api.jobs.retryPosting, { id: failed[0]._id })
    await settle()
    expect((await inbox()).jobs).toHaveLength(1)
    expect((await inbox()).failed).toHaveLength(0)
  })

  it("skips closed postings and non-postings without creating jobs", async () => {
    const { call, settle, inbox, posting } = await setup()
    fakeOpenAI({
      posting: (input) =>
        input.pageText.includes("CLOSED")
          ? { ...extraction, acceptingApplications: false }
          : { ...extraction, isJobPosting: false },
    })
    await call("save_postings", { postings: [posting("4044444444", "CLOSED"), posting("4055555555")] })
    await settle()
    const { jobs, failed } = await inbox()
    expect(jobs).toHaveLength(0)
    expect(failed).toMatchObject([{ error: expect.stringContaining("isn't a job posting") }])
    expect((await call("report_feed", { portal: "linkedin", postingIds: ["4044444444"] })).data.newPostingIds).toEqual([])
  })

  it("retries OpenAI rate limits in the background", async () => {
    const { call, settle, inbox, posting } = await setup()
    fakeOpenAI()
    const real = globalThis.fetch
    let limited = 2
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) =>
        limited-- > 0 ? new Response("slow down", { status: 429 }) : real(url, init),
      ),
    )
    await call("save_postings", { postings: [posting()] })
    await settle()
    expect((await inbox()).jobs[0]).toMatchObject({ pipeline: { state: "done" }, suggestions: { status: "ready" } })
  })
})

describe("the inbox", () => {
  it("keeps inbox jobs off the board, and shortlisting hands the job to you", async () => {
    const { call, settle, inbox, posting, owner } = await setup()
    const calls = fakeOpenAI()
    await call("save_postings", { postings: [posting()] })
    await settle()
    const [job] = (await inbox()).jobs
    expect((await owner.query(api.applications.board))!.cards).toHaveLength(0)

    await owner.mutation(api.jobs.dismiss, { id: job._id, reason: "Location" })
    expect((await inbox()).jobs).toHaveLength(0)
    expect((await owner.query(api.jobs.inbox, { view: "dismissed" }))!.jobs[0]).toMatchObject({ dismissReason: "Location" })
    await owner.mutation(api.jobs.restore, { id: job._id })
    await owner.mutation(api.jobs.shortlist, { id: job._id })
    await settle()
    const board = (await owner.query(api.applications.board))!
    expect(board.cards).toMatchObject([{ _id: job._id, status: "saved" }])

    // Shortlisted jobs are yours: a resume change no longer reaches them.
    const before = calls.length
    await owner.mutation(api.experience.setAccomplishmentStatus, {
      id: (await owner.query(api.experience.list))!.accomplishments[0]._id,
      status: "draft",
    })
    await settle()
    expect(calls).toHaveLength(before)
  })

  it("respects a base resume you pick yourself", async () => {
    const { call, settle, inbox, posting, owner, fullstackId } = await setup()
    fakeOpenAI({ score: (text) => (text.startsWith("Backend") ? 82 : 75) })
    await call("save_postings", { postings: [posting()] })
    await settle()
    const [job] = (await inbox()).jobs
    await owner.mutation(api.applications.setBaseResume, { id: job._id, baseResumeId: fullstackId })
    await settle()
    const after = (await inbox()).jobs[0]
    expect(after).toMatchObject({ fit: { score: 82, resume: "Backend" }, chosen: { score: 75, resume: "Fullstack" } })
    expect(
      await owner.query(api.suggestions.forResume, { applicationId: job._id, baseResumeId: fullstackId }),
    ).toMatchObject({ job: { status: "ready" } })
  })

  it("rescores after a new resume, and a deleted job never comes back", async () => {
    const { t, call, settle, inbox, posting, owner } = await setup()
    const calls = fakeOpenAI({ score: (text) => (text.startsWith("Platform") ? 91 : 60) })
    await call("save_postings", { postings: [posting()] })
    await settle()
    expect((await inbox()).jobs[0].fit).toMatchObject({ score: 60 })
    // A new resume arrives the way the app adds one: its PDF text is read, then saved.
    const { id, storageId } = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["%PDF"], { type: "application/pdf" }))
      const id = await ctx.db.insert("baseResumes", {
        userId: "owner",
        label: "Platform",
        storageId,
        fileName: "platform.pdf",
        textStatus: "extracting",
        uploadedAt: 3,
      })
      return { id, storageId }
    })
    await t.mutation(internal.resumes.saveExtraction, {
      id,
      storageId,
      text: "Platform Engineer at Example. Built the payments API. Skills: Go.",
    })
    await settle()
    expect((await inbox()).jobs[0]).toMatchObject({ fit: { score: 91, resume: "Platform" }, suggestions: { status: "ready" } })
    expect(calls.filter((name) => name === "resume_match")).toHaveLength(3)

    const [job] = (await inbox()).jobs
    await owner.mutation(api.applications.remove, { id: job._id })
    expect((await call("report_feed", { portal: "linkedin", postingIds: ["4012345678"] })).data.newPostingIds).toEqual([])
  })

  it("records postings you add yourself so the Job Scout skips them", async () => {
    const { owner, call } = await setup()
    await owner.mutation(api.applications.create, {
      company: "Acme Payments",
      role: "Senior Backend Engineer",
      jobUrl: "https://www.linkedin.com/jobs/view/senior-backend-engineer-at-acme-4077777777?refId=x",
      source: "linkedin",
      jobDescription: "",
      notes: "",
    })
    expect((await call("report_feed", { portal: "linkedin", postingIds: ["4077777777", "4088888888"] })).data).toEqual({
      newPostingIds: ["4088888888"],
      alreadyCollected: 1,
    })
  })

  it("only lets you set a whole-number threshold, and a lower one brings suggestions", async () => {
    const { call, settle, inbox, posting, owner } = await setup()
    fakeOpenAI({ score: () => 65 })
    await call("save_postings", { postings: [posting()] })
    await settle()
    expect((await inbox()).jobs[0].suggestions).toBeNull()
    await expect(owner.mutation(api.settings.setFitThreshold, { threshold: 101 })).rejects.toThrow("between 0 and 100")
    await owner.mutation(api.settings.setFitThreshold, { threshold: 60 })
    await settle()
    expect((await inbox()).jobs[0].suggestions).toMatchObject({ status: "ready" })
  })
})

describe("job helpers", () => {
  it("parses posting links from LinkedIn and Naukri", () => {
    expect(postingFromUrl("https://www.linkedin.com/jobs/view/4012345678/?trk=x")).toEqual({
      portal: "linkedin",
      postingId: "4012345678",
      url: "https://www.linkedin.com/jobs/view/4012345678/",
    })
    expect(postingFromUrl("https://in.linkedin.com/jobs/view/backend-engineer-at-acme-4012345678")?.postingId).toBe(
      "4012345678",
    )
    expect(postingFromUrl("https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4012345678")?.postingId).toBe(
      "4012345678",
    )
    expect(
      postingFromUrl("https://www.naukri.com/job-listings-backend-engineer-acme-bengaluru-3-to-5-years-150525500123?src=x"),
    ).toMatchObject({ portal: "naukri", postingId: "150525500123" })
    expect(postingFromUrl("https://www.linkedin.com/feed/")).toBeNull()
    expect(postingFromUrl("https://boards.greenhouse.io/acme/jobs/123456")).toBeNull()
    expect(postingFromUrl("not a url")).toBeNull()
  })

  it("normalizes roles and compares cities and descriptions", () => {
    expect(roleKey("Senior Backend Engineer (m/f/d) - Payments")).toBe(roleKey("senior backend engineer, payments"))
    expect(dedupeKey(" Acme  Payments", "Engineer")).toBe(dedupeKey("acme payments", "engineer"))
    expect(citiesCompatible("Bengaluru, Karnataka", "Bengaluru Urban")).toBe(true)
    expect(citiesCompatible("Pune", "Bengaluru")).toBe(false)
    expect(citiesCompatible("", "Pune")).toBe(true)
    expect(citiesCompatible("Remote", "Pune")).toBe(true)
    expect(descriptionSimilarity(DESCRIPTION, DESCRIPTION)).toBe(1)
    expect(descriptionSimilarity(DESCRIPTION, "Completely different text about cooking pasta at home")).toBe(0)
  })

  it("accepts descriptions quoted from the page, ignoring list markers and spacing", () => {
    expect(isQuotedFrom(pageText(), DESCRIPTION)).toBe(true)
    expect(isQuotedFrom(pageText(), `- ${DESCRIPTION_LINES[1]}`)).toBe(true)
    expect(isQuotedFrom(pageText(), "Unlimited vacation and a free car.")).toBe(false)
    expect(isQuotedFrom(pageText(), "")).toBe(false)
  })
})
