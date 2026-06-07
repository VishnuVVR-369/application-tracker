"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { BookOpenCheck, Brain, CheckCircle2, Dumbbell } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  PREP_FOCUS_AREAS,
  PREP_FOCUS_LABELS,
  PREP_PLAN_STATUS_LABELS,
  PREP_PLAN_STATUSES,
  type PrepFocusArea,
  type PrepPlanStatus,
} from "@/lib/application-model"
import { buildPrepModel } from "@/lib/prep-model"
import { cn } from "@/lib/utils"
import { EmptyState, LoadingPanels, PageHeader, Panel, ProgressBar } from "./common"
import { Field, NativeSelect } from "./form-kit"
import { mapApplication, mapInterviewPrepPlan, mapTargetCompany } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function PrepPage() {
  const { data, isLoading } = useAppData()
  const createPlan = useMutation(api.prep.createPlan)
  const updatePlan = useMutation(api.prep.updatePlan)
  const [form, setForm] = React.useState({
    title: "",
    applicationId: "",
    targetCompanyId: "",
    status: "in_progress" as PrepPlanStatus,
    focusAreas: ["dsa", "system_design", "behavioral"] as PrepFocusArea[],
    codingDrillsTarget: "30",
    systemDesignDrillsTarget: "5",
    behavioralStoriesTarget: "6",
    mockInterviewsTarget: "2",
    weaknessTags: "",
    nextAction: "",
  })

  if (isLoading) return <LoadingPanels />
  if (!data) {
    return <EmptyState title="Prep unavailable" description="Sign in to load interview prep." />
  }

  const applications = data.applications.map(mapApplication)
  const targets = data.targetCompanies.map(mapTargetCompany)
  const prepModel = buildPrepModel(data.interviewPrepPlans.map(mapInterviewPrepPlan))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim()) return
    await createPlan({
      title: form.title.trim(),
      applicationId: form.applicationId ? (form.applicationId as Id<"applications">) : undefined,
      targetCompanyId: form.targetCompanyId ? (form.targetCompanyId as Id<"targetCompanies">) : undefined,
      status: form.status,
      focusAreas: form.focusAreas,
      codingDrillsTarget: Number(form.codingDrillsTarget) || 0,
      systemDesignDrillsTarget: Number(form.systemDesignDrillsTarget) || 0,
      behavioralStoriesTarget: Number(form.behavioralStoriesTarget) || 0,
      mockInterviewsTarget: Number(form.mockInterviewsTarget) || 0,
      weaknessTags: form.weaknessTags.split(",").map((tag) => tag.trim()).filter(Boolean),
      nextAction: form.nextAction.trim() || undefined,
    })
    setForm((value) => ({ ...value, title: "", weaknessTags: "", nextAction: "" }))
    toast.success("Prep plan created")
  }

  return (
    <>
      <PageHeader
        eyebrow="Prep"
        title="Interview prep command center"
        description="Track readiness across DSA, system design, behavioral stories, mock interviews, company research, and resume deep dives."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Plans" value={prepModel.summary.total} />
        <Stat label="Ready" value={prepModel.summary.ready} />
        <Stat label="Needs work" value={prepModel.summary.needsWork} warn />
        <Stat label="Weakness tags" value={prepModel.summary.topWeaknesses.length} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="grid gap-4">
          {prepModel.rows.length === 0 ? (
            <EmptyState
              icon={BookOpenCheck}
              title="No prep plans yet"
              description="Create one per high-priority company or active interview loop."
            />
          ) : (
            prepModel.rows.map(({ plan, readiness }) => {
              const application = applications.find((item) => item.id === plan.applicationId)
              const target = targets.find((item) => item.id === plan.targetCompanyId)
              return (
                <Panel
                  key={plan.id}
                  title={plan.title}
                  label={application?.companyName ?? target?.companyName ?? PREP_PLAN_STATUS_LABELS[plan.status]}
                  icon={Brain}
                  action={
                    <NativeSelect
                      value={plan.status}
                      onChange={(status) =>
                        void updatePlan({ id: plan.id as Id<"interviewPrepPlans">, status: status as PrepPlanStatus })
                      }
                    >
                      {PREP_PLAN_STATUSES.map((status) => (
                        <option key={status} value={status}>{PREP_PLAN_STATUS_LABELS[status]}</option>
                      ))}
                    </NativeSelect>
                  }
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_12rem]">
                    <div className="grid gap-3">
                      <div className="flex flex-wrap gap-2">
                        {plan.focusAreas.map((area) => (
                          <span key={area} className="rounded-md border border-line bg-surface-1 px-2 py-1 text-xs text-ink-300">
                            {PREP_FOCUS_LABELS[area]}
                          </span>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Drill label="DSA" done={plan.codingDrillsDone} target={plan.codingDrillsTarget} />
                        <Drill label="Design" done={plan.systemDesignDrillsDone} target={plan.systemDesignDrillsTarget} />
                        <Drill label="Stories" done={plan.behavioralStoriesReady} target={plan.behavioralStoriesTarget} />
                        <Drill label="Mocks" done={plan.mockInterviewsDone} target={plan.mockInterviewsTarget} />
                      </div>
                      {plan.nextAction && <p className="text-sm text-ink-300">Next: {plan.nextAction}</p>}
                      {plan.weaknessTags.length > 0 && (
                        <p className="text-xs text-status-warn">Weaknesses: {plan.weaknessTags.join(", ")}</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-line bg-surface-1/60 p-3">
                      <p className="micro-label">Readiness</p>
                      <p className="mt-2 font-mono text-3xl font-semibold tabular">{readiness}%</p>
                      <ProgressBar value={readiness} className="mt-3" />
                      <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-ink-500">
                        {plan.companyResearchDone && <span>Research done</span>}
                        {plan.resumeDeepDiveDone && <span>Resume done</span>}
                      </div>
                    </div>
                  </div>
                </Panel>
              )
            })
          )}
        </div>

        <Panel title="Create prep plan" icon={Dumbbell}>
          <form className="grid gap-3" onSubmit={submit}>
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Application">
              <NativeSelect value={form.applicationId} onChange={(applicationId) => setForm({ ...form, applicationId })}>
                <option value="">No application</option>
                {applications.map((application) => <option key={application.id} value={application.id}>{application.companyName} · {application.roleTitle}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Target company">
              <NativeSelect value={form.targetCompanyId} onChange={(targetCompanyId) => setForm({ ...form, targetCompanyId })}>
                <option value="">No target</option>
                {targets.map((target) => <option key={target.id} value={target.id}>{target.companyName}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Status">
              <NativeSelect value={form.status} onChange={(status) => setForm({ ...form, status: status as PrepPlanStatus })}>
                {PREP_PLAN_STATUSES.map((status) => <option key={status} value={status}>{PREP_PLAN_STATUS_LABELS[status]}</option>)}
              </NativeSelect>
            </Field>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Focus areas</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PREP_FOCUS_AREAS.map((area) => (
                  <label key={area} className="flex items-center gap-2 rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={form.focusAreas.includes(area)}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          focusAreas: event.target.checked
                            ? [...form.focusAreas, area]
                            : form.focusAreas.filter((item) => item !== area),
                        })
                      }
                    />
                    {PREP_FOCUS_LABELS[area]}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="DSA target"><Input type="number" value={form.codingDrillsTarget} onChange={(e) => setForm({ ...form, codingDrillsTarget: e.target.value })} /></Field>
              <Field label="Design target"><Input type="number" value={form.systemDesignDrillsTarget} onChange={(e) => setForm({ ...form, systemDesignDrillsTarget: e.target.value })} /></Field>
              <Field label="Story target"><Input type="number" value={form.behavioralStoriesTarget} onChange={(e) => setForm({ ...form, behavioralStoriesTarget: e.target.value })} /></Field>
              <Field label="Mock target"><Input type="number" value={form.mockInterviewsTarget} onChange={(e) => setForm({ ...form, mockInterviewsTarget: e.target.value })} /></Field>
            </div>
            <Field label="Weakness tags" hint="comma-separated"><Input value={form.weaknessTags} onChange={(e) => setForm({ ...form, weaknessTags: e.target.value })} /></Field>
            <Field label="Next action"><Textarea value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} /></Field>
            <Button type="submit"><CheckCircle2 className="size-4" /> Create plan</Button>
          </form>
        </Panel>
      </div>
    </>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="micro-label">{label}</p>
      <p className={cn("mt-2 font-mono text-2xl font-semibold tabular", warn && value > 0 && "text-status-warn")}>{value}</p>
    </div>
  )
}

function Drill({ label, done, target }: { label: string; done: number; target: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface-1/60 p-2">
      <div className="flex justify-between text-xs">
        <span className="text-ink-300">{label}</span>
        <span className="font-mono text-ink-500">{done}/{target}</span>
      </div>
      <ProgressBar value={target ? (done / target) * 100 : 100} className="mt-2" />
    </div>
  )
}
