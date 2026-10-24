"use client"

import { useMutation } from "convex/react"
import { ExternalLinkIcon, Loader2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { ApplicationDetail } from "@/components/application/application-sheet"
import { JobFields, type JobDraft } from "@/components/application/job-fields"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { errorMessage } from "@/lib/errors"
import { WORK_MODE_LABELS } from "@/lib/jobs"

function toDraft(application: ApplicationDetail): JobDraft {
  return {
    company: application.company,
    role: application.role,
    jobUrl: application.jobUrl ?? "",
    source: application.source,
    location: application.location ?? "",
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
      await update({
        id: application._id,
        ...draft,
        jobUrl: draft.jobUrl || undefined,
        location: draft.location || undefined,
      })
      toast.success("Changes saved")
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="grid gap-5">
      <PostingFacts application={application} />
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

/** What the Job Scout read from the portals: where the job was posted, and the details the form doesn't hold. */
function PostingFacts({ application }: { application: ApplicationDetail }) {
  const facts = [
    application.workMode && WORK_MODE_LABELS[application.workMode],
    application.salaryText,
    application.postedText && `Posted ${application.postedText}`,
  ].filter(Boolean)
  if (!application.postings.length && !facts.length) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
      {application.postings.length > 0 && (
        <span className="flex flex-wrap items-center gap-x-2">
          Posted on
          {application.postings.map((posting) => (
            <a
              key={posting._id}
              href={posting.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
            >
              {posting.portalLabel}
              <ExternalLinkIcon className="size-3" />
            </a>
          ))}
        </span>
      )}
      {facts.map((fact) => (
        <span key={fact}>{fact}</span>
      ))}
    </div>
  )
}
