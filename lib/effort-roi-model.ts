import {
  APPLICATION_TYPES,
  APPLICATION_TYPE_LABELS,
  SOURCE_LABELS,
  type ApplicationRecord,
  type ApplicationSource,
  type ApplicationStage,
  type ApplicationStageHistory,
  type RejectionStage,
} from "@/lib/application-model"

/** Below this many applications a group's rates are noise, not signal. */
export const ROI_MIN_SAMPLE = 5

const RESPONSE_STAGES: ApplicationStage[] = ["phone_screen", "interview", "offer"]
const INTERVIEW_STAGES: ApplicationStage[] = ["interview", "offer"]

// A closed app whose rejection came at these stages heard back from a human,
// even if its stage jumped straight from applied to closed.
const RESPONSE_REJECTION_STAGES: RejectionStage[] = [
  "recruiter_screen",
  "technical_screen",
  "onsite",
  "offer",
]
const INTERVIEW_REJECTION_STAGES: RejectionStage[] = ["onsite", "offer"]

export type RoiRow = {
  key: string
  label: string
  total: number
  responded: number
  interviewed: number
  responseRate: number
  interviewRate: number
  lowSample: boolean
}

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

function makeRow(key: string, label: string, group: {
  responded: boolean
  interviewed: boolean
}[]): RoiRow {
  const responded = group.filter((item) => item.responded).length
  const interviewed = group.filter((item) => item.interviewed).length
  return {
    key,
    label,
    total: group.length,
    responded,
    interviewed,
    responseRate: percent(responded, group.length),
    interviewRate: percent(interviewed, group.length),
    lowSample: group.length > 0 && group.length < ROI_MIN_SAMPLE,
  }
}

/**
 * Response and interview rates by effort level (application type) and by
 * source. "Responded" means the application ever reached a human stage —
 * ghosted or silently closed rows do not count, which keeps the rates honest.
 */
export function buildEffortRoiModel(args: {
  applications: ApplicationRecord[]
  stageHistory: ApplicationStageHistory[]
}) {
  const stagesReached = new Map<string, Set<ApplicationStage>>()
  for (const entry of args.stageHistory) {
    const set = stagesReached.get(entry.applicationId) ?? new Set()
    set.add(entry.stage)
    stagesReached.set(entry.applicationId, set)
  }

  const population = args.applications
    .filter((application) => !application.archived && application.stage !== "saved")
    .map((application) => {
      const reached = stagesReached.get(application.id) ?? new Set<ApplicationStage>()
      reached.add(application.stage)
      const rejection = application.rejectionStage
      const responded =
        RESPONSE_STAGES.some((stage) => reached.has(stage)) ||
        (rejection !== undefined && RESPONSE_REJECTION_STAGES.includes(rejection))
      const interviewed =
        INTERVIEW_STAGES.some((stage) => reached.has(stage)) ||
        (rejection !== undefined && INTERVIEW_REJECTION_STAGES.includes(rejection))
      return { application, responded, interviewed }
    })

  const byGroup = <TKey extends string>(
    keys: readonly TKey[],
    labels: Record<TKey, string>,
    getKey: (application: ApplicationRecord) => TKey | undefined
  ): RoiRow[] => {
    const rows = keys.map((key) =>
      makeRow(key, labels[key], population.filter((item) => getKey(item.application) === key))
    )
    const unspecified = makeRow(
      "unspecified",
      "Unspecified",
      population.filter((item) => getKey(item.application) === undefined)
    )
    return [...rows, ...(unspecified.total > 0 ? [unspecified] : [])]
  }

  const byType = byGroup(
    APPLICATION_TYPES,
    APPLICATION_TYPE_LABELS,
    (application) => application.applicationType
  )

  const sourcesPresent = [
    ...new Set(
      population.flatMap((item) =>
        item.application.source === undefined ? [] : [item.application.source]
      )
    ),
  ] as ApplicationSource[]
  const bySource = byGroup(
    sourcesPresent,
    SOURCE_LABELS,
    (application) => application.source
  ).sort((a, b) => b.total - a.total)

  const rankable = byType.filter((row) => row.total >= ROI_MIN_SAMPLE && row.key !== "unspecified")
  const best = [...rankable].sort((a, b) => b.responseRate - a.responseRate)[0]
  const worst = [...rankable].sort((a, b) => a.responseRate - b.responseRate)[0]
  const takeaway =
    best && worst && best.key !== worst.key && best.responseRate > worst.responseRate
      ? `${best.label} applications get ${best.responseRate}% responses vs ${worst.responseRate}% for ${worst.label.toLowerCase()} — spend your hours where they pay.`
      : undefined

  return {
    total: population.length,
    byType,
    bySource,
    takeaway,
  }
}

export type EffortRoiModel = ReturnType<typeof buildEffortRoiModel>
