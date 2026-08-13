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
  subject: "provider|mobile-user",
  tokenIdentifier: "provider:mobile-user",
  email: "mobile@example.com",
  name: "Mobile User",
}

function setup() {
  const t = convexTest({ schema, modules })
  return { t, authed: t.withIdentity(identity) }
}

async function applicationsFor(client: ReturnType<typeof setup>["authed"]) {
  return client.run((ctx) => ctx.db.query("applications").collect())
}

describe("mobile capture API", () => {
  afterEach(() => vi.useRealTimers())

  it("requires authentication", async () => {
    const { t } = setup()
    await expect(
      t.query(api.mobileCapture.findDuplicate, { postingUrl: "https://example.com/jobs/1" })
    ).rejects.toThrow("Not authenticated")
  })

  it("creates a confirmed capture with a user-local applied date", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T20:00:00.000Z"))
    const { authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "Asia/Kolkata" })

    const result = await authed.mutation(api.mobileCapture.create, {
      postingUrl: "https://www.linkedin.com/jobs/view/platform-engineer-4250012345/?trackingId=x",
      companyName: "Acme",
      roleTitle: "Platform Engineer",
      stage: "applied",
      location: "Bengaluru",
      workArrangement: "hybrid",
      notes: "Shared from Android",
    })

    expect(result.status).toBe("created")
    const applications = await applicationsFor(authed)
    expect(applications).toHaveLength(1)
    expect(applications[0]).toMatchObject({
      companyName: "Acme",
      roleTitle: "Platform Engineer",
      stage: "applied",
      source: "linkedin",
      sourceSystem: "mobile_share",
      postingUrl: "https://www.linkedin.com/jobs/view/4250012345",
      postingUrlCanonical: "https://www.linkedin.com/jobs/view/4250012345",
      dateSavedDate: "2026-08-11",
      dateAppliedDate: "2026-08-11",
    })
  })

  it("returns the existing active or archived row instead of duplicating it", async () => {
    const { authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    const applicationId = await authed.mutation(api.applications.create, {
      postingUrl: "https://jobs.example.com/roles/123?utm_source=old-share&team=infra",
      companyName: "Example",
      roleTitle: "Engineer",
      stage: "saved",
    })

    const first = await authed.mutation(api.mobileCapture.create, {
      postingUrl: "https://jobs.example.com/roles/123?team=infra&utm_medium=android",
      companyName: "Should not replace",
      roleTitle: "Should not replace",
      stage: "applied",
    })
    expect(first).toMatchObject({
      status: "exists",
      application: { applicationId, archived: false },
    })

    await authed.mutation(api.applications.update, { id: applicationId, archived: true })
    const lookup = await authed.query(api.mobileCapture.findDuplicate, {
      postingUrl: "https://jobs.example.com/roles/123?team=infra",
    })
    expect(lookup).toMatchObject({ applicationId, archived: true })

    const applications = await applicationsFor(authed)
    expect(applications).toHaveLength(1)
  })

  it("does not match meaningful query parameters", async () => {
    const { authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    await authed.mutation(api.mobileCapture.create, {
      postingUrl: "https://jobs.example.com/opening?id=1",
      companyName: "Example",
      roleTitle: "Engineer I",
      stage: "saved",
    })
    const second = await authed.mutation(api.mobileCapture.create, {
      postingUrl: "https://jobs.example.com/opening?id=2",
      companyName: "Example",
      roleTitle: "Engineer II",
      stage: "saved",
    })
    expect(second.status).toBe("created")
    expect(await applicationsFor(authed)).toHaveLength(2)
  })

  it("rejects invalid URLs, missing required values, and foreign resumes", async () => {
    const { t, authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })

    await expect(
      authed.mutation(api.mobileCapture.create, {
        postingUrl: "javascript:alert(1)",
        companyName: "Acme",
        roleTitle: "Engineer",
        stage: "saved",
      })
    ).rejects.toThrow("valid HTTP or HTTPS")

    await expect(
      authed.mutation(api.mobileCapture.create, {
        postingUrl: "https://example.com/job",
        companyName: " ",
        roleTitle: "Engineer",
        stage: "saved",
      })
    ).rejects.toThrow("Company is required")

    const foreign = t.withIdentity({ ...identity, subject: "provider|other", tokenIdentifier: "other" })
    await foreign.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    const storageId = await foreign.run((ctx) =>
      ctx.storage.store(new Blob(["resume"], { type: "application/pdf" }))
    )
    const resumeId = await foreign.mutation(api.resumes.create, {
      label: "Foreign resume",
      fileName: "resume.pdf",
      storageId,
      mimeType: "application/pdf",
      sizeBytes: 6,
      isDefault: false,
    })
    await expect(
      authed.mutation(api.mobileCapture.create, {
        postingUrl: "https://example.com/job",
        companyName: "Acme",
        roleTitle: "Engineer",
        stage: "saved",
        currentResumeId: resumeId,
      })
    ).rejects.toThrow("Resume not found")
  })
})
