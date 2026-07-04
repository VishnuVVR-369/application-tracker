import { describe, expect, it } from "vitest"

import type {
  ApplicationInterview,
  ApplicationOffer,
  ApplicationRecord,
} from "@/lib/application-model"
import { buildRaceModel } from "@/lib/race-model"

const NOW = new Date("2026-07-01T09:00:00.000Z")
const DAY = 24 * 60 * 60 * 1000

function makeApp(id: string, overrides: Partial<ApplicationRecord> = {}): ApplicationRecord {
  const at = NOW.getTime() - 30 * DAY
  return {
    id,
    companyName: id,
    companyKey: id,
    roleTitle: "Engineer",
    roleKey: "engineer",
    stage: "interview",
    currentStageEnteredAt: at,
    qualityChecks: [],
    archived: false,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  }
}

function makeInterview(applicationId: string, daysFromNow: number): ApplicationInterview {
  return {
    id: `interview-${applicationId}-${daysFromNow}`,
    applicationId,
    status: "scheduled",
    scheduledAt: NOW.getTime() + daysFromNow * DAY,
    contactIds: [],
    createdAt: NOW.getTime(),
    updatedAt: NOW.getTime(),
  }
}

function makeOffer(applicationId: string, responseDeadlineDate: string): ApplicationOffer {
  return {
    id: `offer-${applicationId}`,
    applicationId,
    versionNumber: 1,
    isCurrent: true,
    responseDeadlineDate,
    decision: "pending",
    createdAt: NOW.getTime(),
    updatedAt: NOW.getTime(),
  }
}

describe("race-model", () => {
  it("builds lanes sorted by next event and keeps events in the window", () => {
    const alpha = makeApp("Alpha")
    const beta = makeApp("Beta", { takeHomeDeadlineDate: "2026-07-03" })
    const model = buildRaceModel({
      applications: [alpha, beta],
      interviews: [makeInterview("Alpha", 5), makeInterview("Alpha", 45)],
      offers: [],
      now: NOW,
    })

    expect(model.lanes.map((lane) => lane.application.companyName)).toEqual(["Beta", "Alpha"])
    // The 45-day interview falls outside the 30-day window.
    expect(model.lanes[1].events).toHaveLength(1)
    expect(model.lanes[1].events[0].dayOffset).toBe(5)
  })

  it("flags offer deadlines that collide with slower loops", () => {
    const offerApp = makeApp("OfferCo", { stage: "offer" })
    const slowLoop = makeApp("SlowCo")
    const fastLoop = makeApp("FastCo")
    const model = buildRaceModel({
      applications: [offerApp, slowLoop, fastLoop],
      interviews: [makeInterview("SlowCo", 12), makeInterview("FastCo", 2)],
      offers: [makeOffer("OfferCo", "2026-07-06")],
      now: NOW,
    })

    expect(model.collisions).toHaveLength(1)
    expect(model.collisions[0].companyName).toBe("OfferCo")
    expect(model.collisions[0].conflicts).toEqual(["SlowCo"])
  })

  it("keeps overdue pending offer deadlines and skips closed/archived apps", () => {
    const overdueOffer = makeApp("Overdue", { stage: "offer" })
    const closed = makeApp("Closed", { stage: "closed", takeHomeDeadlineDate: "2026-07-05" })
    const archived = makeApp("Archived", { archived: true })
    const model = buildRaceModel({
      applications: [overdueOffer, closed, archived],
      interviews: [makeInterview("Archived", 3)],
      offers: [makeOffer("Overdue", "2026-06-28")],
      now: NOW,
    })

    expect(model.lanes).toHaveLength(1)
    expect(model.lanes[0].events[0]).toMatchObject({
      kind: "offer_deadline",
      overdue: true,
      dayOffset: 0,
    })
  })

  it("uses application deadlines only for saved apps", () => {
    const saved = makeApp("SavedCo", { stage: "saved", applicationDeadlineDate: "2026-07-10" })
    const applied = makeApp("AppliedCo", { stage: "applied", applicationDeadlineDate: "2026-07-10" })
    const model = buildRaceModel({
      applications: [saved, applied],
      interviews: [],
      offers: [],
      now: NOW,
    })

    expect(model.lanes).toHaveLength(1)
    expect(model.lanes[0].application.companyName).toBe("SavedCo")
    expect(model.lanes[0].events[0].kind).toBe("app_deadline")
  })
})
