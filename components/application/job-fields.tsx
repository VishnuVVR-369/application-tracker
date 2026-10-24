"use client"

import { useQuery } from "convex/react"
import { useId } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { SOURCE_LABELS, SOURCES, sourceFromUrl, type Source } from "@/lib/domain"

export type JobDraft = {
  company: string
  role: string
  jobUrl: string
  source: Source
  location: string
  jobDescription: string
  notes: string
}

export const EMPTY_JOB: JobDraft = {
  company: "",
  role: "",
  jobUrl: "",
  source: "linkedin",
  location: "",
  jobDescription: "",
  notes: "",
}

/** The editable job fields, shared by the Add job dialog and the application panel. */
export function JobFields({
  value,
  onChange,
  autoFocus = false,
  descriptionRows = 10,
}: {
  value: JobDraft
  onChange: (next: JobDraft) => void
  autoFocus?: boolean
  descriptionRows?: number
}) {
  const id = useId()
  const companies = useQuery(api.applications.companyNames)
  const set = <K extends keyof JobDraft>(key: K, next: JobDraft[K]) => onChange({ ...value, [key]: next })

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-url`}>Job link</Label>
        <Input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          placeholder="https://www.linkedin.com/jobs/view/…"
          autoFocus={autoFocus}
          value={value.jobUrl}
          onChange={(event) => {
            const jobUrl = event.target.value
            const detected = sourceFromUrl(jobUrl)
            onChange({ ...value, jobUrl, source: detected ?? value.source })
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-company`}>Company</Label>
          <Input
            id={`${id}-company`}
            required
            list={`${id}-companies`}
            autoComplete="off"
            value={value.company}
            onChange={(event) => set("company", event.target.value)}
          />
          <datalist id={`${id}-companies`}>
            {companies?.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-role`}>Role</Label>
          <Input
            id={`${id}-role`}
            required
            autoComplete="off"
            value={value.role}
            onChange={(event) => set("role", event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-source`}>Found on</Label>
          <Select value={value.source} onValueChange={(next) => set("source", next as Source)}>
            <SelectTrigger id={`${id}-source`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {SOURCE_LABELS[source]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-location`}>Location</Label>
          <Input
            id={`${id}-location`}
            autoComplete="off"
            placeholder="City, or Remote"
            value={value.location}
            onChange={(event) => set("location", event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-jd`}>Job description</Label>
        <Textarea
          id={`${id}-jd`}
          rows={descriptionRows}
          placeholder="Paste the full job description. The resume check compares against it."
          className="max-h-[50svh] min-h-32 field-sizing-fixed"
          value={value.jobDescription}
          onChange={(event) => set("jobDescription", event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-notes`}>Notes</Label>
        <Textarea
          id={`${id}-notes`}
          rows={3}
          placeholder="Recruiter name, salary range, anything worth remembering"
          className="field-sizing-fixed"
          value={value.notes}
          onChange={(event) => set("notes", event.target.value)}
        />
      </div>
    </div>
  )
}
