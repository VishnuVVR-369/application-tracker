import { describe, expect, it } from "vitest"

import type {
  ApplicationRecord,
  ApplicationStageHistory,
} from "@/lib/application-model"
import { buildEffortRoiModel } from "@/lib/effort-roi-model"

let counter = 0

function makeApp(overrides: Partial<ApplicationRecord>): ApplicationRecord {
  counter += 1
  const at = Date.parse("2026-05-01T00:00:00.000Z")
  return {
    id: `app-${counter}`,
    companyName: "Acme",
    companyKey: "acme",
    roleTitle: "Engineer",
    roleKey: "engineer",
    stage: "applied",
    currentStageEnteredAt: at,
    qualityChecks: [],
    archived: false,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  }
}

function history(applicationId: string, stage: ApplicationStageHistory["stage"]): ApplicationStageHistory {
  const at = Date.parse("2026-05-10T00:00:00.000Z")
  return {
    id: `hist-${applicationId}-${stage}`,
    applicationId,
    stage,
    enteredAt: at,
    source: "user",
    createdAt: at,
    updatedAt: at,
  }
}

describe("effort-roi-model", () => {
  it("computes response and interview rates by application type", () => {
    const apps = [
      // 2 quick applies: one silent, one ghosted — zero responses.
      makeApp({ applicationType: "quick_apply" }),
      makeApp({ applicationType: "quick_apply", stage: "closed", closedOutcome: "ghosted" }),
      // 2 referral-backed: one at interview now, one rejected after onsite.
      makeApp({ applicationType: "referral_backed", stage: "interview" }),
      makeApp({
        applicationType: "referral_backed",
        stage: "closed",
        closedOutcome: "rejected",
        rejectionStage: "onsite",
      }),
    ]
    const model = buildEffortRoiModel({ applications: apps, stageHistory: [] })

    const quick = model.byType.find((row) => row.key === "quick_apply")
    const referral = model.byType.find((row) => row.key === "referral_backed")
    expect(quick).toMatchObject({ total: 2, responseRate: 0, interviewRate: 0 })
    expect(referral).toMatchObject({ total: 2, responseRate: 100, interviewRate: 100 })
    expect(model.total).toBe(4)
  })

  it("counts responses from stage history even after the app closed", () => {
    const app = makeApp({
      applicationType: "tailored_apply",
      stage: "closed",
      closedOutcome: "rejected",
    })
    const model = buildEffortRoiModel({
      applications: [app],
      stageHistory: [history(app.id, "applied"), history(app.id, "phone_screen")],
    })
    const tailored = model.byType.find((row) => row.key === "tailored_apply")
    expect(tailored).toMatchObject({ responded: 1, interviewed: 0, lowSample: true })
  })

  it("excludes saved and archived apps and groups sources", () => {
    const apps = [
      makeApp({ stage: "saved", source: "linkedin" }),
      makeApp({ archived: true, source: "linkedin" }),
      makeApp({ source: "linkedin", stage: "phone_screen" }),
      makeApp({ source: "referral" }),
      makeApp({}),
    ]
    const model = buildEffortRoiModel({ applications: apps, stageHistory: [] })

    expect(model.total).toBe(3)
    expect(model.bySource.map((row) => row.key)).toEqual(["linkedin", "referral", "unspecified"])
    expect(model.bySource[0]).toMatchObject({ total: 1, responseRate: 100 })
  })

  it("produces a takeaway only with enough sample in two types", () => {
    const quick = Array.from({ length: 6 }, () => makeApp({ applicationType: "quick_apply" }))
    const referral = Array.from({ length: 6 }, () =>
      makeApp({ applicationType: "referral_backed", stage: "phone_screen" })
    )
    const withSample = buildEffortRoiModel({
      applications: [...quick, ...referral],
      stageHistory: [],
    })
    expect(withSample.takeaway).toContain("Referral backed")

    const tiny = buildEffortRoiModel({ applications: [quick[0], referral[0]], stageHistory: [] })
    expect(tiny.takeaway).toBeUndefined()
  })
})
