import { describe, expect, it } from "vitest"

import {
  createQualitySnapshot,
  seedQualityChecklist,
  updateQualitySnapshotCheck,
} from "@/lib/quality-model"

describe("quality-model", () => {
  it("seeds the default checklist", () => {
    expect(seedQualityChecklist()).toHaveLength(5)
  })

  it("creates a factual snapshot of completed checks", () => {
    const snapshot = createQualitySnapshot(seedQualityChecklist(), [
      "role-fit",
      "tailored-resume",
    ])
    expect(snapshot.filter((check) => check.checked).map((check) => check.key)).toEqual([
      "role-fit",
      "tailored-resume",
    ])
  })

  it("updates a single checklist item without deriving a score", () => {
    const snapshot = createQualitySnapshot(seedQualityChecklist())
    const updated = updateQualitySnapshotCheck(snapshot, "role-fit", true)

    expect(updated.find((check) => check.key === "role-fit")?.checked).toBe(true)
    expect(updated.filter((check) => check.checked)).toHaveLength(1)
  })
})
