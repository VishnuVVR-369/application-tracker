"use client"

import { useMutation } from "convex/react"
import { Loader2Icon, SendIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { EMPTY_JOB, JobFields, type JobDraft } from "@/components/application/job-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { errorMessage } from "@/lib/errors"

export function AddJobDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: Id<"applications">, job: { company: string; applied: boolean }) => void
}) {
  const create = useMutation(api.applications.create)
  const [draft, setDraft] = useState<JobDraft>(EMPTY_JOB)
  const [saving, setSaving] = useState<"saved" | "applied" | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // The submitter tells us which button was used, so Enter in a field defaults to the primary action.
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const applied = submitter?.value !== "saved"
    setSaving(applied ? "applied" : "saved")
    try {
      const id = await create({
        ...draft,
        jobUrl: draft.jobUrl || undefined,
        location: draft.location || undefined,
        applied,
      })
      const company = draft.company.trim()
      setDraft(EMPTY_JOB)
      onOpenChange(false)
      onCreated(id, { company, applied })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add job</DialogTitle>
            <DialogDescription>Log a job you applied to, or save one to apply to later.</DialogDescription>
          </DialogHeader>
          <JobFields value={draft} onChange={setDraft} autoFocus descriptionRows={8} />
          <DialogFooter>
            <Button type="submit" value="saved" variant="outline" disabled={saving !== null}>
              {saving === "saved" && <Loader2Icon className="animate-spin" />}
              Save for later
            </Button>
            <Button type="submit" value="applied" disabled={saving !== null}>
              {saving === "applied" ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              Save as applied
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
