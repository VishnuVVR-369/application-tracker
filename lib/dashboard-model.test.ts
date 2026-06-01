import { describe, expect, it } from "vitest"

import type { ApplicationRecord, TaskRecord } from "@/lib/application-model"
import { buildDashboardModel } from "@/lib/dashboard-model"

describe("dashboard-model", () => {
  it("detects attention items and due tasks", () => {
    const app: ApplicationRecord = {
      id: "app-1",
      companyName: "Acme",
      companyKey: "acme",
      roleTitle: "Engineer",
      roleKey: "engineer",
      stage: "applied",
      currentStageEnteredAt: Date.parse("2026-05-01T00:00:00.000Z"),
      referralStatus: "not_checked",
      qualityChecks: [],
      archived: false,
      createdAt: Date.parse("2026-05-01T00:00:00.000Z"),
      updatedAt: Date.parse("2026-05-01T00:00:00.000Z"),
      lastActivityAt: Date.parse("2026-05-01T00:00:00.000Z"),
    }
    const task: TaskRecord = {
      id: "task-1",
      title: "Follow up",
      dueAt: Date.parse("2026-06-03T00:00:00.000Z"),
      status: "pending",
      kind: "follow_up",
      source: "manual",
      createdAt: Date.parse("2026-06-01T00:00:00.000Z"),
      updatedAt: Date.parse("2026-06-01T00:00:00.000Z"),
    }
    const model = buildDashboardModel({
      applications: [app],
      tasks: [task],
      activityEvents: [],
      now: new Date("2026-06-01T12:00:00.000Z"),
    })
    expect(model.attentionItems.find((item) => item.key === "stale-active")?.count).toBe(1)
    expect(model.dueThisWeek).toHaveLength(1)
  })
})
