import { describe, expect, it } from "vitest"

import {
  calculateQualityScore,
  createQualitySnapshot,
  seedQualityChecklist,
} from "@/lib/quality-model"

describe("quality-model", () => {
  it("seeds the default checklist", () => {
    expect(seedQualityChecklist()).toHaveLength(5)
  })

  it("normalizes enabled weights into a 0-100 score", () => {
    const snapshot = createQualitySnapshot(seedQualityChecklist(), [
      "role-fit",
      "tailored-resume",
    ])
    expect(calculateQualityScore(snapshot)).toBe(50)
  })

  it("keeps disabled or zero-weight edge cases bounded", () => {
    expect(calculateQualityScore([])).toBe(0)
    expect(
      calculateQualityScore([
        { key: "x", label: "x", checked: true, weight: 0, source: "custom", sortOrder: 0 },
      ])
    ).toBe(0)
  })
})
