"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { Plus } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Textarea } from "@/components/ui/textarea"
import { TASK_KIND_LABELS, TASK_KINDS } from "@/lib/application-model"
import { getWeekKey } from "@/lib/goals-model"
import { Field, FormError, NativeSelect } from "./form-kit"

type TaskFormSheetProps = {
  applications: Doc<"applications">[]
  applicationId?: string
  defaultKind?: (typeof TASK_KINDS)[number]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TaskFormSheet({
  applications,
  applicationId,
  defaultKind = "follow_up",
  trigger,
  open: controlledOpen,
  onOpenChange,
}: TaskFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const createTask = useMutation(api.tasks.create)
  const [form, setForm] = React.useState(() => ({
    applicationId: applicationId ?? "",
    title: "",
    kind: defaultKind as string,
    dueDate: getWeekKey(),
    description: "",
  }))
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
      setForm({
        applicationId: applicationId ?? "",
        title: "",
        kind: defaultKind,
        dueDate: getWeekKey(),
        description: "",
      })
      setError("")
    }
    setOpen(next)
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError("A title is required.")
      return
    }
    if (!form.dueDate) {
      setError("Pick a due date.")
      return
    }
    setPending(true)
    setError("")
    try {
      await createTask({
        applicationId: form.applicationId ? (form.applicationId as Id<"applications">) : undefined,
        title: form.title.trim(),
        kind: form.kind as never,
        dueDate: form.dueDate,
        description: form.description.trim() || undefined,
      })
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create task")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New task</SheetTitle>
          <SheetDescription>Follow-ups, deadlines, and prep — with an optional application.</SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          <Field label="Title">
            <Input value={form.title} onChange={(event) => update("title", event.target.value)} required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind">
              <NativeSelect value={form.kind} onChange={(value) => update("kind", value)}>
                {TASK_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {TASK_KIND_LABELS[kind]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Due">
              <Input type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} />
            </Field>
          </div>
          {!applicationId && (
            <Field label="Application" hint="optional">
              <NativeSelect value={form.applicationId} onChange={(value) => update("applicationId", value)}>
                <option value="">No application</option>
                {applications
                  .filter((application) => !application.archived)
                  .map((application) => (
                    <option key={application._id} value={application._id}>
                      {application.companyName} · {application.roleTitle}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
          )}
          <Field label="Details" hint="optional">
            <Textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
          </Field>

          <FormError message={error} />

          <SheetFooter className="-mx-4 -mb-4 mt-2 flex-row justify-end gap-2 border-t border-line/70 bg-surface-1/40 px-4">
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending}>
              <Plus className="size-4" />
              {pending ? "Saving…" : "Add task"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
