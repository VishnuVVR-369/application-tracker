import { describe, expect, it } from "vitest"

import { shouldShowOnboarding } from "@/lib/onboarding-model"

describe("onboarding-model", () => {
  it("starts onboarding for an account without applications", () => {
    expect(shouldShowOnboarding({ applicationCount: 0 })).toBe(true)
  })

  it("does not interrupt an existing account unless onboarding was restarted", () => {
    expect(shouldShowOnboarding({ applicationCount: 3 })).toBe(false)
    expect(shouldShowOnboarding({ applicationCount: 3, status: "active" })).toBe(true)
  })

  it("keeps completed and dismissed onboarding out of the way", () => {
    expect(shouldShowOnboarding({ applicationCount: 0, status: "completed" })).toBe(false)
    expect(shouldShowOnboarding({ applicationCount: 0, status: "dismissed" })).toBe(false)
  })
})
