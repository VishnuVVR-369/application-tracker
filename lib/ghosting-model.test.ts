import { describe, expect, it } from "vitest"

import type { ApplicationRecord } from "@/lib/application-model"
import {
  buildGhostingModel,
  getDaysSilent,
  shouldAutoCloseAsGhosted,
} from "@/lib/ghosting-model"

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date("2026-07-01T12:00:00.000Z")

function makeApp(overrides: Partial<ApplicationRecord>): ApplicationRecord {
  const created = NOW.getTime() - 60 * DAY
  return {
    id: "app-1",
    companyName: "Acme",
    companyKey: "acme",
    roleTitle: "Engineer",
    roleKey: "engineer",
    stage: "applied",
    currentStageEnteredAt: created,
    qualityChecks: [],
    archived: false,
    createdAt: created,
    updatedAt: created,
    lastActivityAt: created,
    ...overrides,
  }
}

describe("ghosting-model", () => {
  it("flags applied apps silent for 14+ days and escalates at 30", () => {
    const fresh = makeApp({ id: "fresh", lastActivityAt: NOW.getTime() - 5 * DAY })
    const nudge = makeApp({ id: "nudge", lastActivityAt: NOW.getTime() - 20 * DAY })
    const strong = makeApp({ id: "strong", lastActivityAt: NOW.getTime() - 35 * DAY })

    const { nudges } = buildGhostingModel({ applications: [fresh, nudge, strong], now: NOW })

    expect(nudges.map((item) => item.application.id)).toEqual(["strong", "nudge"])
    expect(nudges[0].level).toBe("strong")
    expect(nudges[0].daysUntilAutoClose).toBe(10)
    expect(nudges[1].level).toBe("nudge")
  })

  it("uses the later of applied date and last activity as the silence start", () => {
    const app = makeApp({
      lastActivityAt: NOW.getTime() - 40 * DAY,
      dateAppliedDate: "2026-06-21",
    })
    expect(getDaysSilent(app, NOW)).toBeLessThan(14)
    expect(buildGhostingModel({ applications: [app], now: NOW }).nudges).toHaveLength(0)
  })

  it("skips snoozed, archived, and non-applied applications", () => {
    const silent = { lastActivityAt: NOW.getTime() - 20 * DAY }
    const snoozed = makeApp({ ...silent, id: "snoozed", ghostNudgeSnoozedUntilDate: "2026-07-05" })
    const snoozeExpired = makeApp({ ...silent, id: "expired", ghostNudgeSnoozedUntilDate: "2026-06-25" })
    const archived = makeApp({ ...silent, id: "archived", archived: true })
    const interviewing = makeApp({ ...silent, id: "interviewing", stage: "interview" })

    const { nudges } = buildGhostingModel({
      applications: [snoozed, snoozeExpired, archived, interviewing],
      now: NOW,
    })
    expect(nudges.map((item) => item.application.id)).toEqual(["expired"])
  })

  it("auto-closes only past 45 days of silence, respecting snooze", () => {
    const at44 = makeApp({ lastActivityAt: NOW.getTime() - 44 * DAY })
    const at45 = makeApp({ lastActivityAt: NOW.getTime() - 45 * DAY })
    const at45Snoozed = makeApp({
      lastActivityAt: NOW.getTime() - 45 * DAY,
      ghostNudgeSnoozedUntilDate: "2026-07-08",
    })

    expect(shouldAutoCloseAsGhosted(at44, NOW)).toBe(false)
    expect(shouldAutoCloseAsGhosted(at45, NOW)).toBe(true)
    expect(shouldAutoCloseAsGhosted(at45Snoozed, NOW)).toBe(false)
  })
})
