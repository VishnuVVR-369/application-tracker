import { describe, expect, it } from "vitest"

import type { ActivityEvent, ApplicationRecord } from "@/lib/application-model"
import { buildAnalyticsModel } from "@/lib/analytics-model"

const base: ApplicationRecord = {
  id: "app-1",
  companyName: "Acme",
  roleTitle: "Engineer",
  stage: "applied",
  dateApplied: "2026-06-01",
  source: "linkedin",
  referralStatus: "not_checked",
  qualityChecks: [],
  archived: false,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
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

  it("uses activity for first response timing", () => {
    const event: ActivityEvent = {
      id: "event-1",
      applicationId: "app-1",
      type: "stage_changed",
      title: "Moved",
      source: "auto",
      eventDate: "2026-06-04T00:00:00.000Z",
      createdAt: "2026-06-04T00:00:00.000Z",
      toStage: "phone_screen",
      fromStage: "applied",
    }
    const model = buildAnalyticsModel({
      applications: [base],
      activityEvents: [event],
      resumes: [],
      filters: { includeArchived: false, includeClosed: true },
    })
    expect(model.timing.avgTimeToFirstResponse).toBe(3)
  })
})
