"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, Filter, GitBranch, PieChart, Timer } from "lucide-react"

import { buildAnalyticsModel } from "@/lib/analytics-model"
import { cn } from "@/lib/utils"
import { CountUp, Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, LoadingPanels, PageHeader, Panel } from "./common"
import { mapActivity, mapApplication, mapResume, mapStageHistory } from "./data-mappers"
import { useAppData } from "./use-app-data"

const SERIES = [
  { key: "responseRate", label: "Response", color: "var(--brand)" },
  { key: "interviewRate", label: "Interview", color: "var(--status-info)" },
  { key: "offerRate", label: "Offer", color: "var(--stage-interview)" },
] as const

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

  if (isLoading) {
    return <LoadingPanels />
  }

  if (!data) {
    return <EmptyState title="Analytics unavailable" description="Sign in to compute analytics from Convex records." />
  }

  const analytics = buildAnalyticsModel({
    applications: data.applications.map(mapApplication),
    activityEvents: data.activityEvents.map(mapActivity),
    stageHistory: data.applicationStageHistory.map(mapStageHistory),
    resumes: data.resumes.map(mapResume),
    filters: { includeArchived, includeClosed },
  })
  const breakdownRows = [
    ...analytics.breakdowns.source.slice(0, 5),
    ...analytics.breakdowns.referral.slice(0, 5),
    ...analytics.breakdowns.workArrangement.slice(0, 5),
    ...analytics.breakdowns.quality.slice(0, 5),
    ...analytics.breakdowns.resume.slice(0, 5),
  ]
  const maxFunnel = Math.max(1, ...analytics.funnel.map((step) => Number(step.count) || 0))

  return (
    <>
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

        {/* Segment breakdowns */}
        <StaggerItem className="xl:col-span-2">
          <Panel title="Segment breakdowns" icon={Activity}>
            {breakdownRows.length ? (
              <GroupedChart data={breakdownRows} xKey="key" />
            ) : (
              <EmptyState title="No segments yet" description="Add applied applications to see segment rates." />
            )}
          </Panel>
        </StaggerItem>

        {/* Rejection */}
        <StaggerItem>
          <Panel title="Rejection analysis" icon={PieChart} className="h-full">
            {!includeClosed ? (
              <EmptyState
                icon={Filter}
                title="Closed applications are excluded"
                description="Turn on include closed to populate outcome, rejection stage, and reason charts."
              />
            ) : analytics.rejection.outcomes.length ? (
              <SingleChart data={analytics.rejection.outcomes} xKey="name" dataKey="value" color="var(--status-down)" />
            ) : (
              <EmptyState title="No closed outcomes" description="Record outcomes on closed applications to populate this chart." />
            )}
          </Panel>
        </StaggerItem>

        {/* Weekly volume */}
        <StaggerItem>
          <Panel title="Weekly volume" icon={Activity} className="h-full">
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

const tooltipStyle = {
  background: "var(--surface-3)",
  border: "1px solid var(--line-strong)",
  borderRadius: 8,
  color: "var(--ink-100)",
  fontSize: 12,
  boxShadow: "var(--shadow-overlay)",
}

function GroupedChart({ data, xKey }: { data: Array<Record<string, string | number>>; xKey: string }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="22%">
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "var(--ink-500)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis tick={{ fill: "var(--ink-500)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: "var(--surface-3)", opacity: 0.35 }} contentStyle={tooltipStyle} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: "var(--ink-300)" }}
            formatter={(value) => SERIES.find((s) => s.key === value)?.label ?? value}
          />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} fill={`url(#grad-${s.key})`} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
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
