"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import { Archive, Download, FileUp, Star } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatFileSize, validateResumeFile } from "@/lib/resume-model"
import { EmptyState, LoadingPanels, PageHeader, Panel } from "./common"
import { useAppData } from "./use-app-data"

export function DocumentsPage() {
  const { data, isLoading } = useAppData()
  const generateUploadUrl = useMutation(api.resumes.generateUploadUrl)
  const createResume = useMutation(api.resumes.create)
  const updateResume = useMutation(api.resumes.update)
  const setDefaultResume = useMutation(api.resumes.setDefault)
  const [label, setLabel] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const [isDefault, setIsDefault] = React.useState(false)
  const [error, setError] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [filter, setFilter] = React.useState<"all" | "default" | "archived">("all")

  if (isLoading) {
    return <LoadingPanels />
  }

  if (!data) {
    return <EmptyState title="Documents unavailable" description="Sign in to load resumes from Convex storage." />
  }

  const resumes = data.resumes.filter((resume) => {
    if (filter === "default") return resume.isDefault
    if (filter === "archived") return resume.archived
    return true
  })

  async function uploadResume(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) return

    const validation = validateResumeFile(file)
    if (!validation.ok) {
      setError(validation.message)
      return
    }

    setPending(true)
    setError("")
    try {
      const uploadUrl = await generateUploadUrl()
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!result.ok) {
        throw new Error("Upload failed")
      }
      const { storageId } = (await result.json()) as { storageId: string }
      await createResume({
        label: label || file.name.replace(/\.pdf$/i, ""),
        fileName: file.name,
        storageId: storageId as Id<"_storage">,
        mimeType: file.type,
        sizeBytes: file.size,
        notes: notes || undefined,
        isDefault,
      })
      setLabel("")
      setNotes("")
      setFile(null)
      setIsDefault(false)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Resume library"
        description="PDF resumes are stored in Convex storage and linked one-to-one with applications."
      />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel title="Upload PDF" label="10 MB max">
          <form onSubmit={uploadResume} className="grid gap-3">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Resume label" />
            <Input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
              Mark as default
            </label>
            {error && <p className="text-sm text-status-down">{error}</p>}
            <Button type="submit" disabled={!file || pending}>
              <FileUp className="size-4" />
              {pending ? "Uploading" : "Upload PDF"}
            </Button>
          </form>
        </Panel>

        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "default", "archived"] as const).map((item) => (
              <Button
                key={item}
                variant={filter === item ? "default" : "secondary"}
                onClick={() => setFilter(item)}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </Button>
            ))}
          </div>

          {resumes.length === 0 ? (
            <EmptyState
              title="No resumes yet"
              description="Upload a PDF resume to use it as the default for new applications."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {resumes.map((resume) => {
                const usage = data.resumeUsage[resume._id]
                return (
                  <article key={resume._id} className="rounded-lg border border-line bg-surface-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold">{resume.label}</h2>
                          {resume.isDefault && <Star className="size-4 fill-brand text-brand" />}
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {formatFileSize(resume.sizeBytes)} · updated {new Date(resume.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {resume.archived && (
                        <span className="rounded-md border border-line px-2 py-0.5 text-xs text-ink-500">
                          Archived
                        </span>
                      )}
                    </div>
                    {resume.notes && <p className="mt-3 text-sm text-ink-300">{resume.notes}</p>}
                    <p className="mt-3 text-sm text-ink-300">
                      Used in {usage?.count ?? 0} applications
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {usage?.url && (
                        <Button asChild variant="secondary" size="sm">
                          <a href={usage.url} target="_blank" rel="noreferrer">
                            <Download className="size-4" />
                            View
                          </a>
                        </Button>
                      )}
                      {!resume.isDefault && !resume.archived && (
                        <Button variant="secondary" size="sm" onClick={() => void setDefaultResume({ id: resume._id })}>
                          Default
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          void updateResume({
                            id: resume._id,
                            archived: !resume.archived,
                          })
                        }
                      >
                        <Archive className="size-4" />
                        {resume.archived ? "Restore" : "Archive"}
                      </Button>
                    </div>
                    {!!usage?.applicationIds.length && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {usage.applicationIds.map((applicationId) => (
                          <Button key={applicationId} asChild variant="ghost" size="sm">
                            <Link href={`/app/applications/${applicationId}`}>Application</Link>
                          </Button>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

