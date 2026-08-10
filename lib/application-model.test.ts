import { describe, expect, it } from "vitest"

import {
  APPLICATION_STAGES,
  canMoveApplicationStage,
  formatApplicationSalary,
  getStageCounts,
  STAGE_LABELS,
  type ApplicationRecord,
} from "@/lib/application-model"

const baseApplication: ApplicationRecord = {
  id: "app-1",
  companyName: "Acme",
  companyKey: "acme",
  roleTitle: "Engineer",
  roleKey: "engineer",
  stage: "saved",
  currentStageEnteredAt: Date.parse("2026-06-01T00:00:00.000Z"),
  qualityChecks: [],
  archived: false,
  createdAt: Date.parse("2026-06-01T00:00:00.000Z"),
  updatedAt: Date.parse("2026-06-01T00:00:00.000Z"),
}

describe("application-model", () => {
  it("keeps the settled stage order and labels", () => {
    expect(APPLICATION_STAGES).toEqual([
      "saved",
      "applied",
      "phone_screen",
      "interview",
      "offer",
      "closed",
    ])
    expect(STAGE_LABELS.phone_screen).toBe("Phone screen")
  })

  it("allows any stage jump", () => {
    expect(canMoveApplicationStage("saved", "offer")).toBe(true)
    expect(canMoveApplicationStage("closed", "applied")).toBe(true)
  })

  it("counts applications by stage", () => {
    expect(
      getStageCounts([
        baseApplication,
        { ...baseApplication, id: "app-2", stage: "applied" },
        { ...baseApplication, id: "app-3", stage: "applied" },
      ]).applied
    ).toBe(2)
  })

  it("does not invent a currency for compensation", () => {
    expect(formatApplicationSalary({
      ...baseApplication,
      compensationMin: 100_000,
      compensationMax: 120_000,
      compensationPeriod: "year",
    })).toBe("100,000 - 120,000 / year (currency not specified)")
    expect(formatApplicationSalary({
      ...baseApplication,
      compensationMin: 100_000,
      compensationMax: 120_000,
      compensationNotes: "$100k-$120k per year",
    })).toBe("$100k-$120k per year")
  })
})
