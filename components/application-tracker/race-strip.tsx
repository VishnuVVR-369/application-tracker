"use client"

import Link from "next/link"
import { AlertTriangle, Flag } from "lucide-react"

import { formatShortDate } from "@/lib/date-model"
import type { RaceEventKind, RaceModel } from "@/lib/race-model"
import { cn } from "@/lib/utils"

const KIND_META: Record<RaceEventKind, { label: string; dot: string }> = {
  interview: { label: "Interview", dot: "bg-stage-interview" },
  offer_deadline: { label: "Offer deadline", dot: "bg-stage-offer" },
  take_home: { label: "Take-home", dot: "bg-status-warn" },
  app_deadline: { label: "App deadline", dot: "bg-status-info" },
}

const AXIS_TICKS = [
  { day: 0, label: "Today" },
  { day: 7, label: "+1w" },
  { day: 14, label: "+2w" },
  { day: 21, label: "+3w" },
  { day: 30, label: "+30d" },
]

/** Horizontal timeline of every active loop's dated commitments. */
export function RaceStrip({ model }: { model: RaceModel }) {
  if (model.lanes.length === 0) {
    return null
  }

  const position = (dayOffset: number) =>
    `${Math.min(100, (dayOffset / model.windowDays) * 100)}%`

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-1 flex flex-wrap items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg border border-stage-offer/30 bg-stage-offer/10 text-stage-offer">
          <Flag className="size-4" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight">The race</h2>
        <span className="font-mono text-xs tabular text-ink-500">
          {model.lanes.length} loop{model.lanes.length === 1 ? "" : "s"} · next {model.windowDays}d
        </span>
        <span className="ml-1 hidden h-px flex-1 bg-line/70 sm:block" />
        <div className="flex flex-wrap items-center gap-3">
          {(Object.entries(KIND_META) as [RaceEventKind, (typeof KIND_META)[RaceEventKind]][]).map(
            ([kind, meta]) => (
              <span key={kind} className="flex items-center gap-1.5 text-[11px] text-ink-500">
                <span className={cn("size-2 rounded-full", meta.dot)} />
                {meta.label}
              </span>
            )
          )}
        </div>
      </div>

      {model.collisions.length > 0 && (
        <div className="mb-3 mt-2 grid gap-1.5">
          {model.collisions.map((collision) => (
            <p
              key={`${collision.companyName}-${collision.deadlineAt}`}
              className="flex items-start gap-2 rounded-lg border border-status-down/30 bg-status-down/[0.07] px-3 py-2 text-xs text-ink-300"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-status-down" />
              <span>
                <span className="font-medium text-ink-100">{collision.companyName}</span> offer
                {collision.overdue ? " deadline has passed" : ` expires ${formatShortDate(collision.deadlineAt)}`}
                {" — "}
                {collision.conflicts.join(", ")}
                {collision.conflicts.length === 1 ? " runs" : " run"} past it. Accelerate, or ask
                for more time.
              </span>
            </p>
          ))}
        </div>
      )}

      {/* Axis */}
      <div className="mt-2 grid grid-cols-[minmax(7rem,9rem)_1fr] items-center gap-3">
        <span />
        <div className="relative h-4">
          {AXIS_TICKS.map((tick) => (
            <span
              key={tick.day}
              className="absolute -translate-x-1/2 font-mono text-[10px] tabular text-ink-500 first:translate-x-0 last:-translate-x-full"
              style={{ left: position(tick.day) }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-1">
        {model.lanes.map((lane) => (
          <div
            key={lane.application.id}
            className="grid grid-cols-[minmax(7rem,9rem)_1fr] items-center gap-3"
          >
            <Link
              href={`/app/applications/${lane.application.id}`}
              className="truncate text-sm font-medium transition-colors hover:text-brand"
              title={`${lane.application.companyName} · ${lane.application.roleTitle}`}
            >
              {lane.application.companyName}
            </Link>
            <div className="relative h-7 rounded-lg bg-surface-1/50 ring-1 ring-inset ring-line/60">
              {AXIS_TICKS.slice(1, -1).map((tick) => (
                <span
                  key={tick.day}
                  aria-hidden
                  className="absolute inset-y-0 w-px bg-line/50"
                  style={{ left: position(tick.day) }}
                />
              ))}
              {lane.events.map((event, index) => {
                const collision = event.kind === "offer_deadline" && event.conflicts.length > 0
                return (
                  <span
                    key={`${event.kind}-${event.at}-${index}`}
                    title={`${event.label} · ${event.overdue ? "overdue" : formatShortDate(event.at)}`}
                    className={cn(
                      "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-2",
                      KIND_META[event.kind].dot,
                      (collision || event.overdue) &&
                        "ring-2 ring-status-down/70 ring-offset-1 ring-offset-surface-1"
                    )}
                    style={{ left: position(event.dayOffset) }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
