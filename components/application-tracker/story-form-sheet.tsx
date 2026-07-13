"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  STORY_COMPETENCIES,
  STORY_COMPETENCY_LABELS,
  type StoryBankEntryRecord,
  type StoryCompetency,
} from "@/lib/application-model"
import { cn } from "@/lib/utils"
import { Field, FormError } from "./form-kit"

type StoryFormSheetProps = {
  story?: StoryBankEntryRecord
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function buildInitialForm(story?: StoryBankEntryRecord) {
  return {
    title: story?.title ?? "",
    project: story?.project ?? "",
    situation: story?.situation ?? "",
    task: story?.task ?? "",
    action: story?.action ?? "",
    result: story?.result ?? "",
    impactMetrics: story?.impactMetrics ?? "",
    senioritySignal: story?.senioritySignal ?? "",
    technologies: story?.technologies.join(", ") ?? "",
    competencies: (story?.competencies ?? ["ownership", "technical_depth"]) as StoryCompetency[],
    notes: story?.notes ?? "",
  }
}

export function StoryFormSheet({
  story,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: StoryFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const createStory = useMutation(api.stories.createStory)
  const updateStory = useMutation(api.stories.updateStory)
  const [form, setForm] = React.useState(() => buildInitialForm(story))
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")

  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(buildInitialForm(story))
      setError("")
    }
    setOpen(next)
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleCompetency(competency: StoryCompetency) {
    update(
      "competencies",
      form.competencies.includes(competency)
        ? form.competencies.filter((item) => item !== competency)
        : [...form.competencies, competency]
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !form.title.trim() ||
      !form.situation.trim() ||
      !form.task.trim() ||
      !form.action.trim() ||
      !form.result.trim()
    ) {
      setError("Title and all four STAR sections are required.")
      return
    }
    setPending(true)
    setError("")

    const payload = {
      title: form.title.trim(),
      project: form.project.trim() || undefined,
      situation: form.situation.trim(),
      task: form.task.trim(),
      action: form.action.trim(),
      result: form.result.trim(),
      impactMetrics: form.impactMetrics.trim() || undefined,
      senioritySignal: form.senioritySignal.trim() || undefined,
      technologies: form.technologies
        .split(",")
        .map((tech) => tech.trim())
        .filter(Boolean),
      competencies: form.competencies,
      notes: form.notes.trim() || undefined,
    }

    try {
      if (story) {
        await updateStory({
          id: story.id as Id<"storyBankEntries">,
          ...payload,
          project: payload.project ?? null,
          impactMetrics: payload.impactMetrics ?? null,
          senioritySignal: payload.senioritySignal ?? null,
          notes: payload.notes ?? null,
        })
        toast.success("Story updated")
      } else {
        await createStory(payload)
        toast.success("Story added")
      }
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save story")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{story ? "Edit story" : "Add STAR story"}</SheetTitle>
          <SheetDescription>
            Situation, task, action, result — plus impact, technologies, and competencies.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input value={form.title} onChange={(event) => update("title", event.target.value)} required />
            </Field>
            <Field label="Project" hint="optional">
              <Input value={form.project} onChange={(event) => update("project", event.target.value)} />
            </Field>
          </div>
          <Field label="Situation">
            <Textarea value={form.situation} onChange={(event) => update("situation", event.target.value)} required />
          </Field>
          <Field label="Task">
            <Textarea value={form.task} onChange={(event) => update("task", event.target.value)} required />
          </Field>
          <Field label="Action">
            <Textarea value={form.action} onChange={(event) => update("action", event.target.value)} required />
          </Field>
          <Field label="Result">
            <Textarea value={form.result} onChange={(event) => update("result", event.target.value)} required />
          </Field>
          <Field label="Impact metrics" hint="optional — numbers stand out">
            <Input
              value={form.impactMetrics}
              onChange={(event) => update("impactMetrics", event.target.value)}
              placeholder="e.g. Cut latency 40%, saved $200k/yr"
            />
          </Field>
          <Field label="Seniority signal" hint="optional">
            <Input
              value={form.senioritySignal}
              onChange={(event) => update("senioritySignal", event.target.value)}
              placeholder="e.g. Led cross-team design review"
            />
          </Field>
          <Field label="Technologies" hint="comma-separated">
            <Input value={form.technologies} onChange={(event) => update("technologies", event.target.value)} />
          </Field>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Competencies</p>
            <div className="flex flex-wrap gap-1.5">
              {STORY_COMPETENCIES.map((competency) => {
                const active = form.competencies.includes(competency)
                return (
                  <button
                    key={competency}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleCompetency(competency)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      active
                        ? "border-brand/40 bg-brand-weak text-brand"
                        : "border-line bg-surface-1 text-ink-300 hover:border-line-strong"
                    )}
                  >
                    {STORY_COMPETENCY_LABELS[competency]}
                  </button>
                )
              })}
            </div>
          </div>

          <Field label="Notes" hint="optional">
            <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>

          <FormError message={error} />

          <SheetFooter className="-mx-4 -mb-4 mt-2 flex-row justify-end gap-2 border-t border-line/70 bg-surface-1/40 px-4">
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending ? "Saving…" : story ? "Save changes" : "Add story"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
