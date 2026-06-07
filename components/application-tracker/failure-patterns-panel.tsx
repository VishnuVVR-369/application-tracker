"use client"

import { AlertTriangle, BarChart3, Route } from "lucide-react"

import { buildFailureAnalyticsModel } from "@/lib/failure-analytics-model"
import { cn } from "@/lib/utils"
import { EmptyState, LoadingPanels, Panel } from "./common"
import {
  mapApplication,
  mapInterview,
  mapInterviewPrepPlan,
  mapReferralOutreach,
  mapStory,
} from "./data-mappers"
import { useAppData } from "./use-app-data"

export function FailurePatternsPanel() {
  const { data, isLoading } = useAppData()
  if (isLoading) return <LoadingPanels />
  if (!data) {
    return <EmptyState title="Failure analytics unavailable" description="Sign in to load failure patterns." />
  }

  const model = buildFailureAnalyticsModel({
    applications: data.applications.map(mapApplication),
    interviews: data.applicationInterviews.map(mapInterview),
    outreach: data.referralOutreach.map(mapReferralOutreach),
    prepPlans: data.interviewPrepPlans.map(mapInterviewPrepPlan),
    stories: data.storyBankEntries.map(mapStory),
  })

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-5">
        <Metric label="Applied" value={model.summary.applied} />
        <Metric label="Rejected" value={model.summary.rejected} />
        <Metric label="Cold apply" value={model.summary.coldApplyRate} suffix="%" />
        <Metric label="Referral backed" value={model.summary.referralBackedRate} suffix="%" />
        <Metric label="Low prep" value={model.summary.lowPrepPlans} warn />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Bottleneck signals" icon={AlertTriangle}>
          {model.signals.length === 0 ? (
            <EmptyState
              icon={Route}
              title="No strong failure pattern yet"
              description="As you add outcomes, referrals, prep plans, and stories, this panel will surface the highest-leverage fix."
            />
          ) : (
            <div className="grid gap-3">
              {model.signals.map((signal) => (
                <div
                  key={signal.key}
                  className={cn(
                    "rounded-xl border p-3",
                    signal.severity === "high"
                      ? "border-status-down/30 bg-status-down/10"
                      : "border-status-warn/30 bg-status-warn/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{signal.title}</h3>
                    <span className="micro-label">{signal.severity}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-300">{signal.detail}</p>
                  <p className="mt-2 text-sm text-ink-100">{signal.action}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Pattern breakdown" icon={BarChart3}>
          <Breakdown title="Rejection reasons" rows={model.rejectionReasons} />
          <Breakdown title="Interview failures" rows={model.interviewFailures} className="mt-5" />
        </Panel>
      </div>
    </div>
  )
}

function Metric({ label, value, suffix = "", warn }: { label: string; value: number; suffix?: string; warn?: boolean }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="micro-label">{label}</p>
      <p className={cn("mt-2 font-mono text-2xl font-semibold tabular", warn && value > 0 && "text-status-warn")}>
        {value}{suffix}
      </p>
    </div>
  )
}

function Breakdown({
  title,
  rows,
  className,
}: {
  title: string
  rows: Array<{ label: string; count: number }>
  className?: string
}) {
  return (
    <div className={className}>
      <p className="micro-label mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">No data yet.</p>
      ) : (
        <div className="grid gap-2">
          {rows.slice(0, 6).map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm">
              <span>{row.label.replace(/_/g, " ")}</span>
              <span className="font-mono text-xs text-ink-500">{row.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
