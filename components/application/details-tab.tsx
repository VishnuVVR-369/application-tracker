"use client"

import { useMutation } from "convex/react"
import { Loader2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { ApplicationDetail } from "@/components/application/application-sheet"
import { JobFields, type JobDraft } from "@/components/application/job-fields"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { errorMessage } from "@/lib/errors"

function toDraft(application: ApplicationDetail): JobDraft {
  return {
    company: application.company,
    role: application.role,
    jobUrl: application.jobUrl ?? "",
    source: application.source,
    jobDescription: application.jobDescription,
    notes: application.notes,
  }
}

function sameDraft(a: JobDraft, b: JobDraft) {
  return (Object.keys(a) as (keyof JobDraft)[]).every((key) => a[key].trim() === b[key].trim())
}

export function DetailsTab({ application }: { application: ApplicationDetail }) {
  const update = useMutation(api.applications.update)
  const saved = toDraft(application)
  const [draft, setDraft] = useState<JobDraft>(saved)
  const [saving, setSaving] = useState(false)
  const dirty = !sameDraft(draft, saved)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await update({ id: application._id, ...draft, jobUrl: draft.jobUrl || undefined })
      toast.success("Changes saved")
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="grid gap-5">
      <JobFields value={draft} onChange={setDraft} descriptionRows={14} />
      <div
        className={
          dirty
            ? "sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t bg-popover/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6"
            : "hidden"
        }
      >
        <Button type="button" variant="outline" onClick={() => setDraft(saved)} disabled={saving}>
          Discard
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2Icon className="animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  )
}
