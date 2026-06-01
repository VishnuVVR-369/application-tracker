import {
  STAGE_LABELS,
  type ActivityEvent,
  type ApplicationStage,
} from "@/lib/application-model"

export function buildStageChangedEvent(args: {
  id: string
  applicationId: string
  fromStage: ApplicationStage
  toStage: ApplicationStage
  at: string
}): ActivityEvent {
  return {
    id: args.id,
    applicationId: args.applicationId,
    type: "stage_changed",
    title: `Moved to ${STAGE_LABELS[args.toStage]}`,
    description: `${STAGE_LABELS[args.fromStage]} to ${STAGE_LABELS[args.toStage]}`,
    source: "auto",
    eventDate: args.at,
    createdAt: args.at,
    fromStage: args.fromStage,
    toStage: args.toStage,
  }
}

export function sortActivityNewestFirst(events: ActivityEvent[]) {
  return [...events].sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  )
}

export function getApplicationActivity(events: ActivityEvent[], applicationId: string) {
  return sortActivityNewestFirst(
    events.filter((event) => event.applicationId === applicationId)
  )
}

export function labelActivitySource(event: ActivityEvent) {
  return event.source === "auto" ? "Auto" : "Manual"
}
