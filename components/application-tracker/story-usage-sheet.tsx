"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type {
  ApplicationInterview,
  ApplicationRecord,
  StoryBankEntryRecord,
} from "@/lib/application-model"
import { toDateKey } from "@/lib/date-model"
import { interviewHeadline } from "@/lib/interview-model"
import { Field, FormError } from "./form-kit"

const NONE = "__none__"

const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const
type Confidence = (typeof CONFIDENCE_LEVELS)[number]
const CONFIDENCE_LABELS: Record<Confidence, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

function todayDate() {
  return toDateKey(new Date())
}

function buildInitialForm() {
  return {
    applicationId: "",
    interviewId: "",
    confidence: "medium" as Confidence,
    usedAtDate: todayDate(),
    notes: "",
  }
}

type StoryUsageSheetProps = {
  story: StoryBankEntryRecord
  applications: ApplicationRecord[]
  interviews: ApplicationInterview[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StoryUsageSheet({
  story,
  applications,
  interviews,
  open,
  onOpenChange,
}: StoryUsageSheetProps) {
  const recordUsage = useMutation(api.stories.recordUsage)
  const [form, setForm] = React.useState(buildInitialForm)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")

  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(buildInitialForm())
      setError("")
    }
    onOpenChange(next)
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const availableInterviews = form.applicationId
    ? interviews.filter((interview) => interview.applicationId === form.applicationId)
    : interviews

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      await recordUsage({
        storyId: story.id as Id<"storyBankEntries">,
        applicationId: form.applicationId ? (form.applicationId as Id<"applications">) : undefined,
        interviewId: form.interviewId ? (form.interviewId as Id<"applicationInterviews">) : undefined,
        usedAtDate: form.usedAtDate || undefined,
        confidence: form.confidence,
        notes: form.notes.trim() || undefined,
      })
      toast.success("Usage logged")
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not log usage")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Log usage</SheetTitle>
          <SheetDescription>Track where “{story.title}” was told and how it landed.</SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          <Field label="Confidence">
            <Select value={form.confidence} onValueChange={(value) => update("confidence", value as Confidence)}>
              <SelectTrigger className="w-full bg-surface-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFIDENCE_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {CONFIDENCE_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Used on" hint="optional">
            <Input type="date" value={form.usedAtDate} onChange={(event) => update("usedAtDate", event.target.value)} />
          </Field>
          <Field label="Application" hint="optional">
            <Select
              value={form.applicationId || NONE}
              onValueChange={(value) => {
                update("applicationId", value === NONE ? "" : value)
                update("interviewId", "")
              }}
            >
              <SelectTrigger className="w-full bg-surface-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No application</SelectItem>
                {applications.map((application) => (
                  <SelectItem key={application.id} value={application.id}>
                    {application.companyName} · {application.roleTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Interview" hint="optional">
            <Select
              value={form.interviewId || NONE}
              onValueChange={(value) => update("interviewId", value === NONE ? "" : value)}
            >
              <SelectTrigger className="w-full bg-surface-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No interview</SelectItem>
                {availableInterviews.map((interview) => (
                  <SelectItem key={interview.id} value={interview.id}>
                    {interviewHeadline(interview)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
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
              {pending ? "Saving…" : "Log usage"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
