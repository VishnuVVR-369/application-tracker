import { describe, expect, it } from "vitest"

import { extensionRequestSchema } from "./extension-api-contract"

describe("extension API contract", () => {
  it("accepts a valid capture", () => {
    expect(
      extensionRequestSchema.safeParse({
        operation: {
          type: "create",
          capture: {
            jobId: "4250012345",
            postingUrl: "https://www.linkedin.com/jobs/view/4250012345/",
            companyName: "Acme",
            roleTitle: "Engineer",
            stage: "saved",
          },
        },
      }).success
    ).toBe(true)
  })

  it("rejects missing required fields and oversized descriptions", () => {
    const result = extensionRequestSchema.safeParse({
      operation: {
        type: "create",
        capture: {
          jobId: "4250012345",
          postingUrl: "not-a-url",
          companyName: "",
          roleTitle: "Engineer",
          stage: "saved",
          jobDescriptionSnapshot: "x".repeat(100_001),
        },
      },
    })
    expect(result.success).toBe(false)
  })
})
