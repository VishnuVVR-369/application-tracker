import { describe, expect, it } from "vitest"

import { shouldShowOnboarding } from "@/lib/onboarding-model"

describe("onboarding-model", () => {
  it("shows onboarding only for an explicit active status", () => {
    expect(shouldShowOnboarding({ status: "active" })).toBe(true)
  })

  it("does not interrupt a legacy account with a missing status", () => {
    expect(shouldShowOnboarding({})).toBe(false)
  })

  it("keeps completed and dismissed onboarding out of the way", () => {
    expect(shouldShowOnboarding({ status: "completed" })).toBe(false)
    expect(shouldShowOnboarding({ status: "dismissed" })).toBe(false)
  })
})
