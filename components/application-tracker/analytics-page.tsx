"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { buildAnalyticsModel } from "@/lib/analytics-model"
import { EmptyState, LoadingPanels, PageHeader, Panel } from "./common"
import { mapActivity, mapApplication, mapResume } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function AnalyticsPage() {
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

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Funnel, timing, segments, and rejection patterns"
        description="Filters are explicit. Archived and closed applications are excluded by default."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-1 px-3 py-2 text-sm">
          <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
          Include archived
        </label>
        <label className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-1 px-3 py-2 text-sm">
          <input type="checkbox" checked={includeClosed} onChange={(event) => setIncludeClosed(event.target.checked)} />
          Include closed
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Funnel and conversion">
          <Chart
            data={analytics.funnel}
            xKey="label"
            bars={[
              { key: "count", color: "var(--brand)" },
              { key: "conversion", color: "var(--status-info)" },
            ]}
          />
        </Panel>

        <Panel title="Timing metrics">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="First response" value={analytics.timing.avgTimeToFirstResponse} suffix="d" />
            <Metric label="Time in stage" value={analytics.timing.avgTimeInStage} suffix="d" />
            <Metric label="Interview to decision" value={analytics.timing.avgInterviewToDecision} suffix="d" />
          </div>
        </Panel>

        <Panel title="Segment breakdowns" className="xl:col-span-2">
          {breakdownRows.length ? (
            <Chart
              data={breakdownRows}
              xKey="key"
              bars={[
                { key: "responseRate", color: "var(--brand)" },
                { key: "interviewRate", color: "var(--status-info)" },
                { key: "offerRate", color: "var(--stage-interview)" },
              ]}
            />
          ) : (
            <EmptyState title="No segments yet" description="Add applied applications to see segment rates." />
          )}
        </Panel>

        <Panel title="Rejection analysis">
          {!includeClosed ? (
            <EmptyState
              title="Closed applications are excluded"
              description="Turn on include closed to populate outcome, rejection stage, and rejection reason charts."
            />
          ) : analytics.rejection.outcomes.length ? (
            <Chart data={analytics.rejection.outcomes} xKey="name" bars={[{ key: "value", color: "var(--status-down)" }]} />
          ) : (
            <EmptyState title="No closed outcomes" description="Record outcomes on closed applications to populate this chart." />
          )}
        </Panel>

        <Panel title="Weekly volume">
          {analytics.weeklyVolume.length ? (
            <Chart data={analytics.weeklyVolume} xKey="week" bars={[{ key: "count", color: "var(--brand)" }]} />
          ) : (
            <EmptyState title="No weekly volume yet" description="Applications with a date applied populate this chart." />
          )}
        </Panel>
      </div>
    </>
  )
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string
  value: number | undefined
  suffix: string
}) {
  return (
    <div className="rounded-md border border-line bg-surface-1 p-4">
      <p className="micro-label">{label}</p>
      <p className="mt-2 font-mono text-2xl tabular">{value === undefined ? "n/a" : `${value}${suffix}`}</p>
    </div>
  )
}

function Chart({
  data,
  xKey,
  bars,
}: {
  data: Array<Record<string, string | number>>
  xKey: string
  bars: Array<{ key: string; color: string }>
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "var(--ink-500)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--ink-500)", fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-3)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              color: "var(--ink-100)",
            }}
          />
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} fill={bar.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

