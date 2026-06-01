import { describe, expect, it } from "vitest"

import {
  APPLICATION_STAGES,
  canMoveApplicationStage,
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
})
