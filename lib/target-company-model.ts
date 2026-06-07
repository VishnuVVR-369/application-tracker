import type {
  ApplicationRecord,
  ReferralOutreachRecord,
  TargetCompanyRecord,
} from "@/lib/application-model"

const PROGRESSIVE_REFERRAL_STATUSES = ["messaged", "replied", "call_booked", "referred"] as const

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function targetReadinessScore(
  target: TargetCompanyRecord,
  outreach: ReferralOutreachRecord[]
) {
  const activeOutreach = outreach.filter(
    (item) => !item.archived && item.targetCompanyId === target.id
  )
  const progressed = activeOutreach.filter((item) =>
    PROGRESSIVE_REFERRAL_STATUSES.includes(item.status as typeof PROGRESSIVE_REFERRAL_STATUSES[number])
  ).length
  const referralCoverage = Math.min(1, progressed / Math.max(1, target.referralGoal))
  const researchCoverage = [
    target.researchNotes,
    target.hiringBarNotes,
    target.interviewProcessNotes,
  ].filter((value) => value?.trim()).length / 3
  const statusBonus =
    target.status === "ready_to_apply" || target.status === "applied"
      ? 12
      : target.status === "warming_referrals"
        ? 6
        : 0

  return clampScore(
    target.priorityScore * 0.25 +
      target.roleFitScore * 0.35 +
      referralCoverage * 25 +
      researchCoverage * 15 +
      statusBonus
  )
}

export function buildTargetCompanyModel(args: {
  targets: TargetCompanyRecord[]
  outreach: ReferralOutreachRecord[]
  applications: ApplicationRecord[]
}) {
  const targets = args.targets.filter((target) => !target.archived)
  const outreach = args.outreach.filter((item) => !item.archived)
  const applications = args.applications.filter((application) => !application.archived)

  const rows = targets
    .map((target) => {
      const targetOutreach = outreach.filter((item) => item.targetCompanyId === target.id)
      const targetApplications = applications.filter(
        (application) => application.companyKey === target.companyKey
      )
      const referred = targetOutreach.filter((item) => item.status === "referred").length
      const warm = targetOutreach.filter((item) =>
        ["messaged", "replied", "call_booked", "referred"].includes(item.status)
      ).length

      return {
        target,
        applications: targetApplications,
        outreach: targetOutreach,
        readiness: targetReadinessScore(target, outreach),
        referralProgress: {
          warm,
          referred,
          goal: target.referralGoal,
          percent: clampScore((warm / Math.max(1, target.referralGoal)) * 100),
        },
      }
    })
    .sort((a, b) => b.readiness - a.readiness || b.target.priorityScore - a.target.priorityScore)

  return {
    rows,
    summary: {
      total: rows.length,
      dream: rows.filter((row) => row.target.tier === "dream").length,
      ready: rows.filter((row) => row.target.status === "ready_to_apply").length,
      avgReadiness: average(rows.map((row) => row.readiness)),
      referralGaps: rows.filter((row) => row.referralProgress.warm < row.referralProgress.goal).length,
    },
  }
}
