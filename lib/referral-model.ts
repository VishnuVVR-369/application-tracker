import type { ReferralOutreachRecord } from "@/lib/application-model"

const SUCCESS_STATUSES = ["replied", "call_booked", "referred"] as const

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

export function buildReferralModel(outreach: ReferralOutreachRecord[], todayDate: string) {
  const active = outreach.filter((item) => !item.archived)
  const contacted = active.filter((item) => item.status !== "not_contacted")
  const successful = active.filter((item) =>
    SUCCESS_STATUSES.includes(item.status as typeof SUCCESS_STATUSES[number])
  )
  const referred = active.filter((item) => item.status === "referred")
  const dueFollowUps = active
    .filter(
      (item) =>
        item.followUpDate !== undefined &&
        item.followUpDate <= todayDate &&
        !["referred", "declined"].includes(item.status)
    )
    .sort((a, b) => String(a.followUpDate).localeCompare(String(b.followUpDate)))

  return {
    active,
    dueFollowUps,
    metrics: {
      total: active.length,
      contacted: contacted.length,
      replies: successful.length,
      referred: referred.length,
      replyRate: percent(successful.length, contacted.length),
      referralRate: percent(referred.length, contacted.length),
    },
  }
}
