"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import { AnimatePresence, motion } from "motion/react"
import {
  CalendarClock,
  FileText,
  LayoutGrid,
  List,
  Plus,
  UserCheck,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  APPLICATION_STAGES,
  REFERRAL_LABELS,
  REFERRAL_STATUSES,
  SOURCE_LABELS,
  SOURCES,
  STAGE_LABELS,
  type ApplicationRecord,
  type ApplicationStage,
} from "@/lib/application-model"
import { formatShortDate } from "@/lib/date-model"
import { calculateQualityScore } from "@/lib/quality-model"
import { cn } from "@/lib/utils"
import { ApplicationFormSheet } from "./application-form-sheet"
import {
  EmptyState,
  LoadingPanels,
  NativeSelect,
  PageHeader,
  Panel,
  StageBadge,
  StageSelect,
} from "./common"
import { mapApplication } from "./data-mappers"
import { useAppData } from "./use-app-data"

const stageDot: Record<ApplicationStage, string> = {
  saved: "bg-stage-saved",
  applied: "bg-stage-applied",
  phone_screen: "bg-stage-phone",
  interview: "bg-stage-interview",
  offer: "bg-stage-offer",
  closed: "bg-stage-closed",
}

function QualityMeter({ score }: { score: number }) {
  const tone =
    score >= 75 ? "text-status-up" : score >= 45 ? "text-status-warn" : "text-status-down"
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs tabular", tone)}>
      <span className="h-1 w-8 overflow-hidden rounded-full bg-surface-3">
        <span className="block h-full rounded-full bg-current" style={{ width: `${score}%` }} />
      </span>
      {score}
    </span>
  )
}

function applicationDeadline(application: ApplicationRecord) {
  return (
    application.takeHomeDeadlineAt ??
    application.offerResponseDeadlineAt ??
    application.applicationDeadlineAt
  )
}

export function ApplicationsPage() {
  const { data, isLoading } = useAppData()
  const moveStage = useMutation(api.applications.moveStage)
  const [view, setView] = React.useState<"board" | "list">("board")
  const [stageFilter, setStageFilter] = React.useState<ApplicationStage | "">("")
  const [sourceFilter, setSourceFilter] = React.useState<string>("")
  const [referralFilter, setReferralFilter] = React.useState<string>("")
  const [includeArchived, setIncludeArchived] = React.useState(false)
  const [draggedId, setDraggedId] = React.useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = React.useState<ApplicationStage | null>(null)

  if (isLoading) {
    return <LoadingPanels />
  }

  if (!data) {
    return (
      <EmptyState
        title="Applications are stored in Convex"
        description="Sign in and your application pipeline will load from the database."
      />
    )
  }

  const applications = data.applications
    .map(mapApplication)
    .filter((application) => includeArchived || !application.archived)
    .filter((application) => !stageFilter || application.stage === stageFilter)
    .filter((application) => !sourceFilter || application.source === sourceFilter)
    .filter((application) => !referralFilter || application.referralStatus === referralFilter)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  async function updateStage(id: string, stage: ApplicationStage) {
    await moveStage({ id: id as Id<"applications">, stage })
  }

  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Pipeline board and list"
        description="Drag cards between any stages, or use the stage menu for a keyboard-friendly direct move."
        action={
          <ApplicationFormSheet
            resumes={data.resumes}
            trigger={
              <Button>
                <Plus className="size-4" />
                New
              </Button>
            }
          />
        }
      />

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="glass mb-4 flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-lg border border-line bg-surface-1/70 p-1">
          {(["board", "list"] as const).map((v) => {
            const Icon = v === "board" ? LayoutGrid : List
            const active = view === v
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  active ? "text-primary-foreground" : "text-ink-300 hover:text-ink-100"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="view-toggle"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-md bg-linear-to-b from-brand-hover to-brand shadow-glow"
                  />
                )}
                <Icon className="relative z-10 size-4" />
                <span className="relative z-10">{v}</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect
            value={stageFilter}
            onChange={setStageFilter}
            options={APPLICATION_STAGES.map((stage) => ({ value: stage, label: STAGE_LABELS[stage] }))}
          />
          <NativeSelect
            value={sourceFilter}
            onChange={setSourceFilter}
            options={SOURCES.map((source) => ({ value: source, label: SOURCE_LABELS[source] }))}
          />
          <NativeSelect
            value={referralFilter}
            onChange={setReferralFilter}
            options={REFERRAL_STATUSES.map((status) => ({ value: status, label: REFERRAL_LABELS[status] }))}
          />
          <label
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors",
              includeArchived
                ? "border-brand/40 bg-brand-weak text-brand"
                : "border-line bg-surface-1 text-ink-300 hover:border-line-strong"
            )}
          >
            <input
              type="checkbox"
              className="accent-brand"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Archived
          </label>
        </div>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No applications match"
          description="Create the first application or loosen filters to bring records back."
        />
      ) : view === "board" ? (
        <div className="grid grid-flow-col auto-cols-[minmax(15rem,1fr)] gap-3 overflow-x-auto pb-4 lg:grid-flow-row lg:grid-cols-6 lg:auto-cols-auto">
          {APPLICATION_STAGES.map((stage) => {
            const columnApplications = applications.filter((a) => a.stage === stage)
            const isOver = dragOverStage === stage
            return (
              <section
                key={stage}
                onDragOver={(event) => {
                  event.preventDefault()
                  if (dragOverStage !== stage) setDragOverStage(stage)
                }}
                onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
                onDrop={() => {
                  if (draggedId) {
                    void updateStage(draggedId, stage)
                    setDraggedId(null)
                  }
                  setDragOverStage(null)
                }}
                className={cn(
                  "flex min-h-80 flex-col rounded-xl border bg-surface-2/40 backdrop-blur-sm transition-colors",
                  isOver ? "border-brand/50 bg-brand-weak" : "border-line"
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2.5">
                  <StageBadge stage={stage} />
                  <span className="font-mono text-xs tabular text-ink-500">
                    {columnApplications.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {columnApplications.map((application) => {
                      const score = calculateQualityScore(application.qualityChecks)
                      const deadline = applicationDeadline(application)
                      const dragging = draggedId === application.id
                      return (
                        <motion.article
                          key={application.id}
                          layout
                          layoutId={`card-${application.id}`}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: dragging ? 0.5 : 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ type: "spring", stiffness: 500, damping: 38 }}
                          draggable
                          onDragStart={() => setDraggedId(application.id)}
                          onDragEnd={() => {
                            setDraggedId(null)
                            setDragOverStage(null)
                          }}
                          className={cn(
                            "group cursor-grab rounded-lg border border-line bg-surface-1 p-3 transition-colors hover:border-line-strong active:cursor-grabbing",
                            dragging && "ring-2 ring-brand/50"
                          )}
                        >
                          <Link href={`/app/applications/${application.id}`} className="block">
                            <p className="micro-label truncate">{application.companyName}</p>
                            <h3 className="mt-1 truncate text-sm font-semibold tracking-tight">
                              {application.roleTitle}
                            </h3>
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                              <QualityMeter score={score} />
                              {application.resumeId && (
                                <span className="inline-flex items-center gap-1 text-xs text-brand">
                                  <FileText className="size-3" />
                                </span>
                              )}
                              {application.referralStatus === "referred" && (
                                <span className="inline-flex items-center gap-1 text-xs text-stage-interview">
                                  <UserCheck className="size-3" />
                                </span>
                              )}
                              {deadline && (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular text-status-warn">
                                  <CalendarClock className="size-3" />
                                  {formatShortDate(deadline)}
                                </span>
                              )}
                            </div>
                          </Link>
                          <div className="mt-3">
                            <StageSelect
                              value={application.stage}
                              onChange={(nextStage) => void updateStage(application.id, nextStage)}
                              className="w-full"
                            />
                          </div>
                        </motion.article>
                      )
                    })}
                  </AnimatePresence>
                  {columnApplications.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line/60 py-6 text-center text-xs text-ink-500">
                      Drop here
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <Panel title="Application list" label={`${applications.length} shown`}>
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs text-ink-500">
                  {["Company", "Role", "Stage", "Source", "Referral", "Applied", "Deadline", "Quality"].map(
                    (h) => (
                      <th
                        key={h}
                        className="sticky top-0 border-b border-line bg-surface-2 px-4 py-2.5 font-medium first:pl-4"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="group transition-colors hover:bg-surface-3/60">
                    <td className="border-b border-line/60 px-4 py-2.5">
                      <Link
                        href={`/app/applications/${application.id}`}
                        className="flex items-center gap-2 font-medium transition-colors group-hover:text-brand"
                      >
                        <span className={cn("size-1.5 rounded-full", stageDot[application.stage])} />
                        {application.companyName}
                      </Link>
                    </td>
                    <td className="border-b border-line/60 px-4 py-2.5 text-ink-300">
                      {application.roleTitle}
                    </td>
                    <td className="border-b border-line/60 px-4 py-2.5">
                      <StageBadge stage={application.stage} />
                    </td>
                    <td className="border-b border-line/60 px-4 py-2.5 text-ink-300">
                      {application.source ? SOURCE_LABELS[application.source] : "—"}
                    </td>
                    <td className="border-b border-line/60 px-4 py-2.5 text-ink-300">
                      {application.referralStatus ? REFERRAL_LABELS[application.referralStatus] : "—"}
                    </td>
                    <td className="border-b border-line/60 px-4 py-2.5 font-mono text-xs tabular text-ink-300">
                      {formatShortDate(application.dateApplied)}
                    </td>
                    <td className="border-b border-line/60 px-4 py-2.5 font-mono text-xs tabular text-ink-300">
                      {formatShortDate(applicationDeadline(application))}
                    </td>
                    <td className="border-b border-line/60 px-4 py-2.5">
                      <QualityMeter score={calculateQualityScore(application.qualityChecks)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  )
}
