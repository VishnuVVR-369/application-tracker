import { describe, expect, it } from "vitest"

import { normalizeAppData, type AppData } from "@/lib/app-data-model"

describe("app-data-model", () => {
  it("normalizes missing app data collections to empty arrays", () => {
    const partial = {
      user: {
        _id: "user-1",
        _creationTime: 0,
        authSubject: "subject",
        tokenIdentifier: "token",
        createdAt: 0,
        updatedAt: 0,
      },
      settings: null,
      applications: [],
      resumes: [],
    } as unknown as AppData

    const normalized = normalizeAppData(partial)

    expect(normalized?.tasks).toEqual([])
    expect(normalized?.activityEvents).toEqual([])
    expect(normalized?.applicationStageHistory).toEqual([])
    expect(normalized?.applicationContacts).toEqual([])
    expect(normalized?.applicationInterviews).toEqual([])
    expect(normalized?.applicationOffers).toEqual([])
    expect(normalized?.weeklyGoals).toEqual([])
    expect(normalized?.winLogEntries).toEqual([])
    expect(normalized?.qualityChecklistItems).toEqual([])
    expect(normalized?.applicationResumeLinks).toEqual([])
    expect(normalized?.resumeUsage).toEqual({})
    expect(normalized?.targetCompanies).toEqual([])
    expect(normalized?.referralOutreach).toEqual([])
    expect(normalized?.interviewPrepPlans).toEqual([])
    expect(normalized?.storyBankEntries).toEqual([])
    expect(normalized?.storyUsages).toEqual([])
  })
})
