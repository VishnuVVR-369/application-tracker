import type { InterviewPrepPlanRecord } from "@/lib/application-model"

function progress(done: number, target: number) {
  if (target <= 0) return 100
  return Math.max(0, Math.min(100, Math.round((done / target) * 100)))
}

export function prepReadinessScore(plan: InterviewPrepPlanRecord) {
  const drillScores = [
    progress(plan.codingDrillsDone, plan.codingDrillsTarget),
    progress(plan.systemDesignDrillsDone, plan.systemDesignDrillsTarget),
    progress(plan.behavioralStoriesReady, plan.behavioralStoriesTarget),
    progress(plan.mockInterviewsDone, plan.mockInterviewsTarget),
  ]
  const binaryScores = [
    plan.companyResearchDone ? 100 : 0,
    plan.resumeDeepDiveDone ? 100 : 0,
  ]
  const statusAdjustment =
    plan.status === "ready" ? 8 : plan.status === "needs_work" ? -10 : plan.status === "not_started" ? -8 : 0
  const score =
    (drillScores.reduce((sum, value) => sum + value, 0) / drillScores.length) * 0.72 +
    (binaryScores.reduce((sum, value) => sum + value, 0) / binaryScores.length) * 0.28 +
    statusAdjustment

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function buildPrepModel(plans: InterviewPrepPlanRecord[]) {
  const rows = plans
    .map((plan) => ({ plan, readiness: prepReadinessScore(plan) }))
    .sort((a, b) => a.readiness - b.readiness)

  return {
    rows,
    summary: {
      total: rows.length,
      ready: rows.filter((row) => row.readiness >= 80).length,
      needsWork: rows.filter((row) => row.readiness < 60).length,
      topWeaknesses: [...new Set(plans.flatMap((plan) => plan.weaknessTags))]
        .map((tag) => ({
          tag,
          count: plans.filter((plan) => plan.weaknessTags.includes(tag)).length,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    },
  }
}
