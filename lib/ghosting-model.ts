import type { ApplicationRecord } from "@/lib/application-model"
import { dateValueToDate } from "@/lib/date-model"

export const GHOST_NUDGE_AFTER_DAYS = 14
export const GHOST_STRONG_NUDGE_AFTER_DAYS = 30
export const GHOST_AUTO_CLOSE_AFTER_DAYS = 45
export const GHOST_SNOOZE_DAYS = 7

export type GhostNudgeLevel = "nudge" | "strong"

export type GhostNudge = {
  application: ApplicationRecord
  daysSilent: number
  level: GhostNudgeLevel
  daysUntilAutoClose: number
}

/**
 * Structural subset shared by lib ApplicationRecord and Convex application
 * docs, so the server-side auto-close sweep can reuse these predicates.
 */
export type GhostableFields = Pick<
  ApplicationRecord,
  | "archived"
  | "stage"
  | "dateAppliedDate"
  | "lastActivityAt"
  | "updatedAt"
  | "ghostNudgeSnoozedUntilDate"
>

/**
 * The moment the silence clock starts: the later of the applied date and the
 * last recorded activity. Logging a follow-up or editing the application
 * resets the clock via lastActivityAt.
 */
export function getGhostSilenceStart(application: GhostableFields) {
  const applied = dateValueToDate(application.dateAppliedDate)?.getTime() ?? 0
  const activity = application.lastActivityAt ?? application.updatedAt
  return Math.max(applied, activity)
}

export function getDaysSilent(application: GhostableFields, now: Date) {
  const start = getGhostSilenceStart(application)
  return Math.floor((now.getTime() - start) / (24 * 60 * 60 * 1000))
}

function isSnoozed(application: GhostableFields, now: Date) {
  const snoozedUntil = dateValueToDate(application.ghostNudgeSnoozedUntilDate)
  return snoozedUntil !== undefined && snoozedUntil.getTime() > now.getTime()
}

/** Applications the ghosting engine watches: live "applied" rows only. */
export function isGhostable(application: GhostableFields) {
  return !application.archived && application.stage === "applied"
}

/** Nudges for the Today page, most-silent first. Snoozed apps are skipped. */
export function buildGhostingModel(args: {
  applications: ApplicationRecord[]
  now?: Date
}) {
  const now = args.now ?? new Date()

  const nudges: GhostNudge[] = args.applications
    .filter((application) => isGhostable(application) && !isSnoozed(application, now))
    .flatMap((application) => {
      const daysSilent = getDaysSilent(application, now)
      if (daysSilent < GHOST_NUDGE_AFTER_DAYS) {
        return []
      }
      return [
        {
          application,
          daysSilent,
          level:
            daysSilent >= GHOST_STRONG_NUDGE_AFTER_DAYS
              ? ("strong" as const)
              : ("nudge" as const),
          daysUntilAutoClose: Math.max(0, GHOST_AUTO_CLOSE_AFTER_DAYS - daysSilent),
        },
      ]
    })
    .sort((a, b) => b.daysSilent - a.daysSilent)

  return { nudges }
}

/** Whether the daily sweep should close this application as ghosted. */
export function shouldAutoCloseAsGhosted(application: GhostableFields, now: Date) {
  return (
    isGhostable(application) &&
    !isSnoozed(application, now) &&
    getDaysSilent(application, now) >= GHOST_AUTO_CLOSE_AFTER_DAYS
  )
}
