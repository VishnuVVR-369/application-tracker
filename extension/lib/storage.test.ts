import { describe, expect, it } from "vitest"

import { normalizeTrackerUrl } from "./storage"

describe("extension storage helpers", () => {
  it("normalizes production and localhost tracker URLs", () => {
    expect(normalizeTrackerUrl("https://way2more.vercel.app/ ")).toBe("https://way2more.vercel.app")
    expect(normalizeTrackerUrl("http://localhost:3000/")).toBe("http://localhost:3000")
  })

  it("rejects insecure non-local tracker URLs", () => {
    expect(() => normalizeTrackerUrl("http://example.com")).toThrow("Use HTTPS")
    expect(() => normalizeTrackerUrl("https://example.com")).toThrow("personal release")
  })
})
