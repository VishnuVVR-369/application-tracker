"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { BookOpenCheck, Brain, Check, Minus, Pencil, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  PREP_FOCUS_LABELS,
  PREP_PLAN_STATUS_LABELS,
  PREP_PLAN_STATUSES,
  type PrepPlanStatus,
} from "@/lib/application-model"
import { buildPrepModel } from "@/lib/prep-model"
import { cn } from "@/lib/utils"
import { Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, PageHeader, Panel, ProgressBar } from "./common"
import { PrepFormSheet } from "./prep-form-sheet"
import { PageSkeleton } from "./skeletons"
import { mapApplication, mapInterviewPrepPlan, mapTargetCompany } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function PrepPage() {
  const { data, isLoading } = useAppData("prep")
  const updatePlan = useMutation(api.prep.updatePlan)
  const [editingPlanId, setEditingPlanId] = React.useState<string | null>(null)
  const [editingNextActionId, setEditingNextActionId] = React.useState<string | null>(null)
  const [nextActionDraft, setNextActionDraft] = React.useState("")

  if (isLoading) return <PageSkeleton action stats={4} columns="1fr" panels={3} />
  if (!data) {
    return <EmptyState title="Prep unavailable" description="Sign in to load interview prep." />
  }

  const applications = data.applications.map(mapApplication)
  const targets = data.targetCompanies.map(mapTargetCompany)
  const prepModel = buildPrepModel(data.interviewPrepPlans.map(mapInterviewPrepPlan))
  const editingPlan = prepModel.rows.find((row) => row.plan.id === editingPlanId)?.plan

  /* Fast inline updates never toast on success — a toast per stepper click
     or chip toggle would be noise. Errors still surface. */
  async function safeUpdate(payload: Parameters<typeof updatePlan>[0]) {
    try {
      await updatePlan(payload)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update prep plan")
    }
  }

  function startNextActionEdit(planId: string, current: string) {
    setEditingNextActionId(planId)
    setNextActionDraft(current)
  }

  async function commitNextAction(planId: string) {
    setEditingNextActionId(null)
    await safeUpdate({
      id: planId as Id<"interviewPrepPlans">,
      nextAction: nextActionDraft.trim() || null,
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Prep"
        title="Interview prep command center"
        description="Track readiness across DSA, system design, behavioral stories, mock interviews, company research, and resume deep dives."
        action={
          <PrepFormSheet
            applications={applications}
            targets={targets}
            trigger={
              <Button>
                <Plus className="size-4" /> New plan
              </Button>
            }
          />
        }
      />

      <Stagger className="grid gap-4">
        <StaggerItem>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Plans" value={prepModel.summary.total} />
            <Stat label="Ready" value={prepModel.summary.ready} />
            <Stat label="Needs work" value={prepModel.summary.needsWork} warn />
            <Stat label="Weakness tags" value={prepModel.summary.topWeaknesses.length} />
          </div>
        </StaggerItem>

        {prepModel.rows.length === 0 ? (
          <StaggerItem>
            <EmptyState
              icon={BookOpenCheck}
              title="No prep plans yet"
              description="Create one per high-priority company or active interview loop."
              action={
                <PrepFormSheet
                  applications={applications}
                  targets={targets}
                  trigger={
                    <Button>
                      <Plus className="size-4" /> New plan
                    </Button>
                  }
                />
              }
            />
          </StaggerItem>
        ) : (
          prepModel.rows.map(({ plan, readiness }) => {
            const application = applications.find((item) => item.id === plan.applicationId)
            const target = targets.find((item) => item.id === plan.targetCompanyId)
            const isEditingNextAction = editingNextActionId === plan.id
            return (
              <StaggerItem key={plan.id}>
                <Panel
                  title={plan.title}
                  label={application?.companyName ?? target?.companyName ?? PREP_PLAN_STATUS_LABELS[plan.status]}
                  icon={Brain}
                  action={
                    <div className="flex items-center gap-2">
                      <Select
                        value={plan.status}
                        onValueChange={(status) =>
                          void safeUpdate({
                            id: plan.id as Id<"interviewPrepPlans">,
                            status: status as PrepPlanStatus,
                          })
                        }
                      >
                        <SelectTrigger aria-label="Plan status" className="h-8 w-[9.5rem] bg-surface-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PREP_PLAN_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {PREP_PLAN_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit plan"
                        onClick={() => setEditingPlanId(plan.id)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  }
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_11rem]">
                    <div className="grid gap-3">
                      {plan.focusAreas.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {plan.focusAreas.map((area) => (
                            <span
                              key={area}
                              className="rounded-md border border-line bg-surface-1 px-2 py-1 text-xs text-ink-300"
                            >
                              {PREP_FOCUS_LABELS[area]}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="grid gap-2 sm:grid-cols-2">
                        <DrillStepper
                          label="DSA"
                          done={plan.codingDrillsDone}
                          target={plan.codingDrillsTarget}
                          onChange={(next) =>
                            void safeUpdate({ id: plan.id as Id<"interviewPrepPlans">, codingDrillsDone: next })
                          }
                        />
                        <DrillStepper
                          label="Design"
                          done={plan.systemDesignDrillsDone}
                          target={plan.systemDesignDrillsTarget}
                          onChange={(next) =>
                            void safeUpdate({
                              id: plan.id as Id<"interviewPrepPlans">,
                              systemDesignDrillsDone: next,
                            })
                          }
                        />
                        <DrillStepper
                          label="Stories"
                          done={plan.behavioralStoriesReady}
                          target={plan.behavioralStoriesTarget}
                          onChange={(next) =>
                            void safeUpdate({
                              id: plan.id as Id<"interviewPrepPlans">,
                              behavioralStoriesReady: next,
                            })
                          }
                        />
                        <DrillStepper
                          label="Mocks"
                          done={plan.mockInterviewsDone}
                          target={plan.mockInterviewsTarget}
                          onChange={(next) =>
                            void safeUpdate({
                              id: plan.id as Id<"interviewPrepPlans">,
                              mockInterviewsDone: next,
                            })
                          }
                        />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <ToggleChip
                          active={plan.companyResearchDone}
                          label="Company research"
                          onClick={() =>
                            void safeUpdate({
                              id: plan.id as Id<"interviewPrepPlans">,
                              companyResearchDone: !plan.companyResearchDone,
                            })
                          }
                        />
                        <ToggleChip
                          active={plan.resumeDeepDiveDone}
                          label="Resume deep dive"
                          onClick={() =>
                            void safeUpdate({
                              id: plan.id as Id<"interviewPrepPlans">,
                              resumeDeepDiveDone: !plan.resumeDeepDiveDone,
                            })
                          }
                        />
                      </div>

                      {isEditingNextAction ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            autoFocus
                            value={nextActionDraft}
                            onChange={(event) => setNextActionDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void commitNextAction(plan.id)
                              if (event.key === "Escape") setEditingNextActionId(null)
                            }}
                            placeholder="What's next?"
                            className="h-8"
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Save next action"
                            onClick={() => void commitNextAction(plan.id)}
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Cancel editing next action"
                            onClick={() => setEditingNextActionId(null)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startNextActionEdit(plan.id, plan.nextAction ?? "")}
                          className="group flex items-center gap-1.5 text-left text-sm text-ink-300 transition-colors hover:text-ink-100"
                        >
                          <Pencil className="size-3 shrink-0 text-ink-500 opacity-0 transition-opacity group-hover:opacity-100" />
                          {plan.nextAction ? (
                            <span>Next: {plan.nextAction}</span>
                          ) : (
                            <span className="text-ink-500">Add a next action…</span>
                          )}
                        </button>
                      )}

                      {plan.weaknessTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {plan.weaknessTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md border border-status-warn/30 bg-status-warn/10 px-2 py-1 text-xs text-status-warn"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface-1/60 p-3">
                      <p className="micro-label">Readiness</p>
                      <ReadinessRing score={readiness} />
                    </div>
                  </div>
                </Panel>
              </StaggerItem>
            )
          })
        )}
      </Stagger>

      {editingPlan && (
        <PrepFormSheet
          applications={applications}
          targets={targets}
          plan={editingPlan}
          open={Boolean(editingPlan)}
          onOpenChange={(open) => !open && setEditingPlanId(null)}
        />
      )}
    </>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="micro-label">{label}</p>
      <p className={cn("mt-2 font-mono text-2xl font-semibold tabular", warn && value > 0 && "text-status-warn")}>
        {value}
      </p>
    </div>
  )
}

function DrillStepper({
  label,
  done,
  target,
  onChange,
}: {
  label: string
  done: number
  target: number
  onChange: (next: number) => void
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-1/60 p-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-300">{label}</span>
        <span className="font-mono tabular text-ink-500">
          {done}/{target}
        </span>
      </div>
      <ProgressBar value={target ? (done / target) * 100 : 100} className="mt-2" />
      <div className="mt-2 flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Decrease ${label} count`}
          disabled={done <= 0}
          onClick={() => onChange(Math.max(0, done - 1))}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-6 text-center font-mono text-sm tabular">{done}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Increase ${label} count`}
          onClick={() => onChange(done + 1)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

function ToggleChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-brand/40 bg-brand-weak text-brand"
          : "border-line bg-surface-1 text-ink-300 hover:border-line-strong"
      )}
    >
      <Check className={cn("size-3", !active && "opacity-0")} />
      {label}
    </button>
  )
}

function ReadinessRing({ score }: { score: number }) {
  const tone = score >= 70 ? "var(--brand)" : score >= 40 ? "var(--status-warn)" : "var(--status-down)"
  return (
    <div className="relative flex size-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-3)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 97.4} 97.4`}
          style={{ filter: `drop-shadow(0 0 4px color-mix(in oklch, ${tone} 60%, transparent))` }}
        />
      </svg>
      <span className="absolute font-mono text-sm font-semibold tabular">{score}</span>
    </div>
  )
}
