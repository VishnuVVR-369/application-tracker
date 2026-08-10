import { createHash } from "node:crypto"

import { convexTest } from "convex-test"
import { afterEach, describe, expect, it, vi } from "vitest"

import { api, internal } from "./_generated/api"
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
  subject: "provider|extension-user",
  tokenIdentifier: "provider:extension-user",
  email: "extension@example.com",
  name: "Extension User",
}

function setup() {
  const t = convexTest({ schema, modules })
  return { t, authed: t.withIdentity(identity) }
}

describe("extension API", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("manages one-time extension token metadata without returning hashes", async () => {
    const { t, authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    const rawToken = `wat_${"a".repeat(43)}`
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    const tokenId = await authed.mutation(api.extensionTokens.create, {
      name: "Personal Chrome",
      tokenHash,
      tokenPrefix: "wat_example1",
    })

    const tokens = await authed.query(api.extensionTokens.list)
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      _id: tokenId,
      name: "Personal Chrome",
      tokenPrefix: "wat_example1",
    })
    expect(tokens[0]).not.toHaveProperty("tokenHash")
    expect(tokens[0]).not.toHaveProperty("rateWindowRequestCount")

    await expect(
      t.action(api.extensionApiActions.execute, {
        token: rawToken,
        operation: { type: "test" },
      })
    ).resolves.toMatchObject({ status: "connected", tokenName: "Personal Chrome" })

    await authed.mutation(api.extensionTokens.revoke, { id: tokenId })
    await expect(
      t.mutation(internal.extensionApi.executeInternal, {
        tokenHash,
        operation: { type: "test" },
      })
    ).rejects.toThrow("EXTENSION_TOKEN_INVALID")
  })

  it("creates idempotent LinkedIn captures, refreshes snapshots, and preserves user fields", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T09:00:00.000Z"))
    const { t, authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "Asia/Kolkata" })
    await authed.mutation(api.extensionTokens.create, {
      name: "Personal Chrome",
      tokenHash: "b".repeat(64),
      tokenPrefix: "wat_example2",
    })

    const capture = {
      jobId: "4250012345",
      postingUrl: "https://www.linkedin.com/jobs/view/software-engineer-4250012345/?trackingId=abc",
      companyName: "Acme",
      roleTitle: "Software Engineer",
      stage: "saved" as const,
      location: "Bengaluru, Karnataka, India",
      workArrangement: "hybrid" as const,
      compensationMin: 2_000_000,
      compensationMax: 3_000_000,
      compensationCurrency: "inr",
      compensationPeriod: "year" as const,
      compensationNotes: "₹20L–₹30L per year",
      jobDescriptionSnapshot: "<h2>About the role</h2>\nBuild reliable systems.<script>bad()</script>",
      notes: "Follow up with the hiring team.",
    }

    const created = await t.mutation(internal.extensionApi.executeInternal, {
      tokenHash: "b".repeat(64),
      operation: { type: "create", capture },
    })
    expect(created.status).toBe("created")
    if (!("application" in created) || !created.application) throw new Error("Expected application")

    const duplicate = await t.mutation(internal.extensionApi.executeInternal, {
      tokenHash: "b".repeat(64),
      operation: { type: "create", capture },
    })
    expect(duplicate.status).toBe("exists")
    if (!("application" in duplicate) || !duplicate.application) throw new Error("Expected duplicate application")
    expect(duplicate.application.id).toBe(created.application.id)

    const stored = await t.run((ctx) => ctx.db.get(created.application.id))
    expect(stored).toMatchObject({
      companyName: "Acme",
      roleTitle: "Software Engineer",
      postingUrl: "https://www.linkedin.com/jobs/view/4250012345/",
      postingUrlCanonical: "https://www.linkedin.com/jobs/view/4250012345",
      source: "linkedin",
      sourceSystem: "browser_extension",
      sourceExternalId: "4250012345",
      compensationCurrency: "INR",
      stage: "saved",
      notes: "Follow up with the hiring team.",
    })
    expect(stored?.jobDescriptionSnapshot).toBe("About the role\nBuild reliable systems.")
    expect(stored?.extensionCaptureSnapshot).toMatchObject({
      jobId: "4250012345",
      companyName: "Acme",
      roleTitle: "Software Engineer",
      compensationCurrency: "INR",
    })

    await t.run((ctx) => ctx.db.patch(created.application.id, {
      postingUrl: "https://jobs.example.com/user-managed-posting",
      postingUrlCanonical: "https://jobs.example.com/user-managed-posting",
      location: "User-managed location",
      workArrangement: "onsite",
      compensationMin: 4_000_000,
      compensationMax: 5_000_000,
      compensationCurrency: "CAD",
      compensationPeriod: "contract",
      compensationNotes: "User-managed compensation",
      jobDescriptionSnapshot: "User-managed description",
    }))

    const refreshed = await t.mutation(internal.extensionApi.executeInternal, {
      tokenHash: "b".repeat(64),
      operation: {
        type: "refresh",
        applicationId: created.application.id,
        capture: {
          ...capture,
          companyName: "Acme Incorporated",
          roleTitle: "Senior Software Engineer",
          location: "Remote",
          workArrangement: "remote",
          compensationNotes: "Updated range",
          jobDescriptionSnapshot: "Updated description",
          notes: "This must not overwrite notes",
        },
      },
    })
    expect(refreshed.status).toBe("refreshed")

    const updated = await t.run((ctx) => ctx.db.get(created.application.id))
    expect(updated).toMatchObject({
      companyName: "Acme",
      roleTitle: "Software Engineer",
      postingCompanySnapshot: "Acme",
      postingTitleSnapshot: "Software Engineer",
      postingUrl: "https://jobs.example.com/user-managed-posting",
      location: "User-managed location",
      workArrangement: "onsite",
      compensationMin: 4_000_000,
      compensationMax: 5_000_000,
      compensationCurrency: "CAD",
      compensationPeriod: "contract",
      compensationNotes: "User-managed compensation",
      jobDescriptionSnapshot: "User-managed description",
      notes: "Follow up with the hiring team.",
      stage: "saved",
    })
    expect(updated?.extensionCaptureSnapshot).toMatchObject({
      companyName: "Acme Incorporated",
      roleTitle: "Senior Software Engineer",
      location: "Remote",
      workArrangement: "remote",
      compensationNotes: "Updated range",
      jobDescriptionSnapshot: "Updated description",
    })

    await expect(
      t.mutation(internal.extensionApi.executeInternal, {
        tokenHash: "b".repeat(64),
        operation: {
          type: "refresh",
          applicationId: created.application.id,
          capture: {
            ...capture,
            jobId: "4250077777",
            postingUrl: "https://www.linkedin.com/jobs/view/4250077777/",
          },
        },
      })
    ).rejects.toThrow("APPLICATION_JOB_MISMATCH")
  })

  it("detects an existing manually captured LinkedIn URL by job ID", async () => {
    const { t, authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    await authed.mutation(api.extensionTokens.create, {
      name: "Personal Chrome",
      tokenHash: "f".repeat(64),
      tokenPrefix: "wat_example6",
    })
    const manualId = await authed.mutation(api.applications.create, {
      companyName: "Manual Corp",
      roleTitle: "Platform Engineer",
      stage: "saved",
      source: "linkedin",
      postingUrl: "https://www.linkedin.com/jobs/view/platform-engineer-4250066666/?trackingId=manual",
    })

    const result = await t.mutation(internal.extensionApi.executeInternal, {
      tokenHash: "f".repeat(64),
      operation: {
        type: "create",
        capture: {
          jobId: "4250066666",
          postingUrl: "https://www.linkedin.com/jobs/view/4250066666/",
          companyName: "Manual Corp",
          roleTitle: "Platform Engineer",
          stage: "saved",
        },
      },
    })

    expect(result.status).toBe("exists")
    if (!("application" in result) || !result.application) throw new Error("Expected application")
    expect(result.application.id).toBe(manualId)
  })

  it("allows a short same-token undo and rejects other tokens", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T10:00:00.000Z"))
    const { t, authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    await authed.mutation(api.extensionTokens.create, {
      name: "First",
      tokenHash: "c".repeat(64),
      tokenPrefix: "wat_example3",
    })
    await authed.mutation(api.extensionTokens.create, {
      name: "Second",
      tokenHash: "d".repeat(64),
      tokenPrefix: "wat_example4",
    })

    const created = await t.mutation(internal.extensionApi.executeInternal, {
      tokenHash: "c".repeat(64),
      operation: {
        type: "create",
        capture: {
          jobId: "4250099999",
          postingUrl: "https://www.linkedin.com/jobs/view/4250099999/",
          companyName: "Example",
          roleTitle: "Engineer",
          stage: "applied",
        },
      },
    })
    if (!("application" in created) || !created.application) throw new Error("Expected application")

    await expect(
      t.mutation(internal.extensionApi.executeInternal, {
        tokenHash: "d".repeat(64),
        operation: { type: "undo", applicationId: created.application.id },
      })
    ).rejects.toThrow("UNDO_NOT_ALLOWED")

    const undone = await t.mutation(internal.extensionApi.executeInternal, {
      tokenHash: "c".repeat(64),
      operation: { type: "undo", applicationId: created.application.id },
    })
    expect(undone.status).toBe("archived")
    if (!("application" in undone) || !undone.application) throw new Error("Expected archived application")
    expect(undone.application.archived).toBe(true)
  })

  it("rejects undo after the ten-second server window", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T10:00:00.000Z"))
    const { t, authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    await authed.mutation(api.extensionTokens.create, {
      name: "Personal Chrome",
      tokenHash: "a".repeat(64),
      tokenPrefix: "wat_example7",
    })
    const created = await t.mutation(internal.extensionApi.executeInternal, {
      tokenHash: "a".repeat(64),
      operation: {
        type: "create",
        capture: {
          jobId: "4250088888",
          postingUrl: "https://www.linkedin.com/jobs/view/4250088888/",
          companyName: "Example",
          roleTitle: "Engineer",
          stage: "saved",
        },
      },
    })
    if (!("application" in created) || !created.application) throw new Error("Expected application")

    vi.advanceTimersByTime(10_001)
    await expect(
      t.mutation(internal.extensionApi.executeInternal, {
        tokenHash: "a".repeat(64),
        operation: { type: "undo", applicationId: created.application.id },
      })
    ).rejects.toThrow("UNDO_NOT_ALLOWED")
  })

  it("uses the user's local calendar date for applied captures", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T20:00:00.000Z"))
    const { t, authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "Asia/Kolkata" })
    await authed.mutation(api.extensionTokens.create, {
      name: "Personal Chrome",
      tokenHash: "9".repeat(64),
      tokenPrefix: "wat_example8",
    })
    const created = await t.mutation(internal.extensionApi.executeInternal, {
      tokenHash: "9".repeat(64),
      operation: {
        type: "create",
        capture: {
          jobId: "4250088889",
          postingUrl: "https://www.linkedin.com/jobs/view/4250088889/",
          companyName: "Example",
          roleTitle: "Engineer",
          stage: "applied",
        },
      },
    })
    if (!("application" in created) || !created.application) throw new Error("Expected application")

    expect(created.application.dateAppliedDate).toBe("2026-08-11")
    expect(created.application.dateSavedDate).toBe("2026-08-11")
  })

  it("preserves an unknown capture currency", async () => {
    const { t, authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    await authed.mutation(api.extensionTokens.create, {
      name: "Personal Chrome",
      tokenHash: "8".repeat(64),
      tokenPrefix: "wat_example9",
    })
    const created = await t.mutation(internal.extensionApi.executeInternal, {
      tokenHash: "8".repeat(64),
      operation: {
        type: "create",
        capture: {
          jobId: "4250088890",
          postingUrl: "https://www.linkedin.com/jobs/view/4250088890/",
          companyName: "Example",
          roleTitle: "Engineer",
          stage: "saved",
          compensationMin: 100_000,
          compensationMax: 120_000,
          compensationPeriod: "year",
          compensationNotes: "$100k-$120k per year",
        },
      },
    })
    if (!("application" in created) || !created.application) throw new Error("Expected application")

    const stored = await t.run((ctx) => ctx.db.get(created.application.id))
    expect(stored?.compensationCurrency).toBeUndefined()
    expect(stored?.extensionCaptureSnapshot?.compensationCurrency).toBeUndefined()
  })

  it("enforces the per-token request limit", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T11:00:00.000Z"))
    const { t, authed } = setup()
    await authed.mutation(api.users.ensureCurrent, { timezone: "UTC" })
    await authed.mutation(api.extensionTokens.create, {
      name: "Rate limited",
      tokenHash: "e".repeat(64),
      tokenPrefix: "wat_example5",
    })

    for (let index = 0; index < 30; index += 1) {
      await t.mutation(internal.extensionApi.executeInternal, {
        tokenHash: "e".repeat(64),
        operation: { type: "test" },
      })
    }
    await expect(
      t.mutation(internal.extensionApi.executeInternal, {
        tokenHash: "e".repeat(64),
        operation: { type: "test" },
      })
    ).rejects.toThrow("EXTENSION_RATE_LIMITED")
  })
})
