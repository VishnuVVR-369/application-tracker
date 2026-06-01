"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import { LayoutGrid, List, Plus } from "lucide-react"

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
  type ApplicationStage,
} from "@/lib/application-model"
import { formatShortDate } from "@/lib/date-model"
import { calculateQualityScore } from "@/lib/quality-model"
import { ApplicationFormSheet } from "./application-form-sheet"
import { EmptyState, LoadingPanels, NativeSelect, PageHeader, Panel, StageBadge, StageSelect } from "./common"
import { mapApplication } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function ApplicationsPage() {
  const { data, isLoading } = useAppData()
  const moveStage = useMutation(api.applications.moveStage)
  const [view, setView] = React.useState<"board" | "list">("board")
  const [stageFilter, setStageFilter] = React.useState<ApplicationStage | "">("")
  const [sourceFilter, setSourceFilter] = React.useState<string>("")
  const [referralFilter, setReferralFilter] = React.useState<string>("")
  const [includeArchived, setIncludeArchived] = React.useState(false)
  const [draggedId, setDraggedId] = React.useState<string | null>(null)

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

      <Panel title="Controls" className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={view === "board" ? "default" : "secondary"}
              onClick={() => setView("board")}
            >
              <LayoutGrid className="size-4" />
              Board
            </Button>
            <Button
              variant={view === "list" ? "default" : "secondary"}
              onClick={() => setView("list")}
            >
              <List className="size-4" />
              List
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <NativeSelect
              value={stageFilter}
              onChange={setStageFilter}
              options={APPLICATION_STAGES.map((stage) => ({
                value: stage,
                label: STAGE_LABELS[stage],
              }))}
            />
            <NativeSelect
              value={sourceFilter}
              onChange={setSourceFilter}
              options={SOURCES.map((source) => ({
                value: source,
                label: SOURCE_LABELS[source],
              }))}
            />
            <NativeSelect
              value={referralFilter}
              onChange={setReferralFilter}
              options={REFERRAL_STATUSES.map((status) => ({
                value: status,
                label: REFERRAL_LABELS[status],
              }))}
            />
            <label className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface-1 px-3 text-sm">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
              />
              Archived
            </label>
          </div>
        </div>
      </Panel>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications match"
          description="Create the first application or loosen filters to bring records back."
        />
      ) : view === "board" ? (
        <div className="grid gap-3 overflow-x-auto pb-4 lg:grid-cols-6">
          {APPLICATION_STAGES.map((stage) => {
            const columnApplications = applications.filter((application) => application.stage === stage)
            return (
              <section
                key={stage}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedId) {
                    void updateStage(draggedId, stage)
                    setDraggedId(null)
                  }
                }}
                className="min-h-80 min-w-64 rounded-lg border border-line bg-surface-2"
              >
                <div className="flex items-center justify-between border-b border-line p-3">
                  <StageBadge stage={stage} />
                  <span className="font-mono text-xs text-ink-500">
                    {columnApplications.length}
                  </span>
                </div>
                <div className="grid gap-2 p-2">
                  {columnApplications.map((application) => (
                    <article
                      key={application.id}
                      draggable
                      onDragStart={() => setDraggedId(application.id)}
                      className="rounded-md border border-line bg-surface-1 p-3 transition hover:bg-surface-3"
                    >
                      <Link href={`/app/applications/${application.id}`} className="block">
                        <p className="micro-label">{application.companyName}</p>
                        <h3 className="mt-1 text-sm font-semibold">{application.roleTitle}</h3>
                        <p className="mt-2 text-xs text-ink-500">
                          Quality {calculateQualityScore(application.qualityChecks)}/100
                        </p>
                      </Link>
                      <div className="mt-3">
                        <StageSelect
                          value={application.stage}
                          onChange={(nextStage) => void updateStage(application.id, nextStage)}
                          className="w-full"
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <Panel title="Application list">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-500">
                <tr>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Stage</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Referral</th>
                  <th className="py-2 pr-3">Applied</th>
                  <th className="py-2 pr-3">Deadline</th>
                  <th className="py-2 pr-3">Quality</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-b border-line hover:bg-surface-3">
                    <td className="py-2 pr-3">
                      <Link href={`/app/applications/${application.id}`} className="font-medium">
                        {application.companyName}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{application.roleTitle}</td>
                    <td className="py-2 pr-3">
                      <StageBadge stage={application.stage} />
                    </td>
                    <td className="py-2 pr-3">
                      {application.source ? SOURCE_LABELS[application.source] : "Not set"}
                    </td>
                    <td className="py-2 pr-3">
                      {application.referralStatus
                        ? REFERRAL_LABELS[application.referralStatus]
                        : "Not set"}
                    </td>
                    <td className="py-2 pr-3">{formatShortDate(application.dateApplied)}</td>
                    <td className="py-2 pr-3">
                      {formatShortDate(
                        application.takeHomeDeadlineAt ??
                          application.offerResponseDeadlineAt ??
                          application.applicationDeadlineAt
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono tabular">
                      {calculateQualityScore(application.qualityChecks)}
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
