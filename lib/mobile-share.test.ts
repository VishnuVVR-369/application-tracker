import { describe, expect, it } from "vitest"

import {
  MOBILE_CAPTURE_TTL_MS,
  inferCompanyAndRole,
  isFreshMobileCaptureDraft,
  parseAndroidShare,
  safeAppCallback,
} from "./mobile-share"

describe("Android share parsing", () => {
  it("uses the Android text field when the url field is empty", () => {
    expect(
      parseAndroidShare({
        title: "Acme hiring Senior Engineer in Bengaluru | LinkedIn",
        text: "Take a look: https://www.linkedin.com/jobs/view/4250012345/?trackingId=abc",
        url: "",
      }, 100)
    ).toMatchObject({
      postingUrl: "https://www.linkedin.com/jobs/view/4250012345/?trackingId=abc",
      companyName: "Acme",
      roleTitle: "Senior Engineer",
      receivedAt: 100,
    })
  })

  it("prefers an explicit URL and strips share punctuation", () => {
    const draft = parseAndroidShare({
      title: "Platform Engineer at Example Co",
      text: "https://text.example/job",
      url: "https://jobs.example.com/roles/123).",
    })
    expect(draft.postingUrl).toBe("https://jobs.example.com/roles/123")
    expect(draft.companyName).toBe("Example Co")
    expect(draft.roleTitle).toBe("Platform Engineer")
  })

  it("rejects non-http and credential-bearing URLs", () => {
    expect(parseAndroidShare({ url: "javascript:alert(1)" }).postingUrl).toBe("")
    expect(parseAndroidShare({ text: "https://user:secret@example.com/job" }).postingUrl).toBe("")
  })

  it("does not guess ambiguous company and role titles", () => {
    expect(inferCompanyAndRole("Senior Engineer - Acme")).toEqual({
      companyName: "",
      roleTitle: "",
    })
  })

  it("accepts only fresh, structurally valid session drafts", () => {
    const draft = parseAndroidShare({ url: "https://example.com/job" }, 1_000)
    expect(isFreshMobileCaptureDraft(draft, 1_000 + MOBILE_CAPTURE_TTL_MS)).toBe(true)
    expect(isFreshMobileCaptureDraft(draft, 1_001 + MOBILE_CAPTURE_TTL_MS)).toBe(false)
    expect(isFreshMobileCaptureDraft({ ...draft, receivedAt: "today" }, 1_000)).toBe(false)
    expect(isFreshMobileCaptureDraft({ ...draft, sharedText: "x".repeat(20_001) }, 1_000)).toBe(false)
  })
})

describe("safe app callback", () => {
  it("keeps app-local callbacks", () => {
    expect(safeAppCallback("/app/capture?source=share#review")).toBe(
      "/app/capture?source=share#review"
    )
  })

  it.each(["https://evil.example", "//evil.example", "/settings", "/app\\evil"])(
    "falls back for unsafe callback %s",
    (value) => expect(safeAppCallback(value)).toBe("/app")
  )
})
