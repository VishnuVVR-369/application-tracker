import {
  STAGE_LABELS,
  type ActivityEvent,
  type ApplicationStage,
} from "@/lib/application-model"
import { dateKeyFromTimestamp } from "@/lib/date-model"

export function buildStageChangedEvent(args: {
  id: string
  applicationId: string
  fromStage: ApplicationStage
  toStage: ApplicationStage
  at: number
}): ActivityEvent {
  return {
    id: args.id,
    applicationId: args.applicationId,
    type: "stage_changed",
    title: `Moved to ${STAGE_LABELS[args.toStage]}`,
    description: `${STAGE_LABELS[args.fromStage]} to ${STAGE_LABELS[args.toStage]}`,
    source: "auto",
    actorType: "system",
    eventAt: args.at,
    eventDate: dateKeyFromTimestamp(args.at),
    metadataJson: JSON.stringify({ fromStage: args.fromStage, toStage: args.toStage }),
    createdAt: args.at,
  }
}

export function sortActivityNewestFirst(events: ActivityEvent[]) {
  return [...events].sort((a, b) => b.eventAt - a.eventAt)
}

export function getApplicationActivity(events: ActivityEvent[], applicationId: string) {
  return sortActivityNewestFirst(
    events.filter((event) => event.applicationId === applicationId)
  )
}

export function labelActivitySource(event: ActivityEvent) {
  return event.source === "auto" ? "Auto" : "Manual"
}
