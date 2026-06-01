import { describe, expect, it } from "vitest"

import type { ApplicationRecord, ApplicationStageHistory } from "@/lib/application-model"
import { buildAnalyticsModel } from "@/lib/analytics-model"

const base: ApplicationRecord = {
  id: "app-1",
  companyName: "Acme",
  companyKey: "acme",
  roleTitle: "Engineer",
  roleKey: "engineer",
  stage: "applied",
  currentStageEnteredAt: Date.parse("2026-06-01T00:00:00.000Z"),
  dateAppliedDate: "2026-06-01",
  source: "linkedin",
  referralStatus: "not_checked",
  qualityChecks: [],
  archived: false,
  createdAt: Date.parse("2026-06-01T00:00:00.000Z"),
  updatedAt: Date.parse("2026-06-01T00:00:00.000Z"),
}

describe("analytics-model", () => {
  it("computes funnel counts and filters closed applications by default", () => {
    const model = buildAnalyticsModel({
      applications: [
        base,
        { ...base, id: "app-2", stage: "interview" },
        { ...base, id: "app-3", stage: "closed", closedOutcome: "rejected" },
      ],
      activityEvents: [],
      resumes: [],
      filters: { includeArchived: false, includeClosed: false },
    })
    expect(model.funnel.map((item) => item.count)).toEqual([2, 1, 1, 0])
    expect(model.rejection.closedExcluded).toBe(true)
    expect(model.rejection.outcomes).toHaveLength(0)
  })

  it("uses stage history for first response timing", () => {
    const stageEvent: ApplicationStageHistory = {
      id: "history-1",
      applicationId: "app-1",
      stage: "phone_screen",
      enteredAt: Date.parse("2026-06-04T00:00:00.000Z"),
      enteredFromStage: "applied",
      createdAt: Date.parse("2026-06-04T00:00:00.000Z"),
      updatedAt: Date.parse("2026-06-04T00:00:00.000Z"),
    }
    const model = buildAnalyticsModel({
      applications: [base],
      activityEvents: [],
      stageHistory: [stageEvent],
      resumes: [],
      filters: { includeArchived: false, includeClosed: true },
    })
    expect(model.timing.avgTimeToFirstResponse).toBe(3)
  })
})
