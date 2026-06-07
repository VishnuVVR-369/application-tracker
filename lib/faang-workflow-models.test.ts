import { describe, expect, it } from "vitest"

import type {
  ApplicationInterview,
  ApplicationRecord,
  InterviewPrepPlanRecord,
  ReferralOutreachRecord,
  StoryBankEntryRecord,
  TargetCompanyRecord,
} from "@/lib/application-model"
import { buildFailureAnalyticsModel } from "@/lib/failure-analytics-model"
import { prepReadinessScore } from "@/lib/prep-model"
import { buildReferralModel } from "@/lib/referral-model"
import { buildStoryBankModel, storyCompleteness } from "@/lib/story-bank-model"
import { buildTargetCompanyModel, targetReadinessScore } from "@/lib/target-company-model"

const now = Date.parse("2026-06-01T09:00:00.000Z")

function target(overrides: Partial<TargetCompanyRecord> = {}): TargetCompanyRecord {
  return {
    id: "target-1",
    companyName: "MetaCloud",
    companyKey: "metacloud",
    tier: "dream",
    status: "warming_referrals",
    targetRoles: ["Senior Backend Engineer"],
    priorityScore: 90,
    roleFitScore: 80,
    referralGoal: 2,
    researchNotes: "Research done",
    hiringBarNotes: "High senior bar",
    interviewProcessNotes: "Coding and design",
    archived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function outreach(overrides: Partial<ReferralOutreachRecord> = {}): ReferralOutreachRecord {
  return {
    id: "outreach-1",
    targetCompanyId: "target-1",
    contactName: "Arjun",
    source: "linkedin",
    status: "replied",
    followUpDate: "2026-06-01",
    archived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function application(overrides: Partial<ApplicationRecord> = {}): ApplicationRecord {
  return {
    id: "app-1",
    companyName: "MetaCloud",
    companyKey: "metacloud",
    roleTitle: "Senior Backend Engineer",
    roleKey: "senior-backend-engineer",
    stage: "closed",
    currentStageEnteredAt: now,
    applicationType: "quick_apply",
    qualityChecks: [],
    closedOutcome: "rejected",
    rejectionReason: "experience_gap",
    archived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function prep(overrides: Partial<InterviewPrepPlanRecord> = {}): InterviewPrepPlanRecord {
  return {
    id: "prep-1",
    title: "MetaCloud loop",
    status: "in_progress",
    focusAreas: ["dsa", "system_design"],
    codingDrillsTarget: 20,
    codingDrillsDone: 10,
    systemDesignDrillsTarget: 4,
    systemDesignDrillsDone: 2,
    behavioralStoriesTarget: 6,
    behavioralStoriesReady: 3,
    mockInterviewsTarget: 2,
    mockInterviewsDone: 1,
    companyResearchDone: true,
    resumeDeepDiveDone: false,
    weaknessTags: ["graphs"],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function story(overrides: Partial<StoryBankEntryRecord> = {}): StoryBankEntryRecord {
  return {
    id: "story-1",
    title: "Reliability project",
    situation: "A production service was repeatedly failing during traffic spikes.",
    task: "Own the stabilization plan and keep customer-facing work moving.",
    action: "Redesigned retries, added backpressure, and led a staged rollout with clear rollback gates.",
    result: "The service stabilized and on-call engineers had better overload visibility.",
    impactMetrics: "Reduced incident pages by 45%.",
    technologies: ["Kafka"],
    competencies: ["ownership", "technical_depth", "system_design"],
    senioritySignal: "Led cross-team tradeoff decisions.",
    archived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe("FAANG workflow models", () => {
  it("scores target readiness from role fit, research, and referral progress", () => {
    expect(targetReadinessScore(target(), [outreach(), outreach({ id: "outreach-2", status: "messaged" })])).toBeGreaterThan(80)

    const model = buildTargetCompanyModel({
      targets: [target()],
      outreach: [outreach()],
      applications: [application({ stage: "applied" })],
    })
    expect(model.summary.dream).toBe(1)
    expect(model.summary.referralGaps).toBe(1)
    expect(model.rows[0].applications).toHaveLength(1)
  })

  it("computes referral metrics and due follow-ups", () => {
    const model = buildReferralModel(
      [
        outreach({ status: "messaged", followUpDate: "2026-06-01" }),
        outreach({ id: "outreach-2", status: "referred", followUpDate: "2026-05-30" }),
      ],
      "2026-06-02"
    )

    expect(model.metrics.contacted).toBe(2)
    expect(model.metrics.referralRate).toBe(50)
    expect(model.dueFollowUps.map((item) => item.id)).toEqual(["outreach-1"])
  })

  it("scores prep and story readiness", () => {
    expect(prepReadinessScore(prep())).toBe(50)
    expect(prepReadinessScore(prep({ status: "ready", resumeDeepDiveDone: true }))).toBeGreaterThan(70)

    expect(storyCompleteness(story())).toBe(100)
    const storyModel = buildStoryBankModel({ stories: [story()], usages: [] })
    expect(storyModel.summary.ready).toBe(1)
    expect(storyModel.missingCompetencies).toContain("leadership")
  })

  it("surfaces failure-pattern signals for cold apply, low prep, and thin stories", () => {
    const interview: ApplicationInterview = {
      id: "interview-1",
      applicationId: "app-1",
      interviewType: "system_design",
      status: "completed",
      contactIds: [],
      result: "rejected",
      createdAt: now,
      updatedAt: now,
    }
    const model = buildFailureAnalyticsModel({
      applications: [
        application(),
        application({ id: "app-2", companyName: "Searchly", companyKey: "searchly" }),
        application({ id: "app-3", companyName: "RetailCo", companyKey: "retailco", stage: "applied" }),
      ],
      interviews: [interview, { ...interview, id: "interview-2" }],
      outreach: [
        outreach({ status: "messaged" }),
        outreach({ id: "outreach-2", status: "replied" }),
        outreach({ id: "outreach-3", status: "messaged" }),
        outreach({ id: "outreach-4", status: "messaged" }),
        outreach({ id: "outreach-5", status: "messaged" }),
      ],
      prepPlans: [prep({ codingDrillsDone: 0, systemDesignDrillsDone: 0 })],
      stories: [
        story({ situation: "thin", task: "thin", action: "thin", result: "thin", impactMetrics: undefined, senioritySignal: undefined }),
        story({ id: "story-2", situation: "thin", task: "thin", action: "thin", result: "thin", impactMetrics: undefined, senioritySignal: undefined }),
        story({ id: "story-3", situation: "thin", task: "thin", action: "thin", result: "thin", impactMetrics: undefined, senioritySignal: undefined }),
      ],
    })

    expect(model.summary.coldApplyRate).toBe(100)
    expect(model.signals.map((signal) => signal.key)).toEqual(
      expect.arrayContaining(["cold-apply-heavy", "prep-readiness-low", "story-bank-thin", "interview-failures"])
    )
    expect(model.interviewFailures[0]).toEqual({ label: "system_design", count: 2 })
  })
})
