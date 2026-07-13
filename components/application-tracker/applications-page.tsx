"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMutation } from "convex/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronsUpDown,
  FileText,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  UserCheck,
  Users,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  APPLICATION_STAGES,
  REFERRAL_LABELS,
  REFERRAL_STATUSES,
  SOURCE_LABELS,
  SOURCES,
  STAGE_LABELS,
  type ApplicationRecord,
  type ApplicationStage,
  type ReferralStatus,
} from "@/lib/application-model"
import { formatShortDate } from "@/lib/date-model"
import { getInterviewStart } from "@/lib/interview-model"
import { calculateQualityScore } from "@/lib/quality-model"
import { cn } from "@/lib/utils"
import { ApplicationFormSheet } from "./application-form-sheet"
import {
  EmptyState,
  FilterSelect,
  PageHeader,
  Panel,
  StageBadge,
  StageSelect,
} from "./common"
import { BoardSkeleton } from "./skeletons"
import { mapApplication, mapInterview } from "./data-mappers"
import { useAppData } from "./use-app-data"

const stageDot: Record<ApplicationStage, string> = {
  saved: "bg-stage-saved",
  applied: "bg-stage-applied",
  phone_screen: "bg-stage-phone",
  interview: "bg-stage-interview",
  offer: "bg-stage-offer",
  closed: "bg-stage-closed",
}

type SortKey = "company" | "role" | "stage" | "source" | "referral" | "applied" | "deadline" | "quality"
type SortState = { key: SortKey; dir: "asc" | "desc" }
const DESC_FIRST: SortKey[] = ["applied", "deadline", "quality"]

function QualityMeter({ score }: { score: number }) {
  const tone =
    score >= 75 ? "text-status-up" : score >= 45 ? "text-status-warn" : "text-status-down"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs tabular", tone)}>
          <span className="h-1 w-8 overflow-hidden rounded-full bg-surface-3">
            <span className="block h-full rounded-full bg-current" style={{ width: `${score}%` }} />
          </span>
          {score}
        </span>
      </TooltipTrigger>
      <TooltipContent>Quality score {score}/100</TooltipContent>
    </Tooltip>
  )
}

function applicationDeadline(application: ApplicationRecord) {
  return (
    application.takeHomeDeadlineDate ??
    application.offerResponseDeadlineDate ??
    application.applicationDeadlineDate
  )
}

type Row = { app: ApplicationRecord; score: number; deadline?: string }

function compareRows(a: Row, b: Row, key: SortKey): number {
  switch (key) {
    case "company":
      return a.app.companyName.localeCompare(b.app.companyName)
    case "role":
      return a.app.roleTitle.localeCompare(b.app.roleTitle)
    case "stage":
      return APPLICATION_STAGES.indexOf(a.app.stage) - APPLICATION_STAGES.indexOf(b.app.stage)
    case "source":
      return (a.app.source ? SOURCE_LABELS[a.app.source] : "").localeCompare(
        b.app.source ? SOURCE_LABELS[b.app.source] : ""
      )
    case "referral":
      return (a.app.referralStatus ? REFERRAL_LABELS[a.app.referralStatus] : "").localeCompare(
        b.app.referralStatus ? REFERRAL_LABELS[b.app.referralStatus] : ""
      )
    case "applied":
      return (a.app.dateAppliedDate ?? "").localeCompare(b.app.dateAppliedDate ?? "")
    case "deadline":
      return (a.deadline ?? "").localeCompare(b.deadline ?? "")
    case "quality":
      return a.score - b.score
  }
}

function SortableHead({
  column,
  label,
  sort,
  onSort,
  className,
}: {
  column: SortKey
  label: string
  sort: SortState | null
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = sort?.key === column
  const Icon = !active ? ChevronsUpDown : sort?.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <TableHead className={cn("h-9 px-4 text-xs", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "group/sort -ml-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 font-medium transition-colors hover:text-ink-100",
          active ? "text-ink-100" : "text-ink-500"
        )}
      >
        {label}
        <Icon
          className={cn(
            "size-3.5 transition-colors",
            active ? "text-brand" : "text-ink-500/50 group-hover/sort:text-ink-300"
          )}
        />
      </button>
    </TableHead>
  )
}

export function ApplicationsPage() {
  const { data, isLoading } = useAppData()
  const moveStage = useMutation(api.applications.moveStage)
  const searchParams = useSearchParams()
  const reduce = useReducedMotion()

  const initialStage = (searchParams.get("stage") ?? "") as ApplicationStage | ""
  const initialReferral = (searchParams.get("referral") ?? "") as ReferralStatus | ""

  const [view, setView] = React.useState<"board" | "list">(
    initialStage || initialReferral ? "list" : "board"
  )
  const [stageFilter, setStageFilter] = React.useState<ApplicationStage | "">(initialStage)
  const [sourceFilter, setSourceFilter] = React.useState<string>("")
  const [referralFilter, setReferralFilter] = React.useState<string>(initialReferral)
  const [includeArchived, setIncludeArchived] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<SortState | null>(null)
  const [draggedId, setDraggedId] = React.useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = React.useState<ApplicationStage | null>(null)
  const [now] = React.useState(() => Date.now())

  if (isLoading) {
    return <BoardSkeleton />
  }

  if (!data) {
    return (
      <EmptyState
        title="Applications are stored in Convex"
        description="Sign in and your application pipeline will load from the database."
      />
    )
  }

  const allApplications = data.applications.map(mapApplication)
  const normalizedQuery = query.trim().toLowerCase()

  // Per-application enrichment for cards/rows: soonest upcoming interview and
  // how many people are attached.
  const nextInterviewByApp = new Map<string, number>()
  for (const interview of data.applicationInterviews.map(mapInterview)) {
    if (interview.status !== "scheduled" && interview.status !== "rescheduled") continue
    const start = getInterviewStart(interview)
    if (start === undefined || start < now) continue
    const current = nextInterviewByApp.get(interview.applicationId)
    if (current === undefined || start < current) nextInterviewByApp.set(interview.applicationId, start)
  }
  const contactCountByApp = new Map<string, number>()
  for (const contact of data.applicationContacts) {
    contactCountByApp.set(contact.applicationId, (contactCountByApp.get(contact.applicationId) ?? 0) + 1)
  }

  const filtersActive = Boolean(
    stageFilter || sourceFilter || referralFilter || includeArchived || normalizedQuery
  )

  const applications = allApplications
    .filter((application) => includeArchived || !application.archived)
    .filter((application) => !stageFilter || application.stage === stageFilter)
    .filter((application) => !sourceFilter || application.source === sourceFilter)
    .filter((application) => !referralFilter || application.referralStatus === referralFilter)
    .filter((application) => {
      if (!normalizedQuery) return true
      const haystack = `${application.companyName} ${application.roleTitle}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const rows: Row[] = applications.map((application) => ({
    app: application,
    score: calculateQualityScore(application.qualityChecks),
    deadline: applicationDeadline(application),
  }))
  const sortedRows = sort
    ? [...rows].sort((a, b) => (sort.dir === "asc" ? 1 : -1) * compareRows(a, b, sort.key))
    : rows

  async function updateStage(id: string, stage: ApplicationStage) {
    await moveStage({ id: id as Id<"applications">, stage })
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: DESC_FIRST.includes(key) ? "desc" : "asc" }
    )
  }

  function clearFilters() {
    setStageFilter("")
    setSourceFilter("")
    setReferralFilter("")
    setIncludeArchived(false)
    setQuery("")
  }

  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
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
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={(value) => setView(value as "board" | "list")}>
            <TabsList>
              <TabsTrigger value="board">
                <LayoutGrid />
                Board
              </TabsTrigger>
              <TabsTrigger value="list">
                <List />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="hidden font-mono text-xs tabular text-ink-500 sm:inline">
            {applications.length} shown
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company or role…"
            aria-label="Search applications"
            className="h-9 w-full sm:w-48"
          />
          <FilterSelect
            value={stageFilter}
            onChange={setStageFilter}
            placeholder="All stages"
            options={APPLICATION_STAGES.map((stage) => ({ value: stage, label: STAGE_LABELS[stage] }))}
          />
          <FilterSelect
            value={sourceFilter}
            onChange={setSourceFilter}
            placeholder="All sources"
            options={SOURCES.map((source) => ({ value: source, label: SOURCE_LABELS[source] }))}
          />
          <FilterSelect
            value={referralFilter}
            onChange={setReferralFilter}
            placeholder="All referrals"
            options={REFERRAL_STATUSES.map((status) => ({ value: status, label: REFERRAL_LABELS[status] }))}
          />
          <div
            className={cn(
              "inline-flex h-9 items-center gap-2.5 rounded-md border px-3 text-sm transition-colors",
              includeArchived
                ? "border-brand/40 bg-brand-weak text-brand"
                : "border-line bg-surface-1 text-ink-300 hover:border-line-strong"
            )}
          >
            <Switch
              id="include-archived"
              checked={includeArchived}
              onCheckedChange={setIncludeArchived}
            />
            <Label htmlFor="include-archived" className="cursor-pointer text-current">
              Archived
            </Label>
          </div>
          <AnimatePresence initial={false}>
            {filtersActive && (
              <motion.div
                initial={reduce ? false : { opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-ink-300">
                  <RotateCcw />
                  Clear
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {applications.length === 0 ? (
        filtersActive ? (
          <EmptyState
            icon={LayoutGrid}
            title="No applications match these filters"
            description="Your filters are hiding every application. Clear them to bring your pipeline back."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                <RotateCcw className="size-4" />
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={LayoutGrid}
            title="No applications yet"
            description="Add your first application to start tracking it from saved through to an outcome."
          />
        )
      ) : (
        <motion.div
          key={view}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {view === "board" ? (
            <div className="grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-4 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-6">
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
                                  {application.currentResumeId && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-1 text-xs text-brand">
                                          <FileText className="size-3" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>Resume linked</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {application.referralStatus === "referred" && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-1 text-xs text-stage-interview">
                                          <UserCheck className="size-3" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>Referred</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {nextInterviewByApp.has(application.id) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular text-stage-interview">
                                          <CalendarClock className="size-3" />
                                          {formatShortDate(nextInterviewByApp.get(application.id))}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>Next interview</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {(contactCountByApp.get(application.id) ?? 0) > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                                      <Users className="size-3" />
                                      {contactCountByApp.get(application.id)}
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
                        <div
                          className={cn(
                            "flex flex-1 items-center justify-center rounded-lg border border-dashed py-6 text-center text-xs transition-colors",
                            isOver
                              ? "border-brand/50 bg-brand-weak text-brand"
                              : draggedId
                                ? "border-line-strong text-ink-300"
                                : "border-line/60 text-ink-500"
                          )}
                        >
                          {draggedId ? "Drop here" : "No applications"}
                        </div>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <Panel title="Application list" label={`${applications.length} shown`} contentClassName="p-0">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow className="border-line bg-surface-1/40 hover:bg-surface-1/40">
                    <SortableHead column="company" label="Company" sort={sort} onSort={toggleSort} />
                    <SortableHead column="role" label="Role" sort={sort} onSort={toggleSort} />
                    <SortableHead column="stage" label="Stage" sort={sort} onSort={toggleSort} />
                    <SortableHead column="source" label="Source" sort={sort} onSort={toggleSort} />
                    <SortableHead column="referral" label="Referral" sort={sort} onSort={toggleSort} />
                    <SortableHead column="applied" label="Applied" sort={sort} onSort={toggleSort} />
                    <SortableHead column="deadline" label="Deadline" sort={sort} onSort={toggleSort} />
                    <TableHead className="h-9 px-4 text-xs font-medium text-ink-500">Next</TableHead>
                    <SortableHead column="quality" label="Quality" sort={sort} onSort={toggleSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map(({ app: application, score, deadline }) => (
                    <TableRow key={application.id} className="group hover:bg-surface-3/60">
                      <TableCell className="px-4 py-2.5">
                        <Link
                          href={`/app/applications/${application.id}`}
                          className="flex items-center gap-2 font-medium transition-colors group-hover:text-brand"
                        >
                          <span className={cn("size-1.5 rounded-full", stageDot[application.stage])} />
                          {application.companyName}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-ink-300">{application.roleTitle}</TableCell>
                      <TableCell className="px-4 py-2.5">
                        <StageBadge stage={application.stage} />
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-ink-300">
                        {application.source ? SOURCE_LABELS[application.source] : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-ink-300">
                        {application.referralStatus ? REFERRAL_LABELS[application.referralStatus] : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 font-mono text-xs tabular text-ink-300">
                        {formatShortDate(application.dateAppliedDate)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 font-mono text-xs tabular text-ink-300">
                        {formatShortDate(deadline)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 font-mono text-xs tabular">
                        {nextInterviewByApp.has(application.id) ? (
                          <span className="inline-flex items-center gap-1 text-stage-interview">
                            <CalendarClock className="size-3" />
                            {formatShortDate(nextInterviewByApp.get(application.id))}
                          </span>
                        ) : (
                          <span className="text-ink-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <QualityMeter score={score} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}
        </motion.div>
      )}
    </>
  )
}
