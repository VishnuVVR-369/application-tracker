"use client"

import { BellRingIcon, CheckIcon, FileCheck2Icon, UsersIcon } from "lucide-react"

import type { FunctionReturnType } from "convex/server"

import { CompanyMark } from "@/components/company-mark"
import { formatDaysAgo, isFollowUpDue, OUTCOME_LABELS, SOURCE_LABELS } from "@/lib/domain"
import { FOLLOW_UP_TEXT, OUTCOME_BADGE } from "@/lib/status-style"
import { cn } from "@/lib/utils"
import type { api } from "@/convex/_generated/api"

export type BoardCard = NonNullable<FunctionReturnType<typeof api.applications.board>>["cards"][number]

export function ApplicationCard({
  card,
  followUpDays,
  now,
  dragging = false,
  overlay = false,
}: {
  card: BoardCard
  followUpDays: number
  now: number
  dragging?: boolean
  overlay?: boolean
}) {
  const referred = card.referrals.filter((r) => r.status === "referred").length
  const waiting = card.referrals.filter((r) => r.status === "to_ask" || r.status === "asked").length
  const due =
    card.status === "closed" ? 0 : card.referrals.filter((r) => isFollowUpDue(r, followUpDays, now)).length

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 text-left shadow-xs transition-[box-shadow,border-color,opacity]",
        "hover:border-foreground/20 hover:shadow-sm",
        dragging && "opacity-40",
        overlay && "rotate-[1.5deg] cursor-grabbing border-foreground/20 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2.5">
        <CompanyMark name={card.company} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[13px] font-medium text-muted-foreground">{card.company}</p>
            {card.status === "closed" && card.outcome ? (
              <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium", OUTCOME_BADGE[card.outcome])}>
                {OUTCOME_LABELS[card.outcome]}
              </span>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums" title="Time in this stage">
                {formatDaysAgo(card.statusChangedAt, now)}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug font-medium text-foreground">{card.role}</p>
        </div>
      </div>

      <div
        className={cn(
          "mt-2.5 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1.5 pl-[42px] text-xs whitespace-nowrap text-muted-foreground",
          // Leaves room for the board's "Mark applied" button, which sits over this corner of saved cards.
          card.status === "saved" && "pr-28",
        )}
      >
        <span>{SOURCE_LABELS[card.source]}</span>
        {card.hasFinalResume && (
          <span className="flex items-center gap-1" title="Submitted resume attached">
            <FileCheck2Icon className="size-3.5" />
          </span>
        )}
        {card.referrals.length > 0 && (
          <span className={cn("flex items-center gap-2", card.status !== "saved" && "ml-auto")}>
            {due > 0 ? (
              <span className={cn("flex items-center gap-1 font-medium", FOLLOW_UP_TEXT)}>
                <BellRingIcon className="size-3.5" />
                {due} follow-up{due > 1 ? "s" : ""}
              </span>
            ) : (
              <>
                {referred > 0 && (
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <CheckIcon className="size-3.5" />
                    {referred} referred
                  </span>
                )}
                {waiting > 0 && (
                  <span className="flex items-center gap-1">
                    <UsersIcon className="size-3.5" />
                    {waiting} waiting
                  </span>
                )}
                {referred === 0 && waiting === 0 && (
                  <span className="flex items-center gap-1">
                    <UsersIcon className="size-3.5" />
                    {card.referrals.length}
                  </span>
                )}
              </>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
