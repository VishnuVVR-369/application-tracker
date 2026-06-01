import { describe, expect, it } from "vitest"

import type { ApplicationRecord, ReminderRecord, WinLogEntry } from "@/lib/application-model"
import {
  calculateGoalProgress,
  createDefaultWeeklyGoal,
  getWeekKey,
  getMondayWeekStart,
} from "@/lib/goals-model"

describe("goals-model", () => {
  it("uses Monday week starts", () => {
    expect(getWeekKey(new Date("2026-06-07T12:00:00.000Z"))).toBe("2026-06-01")
    expect(getMondayWeekStart(new Date("2026-06-03T12:00:00.000Z")).getDay()).toBe(1)
  })

  it("computes weekly progress", () => {
    const goal = createDefaultWeeklyGoal("2026-06-01")
    const app: ApplicationRecord = {
      id: "app-1",
      companyName: "Acme",
      roleTitle: "Engineer",
      stage: "applied",
      dateApplied: "2026-06-03",
      qualityChecks: [],
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }
    const reminder: ReminderRecord = {
      id: "rem-1",
      title: "Follow up",
      dueAt: "2026-06-03T00:00:00.000Z",
      status: "completed",
      reminderType: "follow_up",
      createdAt: "2026-06-01T00:00:00.000Z",
      completedAt: "2026-06-04T00:00:00.000Z",
    }
    const win: WinLogEntry = {
      id: "win-1",
      type: "interview_reached",
      title: "Interview",
      occurredAt: "2026-06-05T00:00:00.000Z",
      source: "auto",
      createdAt: "2026-06-05T00:00:00.000Z",
    }
    expect(
      calculateGoalProgress({
        goal,
        applications: [app],
        reminders: [reminder],
        wins: [win],
      }).map((metric) => metric.actual)
    ).toEqual([1, 1, 1, 0])
  })
})

