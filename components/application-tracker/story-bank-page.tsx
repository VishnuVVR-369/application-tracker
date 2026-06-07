"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { BookMarked, Library, Plus, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import {
  STORY_COMPETENCIES,
  STORY_COMPETENCY_LABELS,
  type StoryCompetency,
} from "@/lib/application-model"
import { buildStoryBankModel } from "@/lib/story-bank-model"
import { EmptyState, LoadingPanels, PageHeader, Panel, ProgressBar } from "./common"
import { Field } from "./form-kit"
import { mapStory, mapStoryUsage } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function StoryBankPage() {
  const { data, isLoading } = useAppData()
  const createStory = useMutation(api.stories.createStory)
  const [form, setForm] = React.useState({
    title: "",
    project: "",
    situation: "",
    task: "",
    action: "",
    result: "",
    impactMetrics: "",
    senioritySignal: "",
    technologies: "",
    competencies: ["ownership", "technical_depth"] as StoryCompetency[],
  })

  if (isLoading) return <LoadingPanels />
  if (!data) {
    return <EmptyState title="Story bank unavailable" description="Sign in to load your stories." />
  }

  const model = buildStoryBankModel({
    stories: data.storyBankEntries.map(mapStory),
    usages: data.storyUsages.map(mapStoryUsage),
  })

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim()) return
    await createStory({
      title: form.title.trim(),
      project: form.project.trim() || undefined,
      situation: form.situation.trim(),
      task: form.task.trim(),
      action: form.action.trim(),
      result: form.result.trim(),
      impactMetrics: form.impactMetrics.trim() || undefined,
      senioritySignal: form.senioritySignal.trim() || undefined,
      technologies: form.technologies.split(",").map((tech) => tech.trim()).filter(Boolean),
      competencies: form.competencies,
    })
    setForm((value) => ({
      ...value,
      title: "",
      project: "",
      situation: "",
      task: "",
      action: "",
      result: "",
      impactMetrics: "",
      senioritySignal: "",
      technologies: "",
    }))
    toast.success("Story added")
  }

  return (
    <>
      <PageHeader
        eyebrow="Stories"
        title="Story bank"
        description="Build reusable STAR stories with impact, technical depth, and competency coverage for behavioral and hiring-manager rounds."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Stories" value={model.summary.total} />
        <Stat label="Ready" value={model.summary.ready} />
        <Stat label="Unused" value={model.summary.unused} />
        <Stat label="Gaps" value={model.missingCompetencies.length} warn />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="grid gap-4">
          {model.rows.length === 0 ? (
            <EmptyState
              icon={Library}
              title="No stories yet"
              description="Add project stories that prove ownership, technical judgment, and impact."
            />
          ) : (
            model.rows.map(({ story, completeness, usages }) => (
              <Panel
                key={story.id}
                title={story.title}
                label={story.project ?? `${usages.length} usage${usages.length === 1 ? "" : "s"}`}
                icon={BookMarked}
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_12rem]">
                  <div className="grid gap-3">
                    <p className="line-clamp-2 text-sm text-ink-300">{story.action}</p>
                    <p className="line-clamp-2 text-sm text-ink-300">{story.result}</p>
                    {story.impactMetrics && (
                      <p className="rounded-lg border border-brand/20 bg-brand-weak px-3 py-2 text-sm text-brand">
                        {story.impactMetrics}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {story.competencies.map((competency) => (
                        <span key={competency} className="rounded-md border border-line bg-surface-1 px-2 py-1 text-xs text-ink-300">
                          {STORY_COMPETENCY_LABELS[competency]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-1/60 p-3">
                    <p className="micro-label">Completeness</p>
                    <p className="mt-2 font-mono text-3xl font-semibold tabular">{completeness}%</p>
                    <ProgressBar value={completeness} className="mt-3" />
                  </div>
                </div>
              </Panel>
            ))
          )}
        </div>

        <div className="grid content-start gap-4">
          <Panel title="Add STAR story" icon={Plus}>
            <form className="grid gap-3" onSubmit={submit}>
              <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Project"><Input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} /></Field>
              <Field label="Situation"><Textarea value={form.situation} onChange={(e) => setForm({ ...form, situation: e.target.value })} /></Field>
              <Field label="Task"><Textarea value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} /></Field>
              <Field label="Action"><Textarea value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} /></Field>
              <Field label="Result"><Textarea value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} /></Field>
              <Field label="Impact metrics"><Input value={form.impactMetrics} onChange={(e) => setForm({ ...form, impactMetrics: e.target.value })} /></Field>
              <Field label="Seniority signal"><Input value={form.senioritySignal} onChange={(e) => setForm({ ...form, senioritySignal: e.target.value })} /></Field>
              <Field label="Technologies" hint="comma-separated"><Input value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} /></Field>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Competencies</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STORY_COMPETENCIES.map((competency) => (
                    <label key={competency} className="flex items-center gap-2 rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={form.competencies.includes(competency)}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            competencies: event.target.checked
                              ? [...form.competencies, competency]
                              : form.competencies.filter((item) => item !== competency),
                          })
                        }
                      />
                      {STORY_COMPETENCY_LABELS[competency]}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit"><ShieldCheck className="size-4" /> Add story</Button>
            </form>
          </Panel>

          <Panel title="Competency coverage" icon={ShieldCheck}>
            <div className="grid gap-2">
              {model.competencyCoverage.map((item) => (
                <div key={item.competency} className="flex items-center justify-between rounded-lg border border-line bg-surface-1 p-2 text-sm">
                  <span>{STORY_COMPETENCY_LABELS[item.competency]}</span>
                  <span className="font-mono text-xs text-ink-500">{item.count}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="micro-label">{label}</p>
      <p className={warn && value > 0 ? "mt-2 font-mono text-2xl font-semibold tabular text-status-warn" : "mt-2 font-mono text-2xl font-semibold tabular"}>{value}</p>
    </div>
  )
}
