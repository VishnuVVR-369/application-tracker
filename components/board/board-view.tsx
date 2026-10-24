"use client"

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useQuery } from "convex/react"
import { PlusIcon, SearchIcon, SendIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { AddJobDialog } from "@/components/add-job-dialog"
import { ApplicationSheet } from "@/components/application/application-sheet"
import { ApplicationCard, type BoardCard } from "@/components/board/application-card"
import { Momentum } from "@/components/board/momentum"
import { CloseDialog } from "@/components/close-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useNow } from "@/hooks/use-now"
import { usePanel } from "@/hooks/use-panel"
import { useSetStatus } from "@/hooks/use-set-status"
import { APPLICATION_STATUSES, STATUS_LABELS, type ApplicationStatus } from "@/lib/domain"
import { errorMessage } from "@/lib/errors"
import { sentThisWeek } from "@/lib/momentum"
import { STATUS_DOT } from "@/lib/status-style"
import { cn } from "@/lib/utils"

export function BoardView() {
  const board = useQuery(api.applications.board)
  const now = useNow()
  const panel = usePanel()
  const setStatus = useSetStatus()
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeId, setActiveId] = useState<Id<"applications"> | null>(null)
  const [closing, setClosing] = useState<BoardCard | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const columns = useMemo(() => {
    const query = search.trim().toLowerCase()
    const grouped = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, [] as BoardCard[]])) as Record<
      ApplicationStatus,
      BoardCard[]
    >
    for (const card of board?.cards ?? []) {
      if (query && !`${card.company} ${card.role}`.toLowerCase().includes(query)) continue
      grouped[card.status].push(card)
    }
    for (const cards of Object.values(grouped)) cards.sort((a, b) => b.statusChangedAt - a.statusChangedAt)
    return grouped
  }, [board, search])

  const activeCard = board?.cards.find((card) => card._id === activeId) ?? null

  // N adds a job from anywhere on the board, so saving a posting you just found is one keystroke away.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "n" || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog], [role=menu]")) return
      if (document.querySelector("[role=dialog]")) return
      event.preventDefault()
      setAddOpen(true)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  function move(card: BoardCard, status: ApplicationStatus) {
    if (card.status === status) return
    if (status === "closed") {
      setClosing(card)
      return
    }
    setStatus({ id: card._id, status }).catch((error) => toast.error(errorMessage(error)))
    if (card.status === "saved") celebrate(card._id, card.company)
  }

  /** Confirms a newly sent application against the weekly goal, so every one visibly moves the needle. */
  function celebrate(id: Id<"applications">, company: string) {
    if (!board) return
    // Excludes the application itself, which may or may not have reached the board yet.
    const sent = sentThisWeek(board.cards.filter((card) => card._id !== id), now).length + 1
    const goal = board.weeklyGoal
    if (sent === goal) {
      toast.success("Weekly goal hit", { description: `${goal} applications sent this week. Nice work.` })
    } else if (sent < goal) {
      toast.success(`Applied to ${company}`, {
        description: `${goal - sent} more to hit this week's goal.`,
      })
    } else {
      toast.success(`Applied to ${company}`, {
        description: `${sent} sent this week, ${sent - goal} past your goal.`,
      })
    }
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as Id<"applications">)
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const card = board?.cards.find((c) => c._id === event.active.id)
    if (card && event.over) move(card, event.over.id as ApplicationStatus)
  }

  if (board === undefined) return <BoardSkeleton />
  if (board === null) return null

  const total = board.cards.length

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="sr-only">Board</h1>
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 sm:px-6">
        <Momentum
          cards={board.cards}
          weeklyGoal={board.weeklyGoal}
          now={now}
          onOpen={panel.open}
          onAdd={() => setAddOpen(true)}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 pt-6 pb-3 sm:px-6">
        {total > 0 && (
          <div className="relative w-full sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by company or role"
              className="pl-8"
              aria-label="Filter applications"
            />
          </div>
        )}
        <Button onClick={() => setAddOpen(true)} className="ml-auto" aria-keyshortcuts="N">
          <PlusIcon />
          Add job
          <kbd className="ml-1 hidden h-5 min-w-5 items-center justify-center rounded border border-primary-foreground/25 px-1 font-sans text-[11px] text-primary-foreground/80 sm:inline-flex">
            N
          </kbd>
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="mx-auto w-full max-w-[1600px] flex-1 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-6 sm:scroll-px-6 sm:px-6 lg:snap-none">
          <div className="grid min-w-[340vw] grid-cols-4 gap-3 sm:min-w-[1080px] lg:min-w-0">
            {APPLICATION_STATUSES.map((status) => (
              <Column key={status} status={status} count={columns[status].length}>
                {columns[status].length === 0 ? (
                  <EmptyColumn status={status} filtered={search.trim() !== "" && total > 0} onAdd={() => setAddOpen(true)} />
                ) : (
                  columns[status].map((card) => (
                    <DraggableCard
                      key={card._id}
                      card={card}
                      followUpDays={board.followUpDays}
                      now={now}
                      onOpen={() => panel.open(card._id)}
                      onApplied={() => move(card, "applied")}
                    />
                  ))
                )}
              </Column>
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeCard && <ApplicationCard card={activeCard} followUpDays={board.followUpDays} now={now} overlay />}
        </DragOverlay>
      </DndContext>

      <AddJobDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(id, job) => {
          // A logged application stays on the board so the new slot is visible; a saved job opens for tailoring.
          if (job.applied) celebrate(id, job.company)
          else panel.open(id)
        }}
      />
      <CloseDialog
        open={closing !== null}
        title={closing ? `${closing.role} at ${closing.company}` : undefined}
        onCancel={() => setClosing(null)}
        onConfirm={(outcome) => {
          if (!closing) return
          setStatus({ id: closing._id, status: "closed", outcome }).catch((error) => toast.error(errorMessage(error)))
          setClosing(null)
        }}
      />
      <ApplicationSheet id={panel.openId} onClose={panel.close} />
    </div>
  )
}

function Column({ status, count, children }: { status: ApplicationStatus; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_LABELS[status]}
      className={cn(
        "flex min-h-[calc(100svh-20rem)] snap-start flex-col rounded-xl bg-foreground/[0.025] p-2 transition-colors dark:bg-foreground/[0.03]",
        isOver && "bg-signal-soft ring-1 ring-signal/40 dark:bg-signal-soft",
      )}
    >
      <header className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
        <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
        <h2 className="text-sm font-medium">{STATUS_LABELS[status]}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{count}</span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

function DraggableCard({
  card,
  followUpDays,
  now,
  onOpen,
  onApplied,
}: {
  card: BoardCard
  followUpDays: number
  now: number
  onOpen: () => void
  onApplied: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card._id })
  return (
    <div className="group/slot relative">
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        role="button"
        aria-label={`${card.role} at ${card.company}`}
        onClick={onOpen}
        onKeyDown={(event) => {
          // Enter opens the card; Space stays with dnd-kit to pick it up for keyboard dragging.
          if (event.key === "Enter") onOpen()
          else listeners?.onKeyDown?.(event)
        }}
        className="cursor-pointer touch-manipulation rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <ApplicationCard card={card} followUpDays={followUpDays} now={now} dragging={isDragging} />
      </div>
      {card.status === "saved" && !isDragging && (
        // A sibling of the draggable, not a child, so pressing it never starts a drag or opens the card.
        <Button
          size="xs"
          variant="outline"
          onClick={onApplied}
          aria-label={`Mark ${card.role} at ${card.company} as applied`}
          className="absolute right-2.5 bottom-2.5 text-muted-foreground hover:border-signal/50 hover:bg-signal-soft hover:text-signal dark:hover:bg-signal-soft"
        >
          <SendIcon />
          Mark applied
        </Button>
      )}
    </div>
  )
}

const EMPTY_HINTS: Record<ApplicationStatus, string> = {
  saved: "Jobs you want to apply to",
  applied: "Drag here once you've applied",
  in_progress: "Drag here when you hear back",
  closed: "Offers, rejections, and dead ends",
}

function EmptyColumn({ status, filtered, onAdd }: { status: ApplicationStatus; filtered: boolean; onAdd: () => void }) {
  if (filtered) {
    return <p className="px-2 py-6 text-center text-xs text-muted-foreground">No matches</p>
  }
  if (status === "saved") {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-foreground/15 px-3 py-6 text-center text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <PlusIcon className="size-4" />
        Add a job you found
      </button>
    )
  }
  return (
    <p className="rounded-lg border border-dashed border-foreground/10 px-3 py-6 text-center text-xs text-muted-foreground">
      {EMPTY_HINTS[status]}
    </p>
  )
}

function BoardSkeleton() {
  // Mirrors the loaded board's boxes so nothing shifts when data arrives.
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 sm:px-6">
        <Skeleton className="h-[248px] rounded-2xl lg:h-[214px]" />
      </div>
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 pt-6 pb-3 sm:px-6">
        <Skeleton className="ml-auto h-8 w-[118px] rounded-lg" />
      </div>
      <div className="mx-auto w-full max-w-[1600px] flex-1 overflow-hidden px-4 pb-6 sm:px-6">
        <div className="grid min-w-[340vw] grid-cols-4 gap-3 sm:min-w-[1080px] lg:min-w-0">
          {APPLICATION_STATUSES.map((status, index) => (
            <div
              key={status}
              className="flex min-h-[calc(100svh-20rem)] flex-col rounded-xl bg-foreground/[0.025] p-2 dark:bg-foreground/[0.03]"
            >
              <div className="flex h-[34px] items-center px-1.5 pb-1.5">
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 - (index % 3) }).map((_, i) => (
                  <Skeleton key={i} className="h-[92px] rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
