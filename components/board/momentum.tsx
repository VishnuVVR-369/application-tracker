"use client"

import { useMutation } from "convex/react"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { BoardCard } from "@/components/board/application-card"
import { CompanyMark } from "@/components/company-mark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { MAX_WEEKLY_GOAL } from "@/lib/domain"
import { errorMessage } from "@/lib/errors"
import { activityGrid, goalStreak, HEATMAP_WEEKS, sentThisWeek, type HeatDay } from "@/lib/momentum"
import { cn } from "@/lib/utils"

const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" })
const shortDate = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" })

export function Momentum({
  cards,
  weeklyGoal,
  now,
  onOpen,
  onAdd,
}: {
  cards: BoardCard[]
  weeklyGoal: number
  now: number
  onOpen: (id: Id<"applications">) => void
  onAdd: () => void
}) {
  const sent = sentThisWeek(cards, now)
  const saved = cards.filter((card) => card.status === "saved").length
  const remaining = Math.max(0, weeklyGoal - sent.length)
  const goalHit = remaining === 0
  const daysLeft = 7 - ((new Date(now).getDay() + 6) % 7)
  // Slots already filled on first render are shown as-is; only ones that arrive while you watch pop in.
  const [initialIds] = useState(() => new Set(sent.map((card) => card._id)))

  return (
    <section
      aria-labelledby="momentum-heading"
      className={cn(
        "grid gap-6 rounded-2xl border bg-card px-5 py-5 transition-colors sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10",
        goalHit && "border-signal/40",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="momentum-heading" className="text-sm font-medium text-muted-foreground">
              This week
            </h2>
            <p className="mt-1 flex items-baseline gap-2 font-display">
              <span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{sent.length}</span>
              <span className="text-xl font-medium text-muted-foreground tabular-nums">
                {sent.length > weeklyGoal ? `sent, goal ${weeklyGoal}` : `of ${weeklyGoal} sent`}
              </span>
            </p>
          </div>
          <GoalEditor goal={weeklyGoal} />
        </div>

        <ol aria-label="Applications sent this week" className="mt-5 flex flex-wrap gap-2">
          {sent.map((card) => (
            <li key={card._id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onOpen(card._id)}
                    aria-label={`${card.role} at ${card.company}`}
                    className={cn(
                      "block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      !initialIds.has(card._id) && "animate-slot-fill",
                    )}
                  >
                    <CompanyMark name={card.company} className="size-11 rounded-lg text-sm" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {card.company}, {weekday.format(card.appliedAt)}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
          {/* Once the goal is met there is always one more open slot, so the row never reads as finished. */}
          {Array.from({ length: Math.max(remaining, 1) }, (_, index) => (
            <li key={`open-${index}`}>
              <button
                type="button"
                onClick={onAdd}
                aria-label={goalHit ? "Add a bonus job" : "Add a job"}
                className={cn(
                  "group flex size-11 items-center justify-center rounded-lg border border-dashed border-foreground/15 text-muted-foreground/0 transition-colors outline-none hover:border-signal hover:bg-signal-soft hover:text-signal focus-visible:ring-2 focus-visible:ring-ring",
                  index === 0 && "border-signal/60 text-signal/70",
                )}
              >
                <PlusIcon className="size-4" />
              </button>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-sm text-pretty text-muted-foreground">
          <Nudge sent={sent.length} remaining={remaining} saved={saved} daysLeft={daysLeft} />
        </p>
      </div>

      <Activity cards={cards} weeklyGoal={weeklyGoal} now={now} />
    </section>
  )
}

function Nudge({ sent, remaining, saved, daysLeft }: { sent: number; remaining: number; saved: number; daysLeft: number }) {
  const savedLine =
    saved > 0 ? ` You have ${saved} saved job${saved === 1 ? "" : "s"} ready to apply to.` : " Save a few jobs to line up the next ones."
  if (remaining === 0) {
    return (
      <>
        <span className="font-medium text-foreground">Weekly goal hit.</span> Every application from here is a bonus
        shot at an offer.
      </>
    )
  }
  const days = daysLeft === 1 ? "today is the last day" : `${daysLeft} days left`
  const lead =
    sent === 0 && daysLeft === 7
      ? `A fresh week: ${remaining} to go.`
      : `${remaining} ${sent === 0 ? "to go" : "more to hit your goal"}, ${days}.`
  return (
    <>
      <span className="font-medium text-foreground">{lead}</span>
      {savedLine}
    </>
  )
}

function Activity({ cards, weeklyGoal, now }: { cards: BoardCard[]; weeklyGoal: number; now: number }) {
  const grid = activityGrid(cards, now)
  const total = grid.flat().reduce((sum, day) => sum + day.count, 0)
  const streak = goalStreak(cards, weeklyGoal, now)

  return (
    <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:gap-8 lg:flex-col lg:items-stretch lg:gap-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
      <div
        role="img"
        aria-label={`${total} applications sent in the last ${HEATMAP_WEEKS} weeks`}
        className="hidden w-fit grid-flow-col grid-rows-7 gap-[3px] sm:grid"
      >
        {grid.flat().map((day) => (
          <HeatCell key={day.start} day={day} now={now} />
        ))}
      </div>
      <dl className="flex gap-8">
        <div>
          <dt className="text-xs text-muted-foreground">Last {HEATMAP_WEEKS} weeks</dt>
          <dd className="font-display text-2xl font-semibold tracking-tight tabular-nums">{total}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Goal streak</dt>
          <dd className="font-display text-2xl font-semibold tracking-tight tabular-nums">
            {streak}
            <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">
              week{streak === 1 ? "" : "s"}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

const HEAT_MIX = [0, 55, 80, 100]

function HeatCell({ day, now }: { day: HeatDay; now: number }) {
  if (day.future) return <span className="size-3" />
  const isToday = now - day.start < 24 * 60 * 60 * 1000
  const mix = HEAT_MIX[Math.min(day.count, HEAT_MIX.length - 1)]
  return (
    <span
      title={`${day.count} sent on ${shortDate.format(day.start)}`}
      style={mix > 0 ? { backgroundColor: `color-mix(in oklch, var(--signal) ${mix}%, var(--heat-0))` } : undefined}
      className={cn("size-3 rounded-[3px] bg-heat-0", isToday && "ring-1 ring-foreground/40 ring-offset-1 ring-offset-card")}
    />
  )
}

function GoalEditor({ goal }: { goal: number }) {
  const setWeeklyGoal = useMutation(api.settings.setWeeklyGoal)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(String(goal))
  const [saving, setSaving] = useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await setWeeklyGoal({ goal: Number(draft) })
      setOpen(false)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(String(goal))
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="-mr-1.5 text-muted-foreground">
          <PencilIcon />
          Weekly goal
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60">
        <form onSubmit={save} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="weekly-goal">Applications per week</Label>
            <Input
              id="weekly-goal"
              type="number"
              min={1}
              max={MAX_WEEKLY_GOAL}
              required
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Pick a pace you can keep every week.</p>
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2Icon className="animate-spin" />}
            Save goal
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
