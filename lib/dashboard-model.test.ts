import { describe, expect, it } from "vitest"

import type { ApplicationRecord, ReminderRecord } from "@/lib/application-model"
import { buildDashboardModel } from "@/lib/dashboard-model"

describe("dashboard-model", () => {
  it("detects attention items and due reminders", () => {
    const app: ApplicationRecord = {
      id: "app-1",
      companyName: "Acme",
      roleTitle: "Engineer",
      stage: "applied",
      referralStatus: "not_checked",
      qualityChecks: [],
      archived: false,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
      lastActivityAt: "2026-05-01T00:00:00.000Z",
    }
    const reminder: ReminderRecord = {
      id: "rem-1",
      title: "Follow up",
      dueAt: "2026-06-03T00:00:00.000Z",
      status: "pending",
      reminderType: "follow_up",
      createdAt: "2026-06-01T00:00:00.000Z",
    }
    const model = buildDashboardModel({
      applications: [app],
      reminders: [reminder],
      activityEvents: [],
      now: new Date("2026-06-01T12:00:00.000Z"),
    })
    expect(model.attentionItems.find((item) => item.key === "stale-active")?.count).toBe(1)
    expect(model.dueThisWeek).toHaveLength(1)
  })
})

