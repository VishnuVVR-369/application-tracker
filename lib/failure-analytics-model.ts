import type {
  ApplicationInterview,
  ApplicationRecord,
  InterviewPrepPlanRecord,
  ReferralOutreachRecord,
  StoryBankEntryRecord,
} from "@/lib/application-model"
import { prepReadinessScore } from "@/lib/prep-model"
import { storyCompleteness } from "@/lib/story-bank-model"

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

export function buildFailureAnalyticsModel(args: {
  applications: ApplicationRecord[]
  interviews: ApplicationInterview[]
  outreach: ReferralOutreachRecord[]
  prepPlans: InterviewPrepPlanRecord[]
  stories: StoryBankEntryRecord[]
}) {
  const applied = args.applications.filter((application) => application.stage !== "saved" && !application.archived)
  const closedRejected = args.applications.filter(
    (application) => application.stage === "closed" && application.closedOutcome === "rejected" && !application.archived
  )
  const coldApplied = applied.filter((application) => application.applicationType !== "referral_backed")
  const referralBacked = applied.filter((application) => application.applicationType === "referral_backed")
  const rejectedInterviews = args.interviews.filter((interview) => interview.result === "rejected")
  const lowPrep = args.prepPlans.filter((plan) => prepReadinessScore(plan) < 60)
  const thinStories = args.stories.filter((story) => !story.archived && storyCompleteness(story) < 70)

  const rejectionReasons = Object.entries(
    countBy(closedRejected.flatMap((application) => application.rejectionReason ?? []))
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  const interviewFailures = Object.entries(
    countBy(rejectedInterviews.flatMap((interview) => interview.interviewType ?? "unknown"))
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  const referralContacts = args.outreach.filter((item) => !item.archived && item.status !== "not_contacted")
  const referred = referralContacts.filter((item) => item.status === "referred")
  const signals = [
    coldApplied.length >= referralBacked.length * 2
      ? {
          key: "cold-apply-heavy",
          severity: "high" as const,
          title: "Too much cold apply volume",
          detail: `${coldApplied.length} cold or non-referral-backed applications versus ${referralBacked.length} referral-backed.`,
          action: "Move dream/strong companies through referral outreach before applying.",
        }
      : null,
    pct(referred.length, referralContacts.length) < 20 && referralContacts.length >= 5
      ? {
          key: "referral-conversion-low",
          severity: "medium" as const,
          title: "Referral conversion is weak",
          detail: `${pct(referred.length, referralContacts.length)}% of contacted referral leads reached referred.`,
          action: "Tighten the outreach ask, prefer warmer connections, and follow up on due contacts.",
        }
      : null,
    lowPrep.length > 0
      ? {
          key: "prep-readiness-low",
          severity: "high" as const,
          title: "Some interview loops are underprepared",
          detail: `${lowPrep.length} prep plan${lowPrep.length === 1 ? "" : "s"} below 60 readiness.`,
          action: "Close the lowest-scoring prep plan before adding new applications.",
        }
      : null,
    thinStories.length >= 3
      ? {
          key: "story-bank-thin",
          severity: "medium" as const,
          title: "Behavioral story evidence is thin",
          detail: `${thinStories.length} stories are missing metrics, seniority signal, or full STAR detail.`,
          action: "Upgrade the story bank before behavioral or hiring-manager rounds.",
        }
      : null,
    rejectedInterviews.length >= 2
      ? {
          key: "interview-failures",
          severity: "medium" as const,
          title: "Interview rejection pattern detected",
          detail: `${rejectedInterviews.length} interview rounds are marked rejected.`,
          action: "Tag the failed round type and schedule targeted drills or mocks.",
        }
      : null,
  ].filter((signal) => signal !== null)

  return {
    summary: {
      applied: applied.length,
      rejected: closedRejected.length,
      coldApplyRate: pct(coldApplied.length, applied.length),
      referralBackedRate: pct(referralBacked.length, applied.length),
      interviewRejects: rejectedInterviews.length,
      lowPrepPlans: lowPrep.length,
    },
    rejectionReasons,
    interviewFailures,
    signals,
  }
}
