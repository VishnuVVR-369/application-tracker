import { describe, expect, it } from "vitest"

import { canonicalizePostingUrl } from "./model"
import { dateKeyInTimeZone } from "./userDate"

describe("posting URL identity", () => {
  it("normalizes LinkedIn job variants to one stable URL", () => {
    expect(
      canonicalizePostingUrl(
        "https://www.linkedin.com/jobs/view/senior-engineer-4250012345/?trackingId=abc&utm_source=share"
      )
    ).toBe("https://www.linkedin.com/jobs/view/4250012345")
    expect(
      canonicalizePostingUrl("https://m.linkedin.com/jobs/search/?currentJobId=4250012345")
    ).toBe("https://www.linkedin.com/jobs/view/4250012345")
    expect(
      canonicalizePostingUrl("https://in.linkedin.com/jobs/view/platform-engineer-4250012345")
    ).toBe("https://www.linkedin.com/jobs/view/4250012345")
  })

  it("removes known trackers, preserves meaningful params, and sorts them", () => {
    expect(
      canonicalizePostingUrl(
        "https://jobs.example.com/role/?b=2&utm_source=share&a=1&gclid=click#apply"
      )
    ).toBe("https://jobs.example.com/role?a=1&b=2")
  })

  it("rejects unsafe posting URL schemes and credentials", () => {
    expect(canonicalizePostingUrl("javascript:alert(1)")).toBeUndefined()
    expect(canonicalizePostingUrl("https://user:secret@example.com/job")).toBeUndefined()
  })
})

describe("user-local date", () => {
  it("uses the saved timezone across a UTC date boundary", () => {
    const timestamp = Date.parse("2026-08-10T20:00:00.000Z")
    expect(dateKeyInTimeZone(timestamp, "Asia/Kolkata")).toBe("2026-08-11")
    expect(dateKeyInTimeZone(timestamp, "America/Los_Angeles")).toBe("2026-08-10")
  })

  it("falls back to UTC for an invalid timezone", () => {
    expect(dateKeyInTimeZone(Date.parse("2026-08-10T20:00:00.000Z"), "Mars/Olympus")).toBe(
      "2026-08-10"
    )
  })
})
