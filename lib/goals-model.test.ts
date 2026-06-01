import { describe, expect, it } from "vitest"

import type { ApplicationRecord, TaskRecord, WinLogEntry } from "@/lib/application-model"
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
      companyKey: "acme",
      roleTitle: "Engineer",
      roleKey: "engineer",
      stage: "applied",
      currentStageEnteredAt: Date.parse("2026-06-03T00:00:00.000Z"),
      dateAppliedDate: "2026-06-03",
      qualityChecks: [],
      archived: false,
      createdAt: Date.parse("2026-06-01T00:00:00.000Z"),
      updatedAt: Date.parse("2026-06-01T00:00:00.000Z"),
    }
    const task: TaskRecord = {
      id: "task-1",
      title: "Follow up",
      dueAt: Date.parse("2026-06-03T00:00:00.000Z"),
      status: "completed",
      kind: "follow_up",
      source: "manual",
      createdAt: Date.parse("2026-06-01T00:00:00.000Z"),
      updatedAt: Date.parse("2026-06-04T00:00:00.000Z"),
      completedAt: Date.parse("2026-06-04T00:00:00.000Z"),
    }
    const win: WinLogEntry = {
      id: "win-1",
      type: "interview_reached",
      title: "Interview",
      occurredAt: Date.parse("2026-06-05T00:00:00.000Z"),
      occurredDate: "2026-06-05",
      source: "auto",
      createdAt: Date.parse("2026-06-05T00:00:00.000Z"),
    }
    expect(
      calculateGoalProgress({
        goal,
        applications: [app],
        tasks: [task],
        wins: [win],
      }).map((metric) => metric.actual)
    ).toEqual([1, 1, 1, 0])
  })
})
