import { convexTest } from "convex-test"
import { afterEach, describe, expect, it, vi } from "vitest"

import { api } from "./_generated/api"
import schema from "./schema"

type GlobImportMeta = ImportMeta & {
  glob: (patterns: string | string[]) => Record<string, () => Promise<unknown>>
}

const modules = (import.meta as GlobImportMeta).glob([
  "./**/*.*s",
  "!./**/*.test.ts",
  "!./betterAuth/**/*.*s",
])

const identity = {
  subject: "provider|user-1",
  tokenIdentifier: "provider:user-1",
  email: "vishnu@example.com",
  name: "Vishnu",
}

function testClient() {
  return convexTest({ schema, modules }).withIdentity(identity)
}

describe("convex api", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("bootstraps the app user, settings, and default quality checklist from auth identity", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T09:00:00.000Z"))

    const t = convexTest({ schema, modules })
    const authed = t.withIdentity(identity)
    const user = await authed.mutation(api.users.ensureCurrent, {
      timezone: "America/New_York",
    })

    expect(user.authSubject).toBe(identity.subject)
    expect(user.tokenIdentifier).toBe(identity.tokenIdentifier)
    expect(user.normalizedEmail).toBe("vishnu@example.com")

    const current = await authed.query(api.users.current)
    expect(current?.settings?.timezone).toBe("America/New_York")

    const counts = await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect()
      const settings = await ctx.db.query("userSettings").collect()
      const qualityItems = await ctx.db.query("qualityChecklistItems").collect()
      return {
        users: users.length,
        settings: settings.length,
        qualityItems: qualityItems.length,
      }
    })
    expect(counts).toEqual({ users: 1, settings: 1, qualityItems: 5 })

    const changedTokenUser = await t.withIdentity({
      ...identity,
      tokenIdentifier: "provider:user-1-rotated",
      email: "VISHNU@EXAMPLE.COM",
    }).mutation(api.users.ensureCurrent, {
      timezone: "Asia/Kolkata",
    })

    expect(changedTokenUser._id).toBe(user._id)
    expect(changedTokenUser.tokenIdentifier).toBe("provider:user-1-rotated")
    expect(changedTokenUser.normalizedEmail).toBe("vishnu@example.com")

    const userCount = await t.run(async (ctx) => (await ctx.db.query("users").collect()).length)
    expect(userCount).toBe(1)
  })

  it("records application milestones as stage history, activity, and deduped wins", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T09:00:00.000Z"))

    const authed = testClient()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })

    const applicationId = await authed.mutation(api.applications.create, {
      companyName: "Acme Inc.",
      companyWebsite: "https://www.acme.com/careers",
      roleTitle: "Senior Engineer",
      stage: "applied",
      postingUrl: "https://acme.com/jobs/123?ref=linkedin",
      compensationMin: 150000,
      compensationMax: 180000,
      compensationCurrency: "USD",
      compensationPeriod: "year",
      referralStatus: "not_checked",
    })

    vi.setSystemTime(new Date("2026-06-02T09:00:00.000Z"))
    await authed.mutation(api.applications.moveStage, {
      id: applicationId,
      stage: "interview",
    })

    vi.setSystemTime(new Date("2026-06-03T09:00:00.000Z"))
    const offerId = await authed.mutation(api.applications.recordOffer, {
      applicationId,
      responseDeadlineDate: "2026-06-10",
      baseAmount: 185000,
      currency: "USD",
      period: "year",
      decision: "pending",
    })

    const snapshot = await authed.run(async (ctx) => {
      const application = await ctx.db.get(applicationId)
      const offer = await ctx.db.get(offerId)
      const history = await ctx.db
        .query("applicationStageHistory")
        .withIndex("by_applicationId", (q) => q.eq("applicationId", applicationId))
        .collect()
      const activities = await ctx.db
        .query("activityEvents")
        .withIndex("by_applicationId", (q) => q.eq("applicationId", applicationId))
        .collect()
      const wins = (await ctx.db.query("winLogEntries").collect()).filter(
        (win) => win.applicationId === applicationId
      )
      return { application, offer, history, activities, wins }
    })

    expect(snapshot.application?.companyKey).toBe("acme-inc")
    expect(snapshot.application?.companyDomain).toBe("acme.com")
    expect(snapshot.application?.stage).toBe("offer")
    expect(snapshot.application?.offerResponseDeadlineDate).toBe("2026-06-10")
    expect(snapshot.offer?.versionNumber).toBe(1)
    expect(snapshot.offer?.isCurrent).toBe(true)

    expect(snapshot.history.map((item) => item.stage)).toEqual([
      "applied",
      "interview",
      "offer",
    ])
    expect(snapshot.history[0].exitedToStage).toBe("interview")
    expect(snapshot.history[1].exitedToStage).toBe("offer")
    expect(snapshot.history[2].exitedAt).toBeUndefined()

    expect(snapshot.activities.map((event) => event.type)).toEqual(
      expect.arrayContaining(["created", "stage_changed", "offer_recorded"])
    )
    expect(snapshot.wins.map((win) => win.type).sort()).toEqual([
      "application_submitted",
      "interview_reached",
      "offer_received",
      "response_received",
    ])
  })

  it("keeps only one current resume link per application", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-04T09:00:00.000Z"))

    const authed = testClient()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    const [firstStorageId, secondStorageId] = await authed.run(async (ctx) =>
      Promise.all([
        ctx.storage.store(new Blob(["first resume"], { type: "application/pdf" })),
        ctx.storage.store(new Blob(["second resume"], { type: "application/pdf" })),
      ])
    )
    const firstResumeId = await authed.mutation(api.resumes.create, {
      label: "Backend resume",
      fileName: "backend.pdf",
      storageId: firstStorageId,
      mimeType: "application/pdf",
      sizeBytes: 12,
      isDefault: false,
    })
    const secondResumeId = await authed.mutation(api.resumes.create, {
      label: "Platform resume",
      fileName: "platform.pdf",
      storageId: secondStorageId,
      mimeType: "application/pdf",
      sizeBytes: 13,
      isDefault: false,
    })

    const applicationId = await authed.mutation(api.applications.create, {
      companyName: "Globex",
      roleTitle: "Platform Engineer",
      stage: "saved",
      currentResumeId: firstResumeId,
    })

    vi.setSystemTime(new Date("2026-06-04T10:00:00.000Z"))
    await authed.mutation(api.applications.update, {
      id: applicationId,
      currentResumeId: secondResumeId,
    })

    const snapshot = await authed.run(async (ctx) => {
      const application = await ctx.db.get(applicationId)
      const links = await ctx.db
        .query("applicationResumeLinks")
        .withIndex("by_applicationId", (q) => q.eq("applicationId", applicationId))
        .collect()
      return { application, links }
    })

    expect(snapshot.application?.currentResumeId).toBe(secondResumeId)
    expect(snapshot.links).toHaveLength(2)
    expect(snapshot.links.filter((link) => link.isCurrent).map((link) => link.resumeId)).toEqual([
      secondResumeId,
    ])
    expect(snapshot.links.find((link) => link.resumeId === firstResumeId)?.unlinkedAt).toEqual(
      Date.parse("2026-06-04T10:00:00.000Z")
    )
  })

  it("completes follow-up tasks with a single deduped follow-up win", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-05T09:00:00.000Z"))

    const authed = testClient()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    const applicationId = await authed.mutation(api.applications.create, {
      companyName: "Initech",
      roleTitle: "Staff Engineer",
      stage: "applied",
    })
    const taskId = await authed.mutation(api.tasks.create, {
      applicationId,
      title: "Follow up with recruiter",
      dueDate: "2026-06-06",
      kind: "follow_up",
    })

    vi.setSystemTime(new Date("2026-06-06T09:00:00.000Z"))
    await authed.mutation(api.tasks.complete, { id: taskId })
    await authed.mutation(api.tasks.complete, { id: taskId })

    const snapshot = await authed.run(async (ctx) => {
      const task = await ctx.db.get(taskId)
      const wins = (await ctx.db.query("winLogEntries").collect()).filter(
        (win) => win.applicationId === applicationId
      )
      return { task, wins }
    })

    expect(snapshot.task?.status).toBe("completed")
    expect(snapshot.task?.completedAt).toEqual(Date.parse("2026-06-06T09:00:00.000Z"))
    expect(snapshot.wins.filter((win) => win.type === "follow_up_completed")).toHaveLength(1)
  })
})
