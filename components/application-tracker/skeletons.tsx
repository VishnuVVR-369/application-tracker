import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────
   Page-shaped skeletons.

   The generic 6-card `LoadingPanels` never matched the layout it replaced,
   so first paint jumped as real content arrived. These skeletons mirror each
   page's actual above-the-fold structure (§6 design spec: "every state is
   designed") so the shell settles in place instead of reflowing.

   Standalone pages return a skeleton *with* a header (their loading gate
   replaces the whole page). Embedded views (AnalyticsView, GoalsView,
   FailurePatternsPanel) sit under a parent header + tabs, so they get the
   content-only variants.
   ──────────────────────────────────────────────────────────────────────── */

/* ── Building blocks ────────────────────────────────────────────────────── */

export function SkeletonHeader({ action = false }: { action?: boolean }) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <Skeleton className="h-8 w-64 sm:w-80" />
        <Skeleton className="h-3.5 w-full max-w-md" />
      </div>
      {action && <Skeleton className="h-8 w-24 shrink-0 rounded-lg" />}
    </div>
  )
}

export function SkeletonStats({ n = 4 }: { n?: number }) {
  return (
    <div
      className="mb-5 grid gap-3"
      style={{ gridTemplateColumns: `repeat(${Math.min(n, 4)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-4">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-3 h-7 w-14" />
        </div>
      ))}
    </div>
  )
}

/** A glass panel with the standard header bar + a few body rows. */
export function SkeletonPanel({
  rows = 3,
  className,
  chart = false,
}: {
  rows?: number
  className?: string
  chart?: boolean
}) {
  return (
    <section className={cn("glass overflow-hidden rounded-xl", className)}>
      <div className="flex min-h-12 items-center gap-2.5 border-b border-line/70 px-4">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="p-4">
        {chart ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <div className="grid gap-2.5">
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function LaneSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2.5">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="ml-auto h-px flex-1" />
      </div>
      <div className="grid gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </section>
  )
}

function RailCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="mt-3 grid gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  )
}

/* ── Composed page skeletons ────────────────────────────────────────────── */

/** Today — hero, then triage stack (left) + momentum rail (right). */
export function TodaySkeleton() {
  return (
    <div className="grid gap-6">
      <div className="space-y-3">
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="h-10 w-72 sm:w-96" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="grid content-start gap-5">
          <LaneSkeleton rows={2} />
          <LaneSkeleton rows={3} />
          <LaneSkeleton rows={2} />
        </div>
        <div className="grid content-start gap-4">
          <RailCardSkeleton lines={2} />
          <RailCardSkeleton lines={3} />
          <RailCardSkeleton lines={1} />
          <RailCardSkeleton lines={4} />
        </div>
      </div>
    </div>
  )
}

/** Pipeline — controls bar + six kanban columns. */
export function BoardSkeleton() {
  return (
    <>
      <SkeletonHeader action />
      <div className="glass mb-4 h-[3.75rem] rounded-xl" />
      <div className="grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-hidden pb-4 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, col) => (
          <section
            key={col}
            className="flex min-h-80 flex-col rounded-xl border border-line bg-surface-2/40"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2.5">
              <Skeleton className="h-5 w-20 rounded-sm" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {Array.from({ length: (col % 3) + 1 }).map((_, i) => (
                <Skeleton key={i} className="h-[5.5rem] rounded-lg" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

/** Application detail — back link, header card, tabs, panels. */
export function DetailSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-3.5 w-28" />
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-64" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-20 rounded-sm" />
              <Skeleton className="h-5 w-16 rounded-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <SkeletonPanel rows={4} />
        <SkeletonPanel rows={3} />
      </div>
    </div>
  )
}

/** Analytics content (no header — the parent page/tab supplies it). */
export function AnalyticsSkeleton() {
  return (
    <>
      <div className="glass mb-4 h-12 rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <SkeletonPanel rows={5} className="xl:col-span-2" />
        <SkeletonPanel rows={2} className="xl:col-span-2" />
        <SkeletonPanel chart className="xl:col-span-2" />
        <SkeletonPanel chart />
        <SkeletonPanel chart />
      </div>
    </>
  )
}

/** Goals content (no header — used under the Goals page / Insights tab). */
export function GoalsSkeleton() {
  return (
    <>
      <SkeletonStats n={3} />
      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <SkeletonPanel rows={4} />
        <SkeletonPanel rows={3} />
      </div>
    </>
  )
}

/** People — filter row + directory card grid. */
export function PeopleSkeleton() {
  return (
    <>
      <SkeletonHeader action />
      <div className="glass mb-5 flex flex-wrap gap-2 rounded-xl p-3">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </>
  )
}

/**
 * Generic page skeleton: header + optional stat row + a responsive grid of
 * panels. Covers the "controls / two-column detail" pages (prep, targets,
 * documents, settings, interviews) with a shape close to their real layout.
 */
export function PageSkeleton({
  action = false,
  stats = 0,
  columns = "1fr 1fr",
  panels = 2,
}: {
  action?: boolean
  stats?: number
  columns?: string
  panels?: number
}) {
  return (
    <>
      <SkeletonHeader action={action} />
      {stats > 0 && <SkeletonStats n={stats} />}
      <div className="grid gap-4 xl:[grid-template-columns:var(--cols)]" style={{ ["--cols" as string]: columns }}>
        {Array.from({ length: panels }).map((_, i) => (
          <SkeletonPanel key={i} rows={i === 0 ? 4 : 3} />
        ))}
      </div>
    </>
  )
}
