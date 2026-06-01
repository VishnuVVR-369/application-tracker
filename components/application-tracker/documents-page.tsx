"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import { Archive, Download, FileText, FileUp, Link2, Star, Undo2, Upload } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatFileSize, validateResumeFile } from "@/lib/resume-model"
import { cn } from "@/lib/utils"
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
        <Panel title="Upload PDF" label="10 MB max" icon={Upload} className="self-start">
          <form onSubmit={uploadResume} className="grid gap-3">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Resume label" />

            <label
              className={cn(
                "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong/60 bg-surface-1/40 px-4 py-6 text-center transition-colors hover:border-brand/50 hover:bg-brand-weak/40",
                file && "border-brand/50 bg-brand-weak/40"
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-xl border border-brand/30 bg-brand-weak text-brand shadow-glow">
                <FileUp className="size-5" />
              </span>
              {file ? (
                <span className="text-sm font-medium text-ink-100">{file.name}</span>
              ) : (
                <>
                  <span className="text-sm font-medium">Drop a PDF or click to browse</span>
                  <span className="font-mono text-[11px] text-ink-500">PDF only · up to 10 MB</span>
                </>
              )}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => {
                  setError("")
                  setFile(event.target.files?.[0] ?? null)
                }}
              />
            </label>

            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes (when to use this resume)" />
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                isDefault ? "border-brand/40 bg-brand-weak text-brand" : "border-line bg-surface-1 text-ink-300"
              )}
            >
              <input type="checkbox" className="accent-brand" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
              <Star className={cn("size-3.5", isDefault && "fill-current")} />
              Mark as default
            </label>
            {error && (
              <p className="rounded-md border border-status-down/30 bg-status-down/10 px-3 py-2 text-sm text-status-down">
                {error}
              </p>
            )}
            <Button type="submit" disabled={!file || pending}>
              <FileUp className="size-4" />
              {pending ? "Uploading…" : "Upload PDF"}
            </Button>
          </form>
        </Panel>

        <div className="grid gap-4">
          <div className="inline-flex w-fit rounded-lg border border-line bg-surface-1/70 p-1">
            {(["all", "default", "archived"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  filter === item
                    ? "bg-linear-to-b from-brand-hover to-brand text-primary-foreground shadow-glow"
                    : "text-ink-300 hover:text-ink-100"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          {resumes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No resumes yet"
              description="Upload a PDF resume to use it as the default for new applications."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {resumes.map((resume) => {
                const usage = data.resumeUsage[resume._id]
                return (
                  <article
                    key={resume._id}
                    className={cn(
                      "glow-hover group flex flex-col rounded-xl border bg-surface-2/70 p-4 transition-colors",
                      resume.isDefault ? "border-brand/40" : "border-line",
                      resume.archived && "opacity-70"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                          resume.isDefault
                            ? "border-brand/30 bg-brand-weak text-brand shadow-glow"
                            : "border-line bg-surface-3/70 text-ink-300"
                        )}
                      >
                        <FileText className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-sm font-semibold tracking-tight">{resume.label}</h2>
                          {resume.isDefault && (
                            <Star className="size-3.5 shrink-0 fill-brand text-brand" />
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-xs tabular text-ink-500">
                          {formatFileSize(resume.sizeBytes)} · {new Date(resume.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {resume.archived && <Badge variant="outline">Archived</Badge>}
                    </div>

                    {resume.notes && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-300">“{resume.notes}”</p>
                    )}

                    <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md border border-line bg-surface-1/60 px-2 py-1 text-xs text-ink-300">
                      <Link2 className="size-3" />
                      Used in <span className="font-mono tabular text-ink-100">{usage?.count ?? 0}</span> applications
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
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
                          <Star className="size-3.5" />
                          Default
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void updateResume({ id: resume._id, archived: !resume.archived })}
                      >
                        {resume.archived ? <Undo2 className="size-3.5" /> : <Archive className="size-3.5" />}
                        {resume.archived ? "Restore" : "Archive"}
                      </Button>
                    </div>

                    {!!usage?.applicationIds.length && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line/70 pt-3">
                        {usage.applicationIds.map((applicationId) => (
                          <Button key={applicationId} asChild variant="ghost" size="xs">
                            <Link href={`/app/applications/${applicationId}`}>Application →</Link>
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
