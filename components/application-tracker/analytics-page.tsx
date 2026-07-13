"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, Filter, GitBranch, PieChart, Timer, Zap } from "lucide-react"

import { buildAnalyticsModel } from "@/lib/analytics-model"
import { buildEffortRoiModel, ROI_MIN_SAMPLE, type EffortRoiModel, type RoiRow } from "@/lib/effort-roi-model"
import { cn } from "@/lib/utils"
import { CountUp, Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, PageHeader, Panel } from "./common"
import { AnalyticsSkeleton } from "./skeletons"
import { mapActivity, mapApplication, mapResume, mapStageHistory } from "./data-mappers"
import { useAppData } from "./use-app-data"

const SERIES = [
  { key: "responseRate", label: "Response", color: "var(--brand)" },
  { key: "interviewRate", label: "Interview", color: "var(--status-info)" },
  { key: "offerRate", label: "Offer", color: "var(--stage-interview)" },
] as const

const DIMENSIONS = [
  { key: "source", label: "Source" },
  { key: "referral", label: "Referral" },
  { key: "workArrangement", label: "Arrangement" },
  { key: "quality", label: "Quality" },
  { key: "resume", label: "Resume" },
] as const

type DimensionKey = (typeof DIMENSIONS)[number]["key"]

function FilterToggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-brand/40 bg-brand-weak text-brand"
          : "border-line bg-surface-1 text-ink-300 hover:border-line-strong hover:text-ink-100"
      )}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded border transition-colors",
          active ? "border-brand bg-brand text-primary-foreground" : "border-line-strong"
        )}
      >
        {active && (
          <svg viewBox="0 0 12 12" className="size-3" fill="none">
            <path d="M2.5 6.5L5 9l4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {children}
    </button>
  )
}

function DimensionChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand/40 bg-brand-weak text-brand"
          : "border-line bg-surface-1 text-ink-300 hover:border-line-strong hover:text-ink-100"
      )}
    >
      {children}
    </button>
  )
}

export function AnalyticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Funnel, timing, segments, and rejection patterns"
        description="Filters are explicit. Archived and closed applications are excluded by default."
      />
      <AnalyticsView />
    </>
  )
}

export function AnalyticsView() {
  const { data, isLoading } = useAppData()
  const [includeArchived, setIncludeArchived] = React.useState(false)
  const [includeClosed, setIncludeClosed] = React.useState(false)
  const [dimension, setDimension] = React.useState<DimensionKey>("source")

  if (isLoading) {
    return <AnalyticsSkeleton />
  }

  if (!data) {
    return <EmptyState title="Analytics unavailable" description="Sign in to compute analytics from Convex records." />
  }

  const applications = data.applications.map(mapApplication)
  const stageHistory = data.applicationStageHistory.map(mapStageHistory)
  const activityEvents = data.activityEvents.map(mapActivity)
  const resumes = data.resumes.map(mapResume)
  const analytics = buildAnalyticsModel({
    applications,
    activityEvents,
    stageHistory,
    resumes,
    filters: { includeArchived, includeClosed },
  })
  // Rejections are inherently closed applications — compute this panel from a
  // separate model call that always includes them, independent of the global
  // "include closed" toggle above (which still governs the funnel/timing/segments).
  const rejectionAnalytics = buildAnalyticsModel({
    applications,
    activityEvents,
    stageHistory,
    resumes,
    filters: { includeArchived, includeClosed: true },
  })
  const roi = buildEffortRoiModel({ applications, stageHistory })
  const dimensionRows = analytics.breakdowns[dimension]
  const maxFunnel = Math.max(1, ...analytics.funnel.map((step) => Number(step.count) || 0))
  const totalClosed = rejectionAnalytics.rejection.outcomes.reduce((sum, row) => sum + row.value, 0)

  return (
    <>
      {roi.total > 0 && <EffortRoiHeadline roi={roi} />}

      <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-xl p-3">
        <span className="micro-label flex items-center gap-1.5">
          <Filter className="size-3.5" />
          Filters
        </span>
        <FilterToggle active={includeArchived} onClick={() => setIncludeArchived((v) => !v)}>
          Include archived
        </FilterToggle>
        <FilterToggle active={includeClosed} onClick={() => setIncludeClosed((v) => !v)}>
          Include closed
        </FilterToggle>
      </div>

      <Stagger className="grid gap-4 xl:grid-cols-2">
        {/* Funnel — custom horizontal bars with conversion labels */}
        <StaggerItem className="xl:col-span-2">
          <Panel title="Funnel & conversion" icon={GitBranch}>
            {analytics.funnel.some((s) => Number(s.count) > 0) ? (
              <div className="grid gap-2.5">
                {analytics.funnel.map((step, i) => {
                  const count = Number(step.count) || 0
                  const pct = (count / maxFunnel) * 100
                  return (
                    <div key={String(step.label)} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
                      <span className="truncate text-sm text-ink-300">{step.label}</span>
                      <span className="relative h-8 overflow-hidden rounded-lg bg-surface-1 ring-1 ring-inset ring-line">
                        <span
                          className="flex h-full items-center justify-end rounded-lg bg-linear-to-r from-brand/80 to-status-info/80 px-2.5 transition-[width] duration-700 ease-out"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        >
                          <span className="font-mono text-xs font-semibold tabular text-primary-foreground">
                            {count}
                          </span>
                        </span>
                      </span>
                      <span className="w-14 text-right font-mono text-xs tabular text-ink-500">
                        {i === 0 ? "—" : `${step.conversion}%`}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="No funnel data yet" description="Add applied applications to populate the funnel." />
            )}
          </Panel>
        </StaggerItem>

        {/* Timing */}
        <StaggerItem className="xl:col-span-2">
          <Panel title="Timing metrics" icon={Timer}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Time to first response" value={analytics.timing.avgTimeToFirstResponse} suffix="d" />
              <Metric label="Avg time in stage" value={analytics.timing.avgTimeInStage} suffix="d" />
              <Metric label="Interview to decision" value={analytics.timing.avgInterviewToDecision} suffix="d" />
            </div>
          </Panel>
        </StaggerItem>

        {/* Segment breakdowns — one dimension at a time */}
        <StaggerItem className="xl:col-span-2">
          <Panel title="Segment breakdowns" icon={Activity}>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {DIMENSIONS.map((d) => (
                <DimensionChip key={d.key} active={dimension === d.key} onClick={() => setDimension(d.key)}>
                  {d.label}
                </DimensionChip>
              ))}
            </div>
            {dimensionRows.length ? (
              <GroupedChart data={dimensionRows} />
            ) : (
              <EmptyState title="No segments yet" description="Add applied applications to see segment rates." />
            )}
          </Panel>
        </StaggerItem>

        {/* Rejection */}
        <StaggerItem className="xl:col-span-2">
          <Panel
            title="Rejection analysis"
            icon={PieChart}
            action={
              totalClosed > 0 ? (
                <span className="font-mono text-xs tabular text-ink-500">n={totalClosed} closed</span>
              ) : undefined
            }
          >
            <p className="mb-4 text-xs text-ink-500">
              Always computed from every closed application, regardless of the &quot;Include closed&quot; filter above.
            </p>
            {totalClosed > 0 ? (
              <div className="grid gap-5 sm:grid-cols-3">
                <RejectionBreakdown title="Outcomes" rows={rejectionAnalytics.rejection.outcomes} color="var(--status-down)" />
                <RejectionBreakdown title="Rejection stage" rows={rejectionAnalytics.rejection.stages} color="var(--status-warn)" />
                <RejectionBreakdown title="Rejection reasons" rows={rejectionAnalytics.rejection.reasons} color="var(--brand)" />
              </div>
            ) : (
              <EmptyState title="No closed outcomes yet" description="Record outcomes on closed applications to populate this panel." />
            )}
          </Panel>
        </StaggerItem>

        {/* Weekly volume */}
        <StaggerItem className="xl:col-span-2">
          <Panel title="Weekly volume" icon={Activity}>
            {analytics.weeklyVolume.length ? (
              <SingleChart data={analytics.weeklyVolume} xKey="week" dataKey="count" color="var(--brand)" />
            ) : (
              <EmptyState title="No weekly volume yet" description="Applications with a date applied populate this chart." />
            )}
          </Panel>
        </StaggerItem>
      </Stagger>
    </>
  )
}

/* ── Effort ROI headline ───────────────────────────────────────────────── */

function EffortRoiHeadline({ roi }: { roi: EffortRoiModel }) {
  return (
    <div className="gradient-ring glass mb-4 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="micro-label flex items-center gap-1.5">
            <Zap className="size-3.5 text-brand" />
            Effort ROI · {roi.total} applied
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
            {roi.takeaway ?? "Where your effort actually converts"}
          </h2>
          {!roi.takeaway && (
            <p className="mt-1 text-sm text-ink-300">
              Rates firm up once a group reaches {ROI_MIN_SAMPLE}+ applications. Ghosted and
              silent closes count as no response.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roi.byType.map((row) => (
          <RoiTypeTile key={row.key} row={row} />
        ))}
      </div>

      {roi.bySource.length > 0 && (
        <div className="mt-5 border-t border-line/70 pt-4">
          <p className="micro-label mb-3">By source</p>
          <div className="grid gap-2.5">
            {roi.bySource.map((row) => (
              <RoiSourceRow key={row.key} row={row} />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-4 text-[11px] text-ink-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand" /> Response rate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-status-info" /> Interview rate
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

function RoiTypeTile({ row }: { row: RoiRow }) {
  const muted = row.total === 0
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface-1/60 p-3.5",
        muted && "opacity-60"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-ink-300">{row.label}</p>
        {row.lowSample && (
          <span className="shrink-0 rounded border border-status-warn/30 bg-status-warn/10 px-1.5 text-[10px] text-status-warn">
            low sample
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular">
        {muted ? <span className="text-ink-500">—</span> : <>{row.responseRate}%</>}
        {!muted && <span className="ml-1 text-xs font-normal text-ink-500">response</span>}
      </p>
      <p className="mt-1 font-mono text-xs tabular text-ink-500">
        {muted ? "no applications yet" : `${row.interviewRate}% interview · n=${row.total}`}
      </p>
    </div>
  )
}

function RoiSourceRow({ row }: { row: RoiRow }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
      <span className="truncate text-sm text-ink-300">{row.label}</span>
      <div className="grid gap-1">
        <RoiBar value={row.responseRate} className="bg-brand" />
        <RoiBar value={row.interviewRate} className="bg-status-info" />
      </div>
      <span className="w-24 text-right font-mono text-xs tabular text-ink-500">
        {row.responseRate}% · {row.interviewRate}%
        <span className="ml-1 text-ink-500/70">n={row.total}</span>
      </span>
    </div>
  )
}

function RoiBar({ value, className }: { value: number; className: string }) {
  return (
    <span className="h-1.5 overflow-hidden rounded-full bg-surface-3 ring-1 ring-inset ring-line">
      <span
        className={cn("block h-full rounded-full transition-[width] duration-500 ease-out", className)}
        style={{ width: `${Math.min(100, Math.max(value, value > 0 ? 3 : 0))}%` }}
      />
    </span>
  )
}

function Metric({ label, value, suffix }: { label: string; value: number | undefined; suffix: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface-1/60 p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-brand/10 blur-2xl"
      />
      <p className="micro-label">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold tabular text-ink-100">
        {value === undefined ? <span className="text-ink-500">n/a</span> : <><CountUp value={value} />{suffix}</>}
      </p>
    </div>
  )
}

/* ── Rejection breakdown — horizontal count bars, same grammar as the funnel ─ */

function RejectionBreakdown({
  title,
  rows,
  color,
}: {
  title: string
  rows: Array<{ name: string; value: number }>
  color: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  return (
    <div>
      <p className="micro-label mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">No data yet.</p>
      ) : (
        <div className="grid gap-2">
          {rows
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((row) => (
              <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-2">
                <span className="truncate text-xs text-ink-300" title={row.name}>
                  {row.name.replace(/_/g, " ")}
                </span>
                <span className="font-mono text-xs tabular text-ink-500">{row.value}</span>
                <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-3 ring-1 ring-inset ring-line">
                  <span
                    className="block h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max((row.value / max) * 100, 6)}%`, background: color }}
                  />
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

const tooltipStyle = {
  background: "var(--surface-3)",
  border: "1px solid var(--line-strong)",
  borderRadius: 8,
  color: "var(--ink-100)",
  fontSize: 12,
  boxShadow: "var(--shadow-overlay)",
}

/* Two-line x-axis tick: segment label on top, sample size (n=) below. */
function SegmentTick({
  x,
  y,
  payload,
  rows,
}: {
  x?: number | string
  y?: number | string
  payload?: { value: string }
  rows: Array<{ key: string; total: number }>
}) {
  if (x === undefined || y === undefined || !payload) return null
  const row = rows.find((r) => r.key === payload.value)
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="var(--ink-500)" fontSize={11}>
        {payload.value}
      </text>
      {row !== undefined && (
        <text x={0} y={0} dy={26} textAnchor="middle" fill="var(--ink-500)" fontSize={9} opacity={0.75} className="font-mono tabular">
          n={row.total}
        </text>
      )}
    </g>
  )
}

function GroupedChart({ data }: { data: Array<{ key: string; total: number } & Record<string, string | number>> }) {
  const minWidth = Math.max(320, data.length * 90)
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth }}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="22%" margin={{ bottom: 12 }}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.55} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="key"
                height={36}
                interval={0}
                tick={(props) => <SegmentTick {...props} rows={data} />}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
              />
              <YAxis tick={{ fill: "var(--ink-500)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} unit="%" />
              <Tooltip
                cursor={{ fill: "var(--surface-3)", opacity: 0.35 }}
                contentStyle={tooltipStyle}
                formatter={(value, name) => [`${value}%`, SERIES.find((s) => s.key === name)?.label ?? name]}
                labelFormatter={(label, payload) => {
                  const total = payload?.[0]?.payload?.total
                  return total !== undefined ? `${label} · n=${total}` : label
                }}
              />
              {SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={`url(#grad-${s.key})`} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-ink-300">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SingleChart({
  data,
  xKey,
  dataKey,
  color,
}: {
  data: Array<Record<string, string | number>>
  xKey: string
  dataKey: string
  color: string
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="28%">
          <defs>
            <linearGradient id={`single-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "var(--ink-500)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis tick={{ fill: "var(--ink-500)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: "var(--surface-3)", opacity: 0.35 }} contentStyle={tooltipStyle} />
          <Bar dataKey={dataKey} fill={`url(#single-${dataKey})`} radius={[6, 6, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
