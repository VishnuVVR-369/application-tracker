"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  FileUpIcon,
  Loader2Icon,
  RefreshCwIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { toast } from "sonner"

import type { ApplicationDetail } from "@/components/application/application-sheet"
import { SuggestedChanges } from "@/components/application/suggested-changes"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useNow } from "@/hooks/use-now"
import { formatDaysAgo } from "@/lib/domain"
import { errorMessage } from "@/lib/errors"
import { pdfProblem, uploadToConvex } from "@/lib/upload"
import { cn } from "@/lib/utils"

type Analysis = NonNullable<FunctionReturnType<typeof api.analyses.forApplication>>[number]

function scoreTone(score: number) {
  if (score >= 85)
    return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", label: "Ready to apply" }
  if (score >= 60) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", label: "Worth tailoring" }
  return { text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500", label: "Weak fit" }
}

export function ResumeTab({ application }: { application: ApplicationDetail }) {
  return (
    <div className="grid gap-8">
      <MatchSection application={application} />
      <FinalResumeSection application={application} />
    </div>
  )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function MatchSection({ application }: { application: ApplicationDetail }) {
  const resumes = useQuery(api.resumes.list)
  const analyses = useQuery(api.analyses.forApplication, { applicationId: application._id })
  const setBaseResume = useMutation(api.applications.setBaseResume)
  const run = useAction(api.analysesNode.run)
  const [running, setRunning] = useState(false)

  if (resumes === undefined || analyses === undefined) {
    return (
      <section>
        <SectionHeading title="Resume match" description="Loading…" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-40 w-full" />
      </section>
    )
  }
  if (resumes === null || analyses === null) return null

  if (resumes.length === 0) {
    return (
      <section>
        <SectionHeading
          title="Tailor your resume"
          description="Choose a base resume to get suggested edits for this job."
        />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
          <FileTextIcon className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">Upload a base resume first</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Add one or more resume PDFs, then pick the one to tailor for this job.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href="/resumes">Go to Resumes</Link>
          </Button>
        </div>
      </section>
    )
  }

  // Until a resume is picked, default to the first one so Analyze works in one click.
  const selected = resumes.find((resume) => resume._id === application.baseResumeId) ?? resumes[0]
  const analysis = analyses.find((a) => a.baseResumeId === selected._id) ?? null
  const otherScores = analyses
    .filter((a) => a.baseResumeId !== selected._id)
    .map((a) => ({ ...a, label: resumes.find((r) => r._id === a.baseResumeId)?.label }))
    .filter((a) => a.label)

  async function analyze() {
    setRunning(true)
    try {
      if (application.baseResumeId !== selected._id) {
        await setBaseResume({ id: application._id, baseResumeId: selected._id })
      }
      await run({ applicationId: application._id })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section>
      <SectionHeading
        title="Tailor your resume"
        description="Choose a base resume, then get suggested edits backed by your confirmed experience."
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selected._id}
          onValueChange={(value) =>
            setBaseResume({ id: application._id, baseResumeId: value as Id<"baseResumes"> }).catch((error) =>
              toast.error(errorMessage(error)),
            )
          }
        >
          <SelectTrigger className="min-w-56" aria-label="Base resume">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {resumes.map((resume) => (
              <SelectItem key={resume._id} value={resume._id}>
                {resume.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selected.textStatus === "extracting" && (
        <p className="mt-2 text-xs text-muted-foreground">Reading the PDF. This takes a few seconds.</p>
      )}
      {selected.textStatus === "failed" && (
        <p className="mt-2 text-xs text-destructive">
          Couldn&apos;t read text from this PDF. Re-upload it on the{" "}
          <Link href="/resumes" className="underline underline-offset-4">
            Resumes
          </Link>{" "}
          page.
        </p>
      )}
      {application.jobDescription.trim().length < 80 && (
        <p className="mt-2 text-xs text-muted-foreground">Paste the full job description in Details to analyze.</p>
      )}

      <SuggestedChanges
        key={selected._id}
        application={application}
        baseResumeId={selected._id}
        ready={selected.textStatus === "ready"}
      />

      <details className="mt-6 border-t pt-4">
        <summary className="cursor-pointer text-sm font-medium">Resume match check</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Optionally compare the base resume with the job description for a fit score and missing keywords.
        </p>
        <Button
          className="mt-3"
          onClick={analyze}
          disabled={running || selected.textStatus !== "ready" || application.jobDescription.trim().length < 80}
          variant="outline"
        >
          {running ? <Loader2Icon className="animate-spin" /> : analysis ? <RefreshCwIcon /> : <SparklesIcon />}
          {running ? "Analyzing…" : analysis ? "Re-analyze" : "Analyze"}
        </Button>
        {running && !analysis && <Skeleton className="mt-5 h-48 w-full rounded-xl" />}
        {analysis && <AnalysisResult analysis={analysis} stale={running} />}

        {otherScores.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Other resumes:</span>
            {otherScores.map((other) => (
              <button
                key={other._id}
                type="button"
                onClick={() =>
                  setBaseResume({ id: application._id, baseResumeId: other.baseResumeId }).catch((error) =>
                    toast.error(errorMessage(error)),
                  )
                }
                className="rounded-md border px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
              >
                {other.label}{" "}
                <span className={cn("font-semibold tabular-nums", scoreTone(other.score).text)}>{other.score}</span>
              </button>
            ))}
          </div>
        )}
      </details>
    </section>
  )
}

function AnalysisResult({ analysis, stale }: { analysis: Analysis; stale: boolean }) {
  const now = useNow()
  const [copied, setCopied] = useState(false)
  const tone = scoreTone(analysis.score)
  const required = analysis.missingKeywords.filter((k) => k.importance === "required")
  const preferred = analysis.missingKeywords.filter((k) => k.importance === "preferred")

  async function copyMissing() {
    await navigator.clipboard.writeText(analysis.missingKeywords.map((k) => k.keyword).join(", "))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={cn("mt-5 rounded-xl border bg-card transition-opacity", stale && "opacity-50")}>
      <div className="flex items-start gap-4 p-4">
        <div className="text-center">
          <p className={cn("text-4xl leading-none font-semibold tracking-tight tabular-nums", tone.text)}>
            {analysis.score}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">of 100</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", tone.text)}>{tone.label}</p>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{analysis.verdict}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${analysis.score}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t p-4">
        {analysis.missingKeywords.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Missing · {analysis.missingKeywords.length}
              </p>
              <Button size="xs" variant="ghost" onClick={copyMissing}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy all"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {required.map((k) => (
                <span
                  key={k.keyword}
                  className="rounded-md border border-rose-500/30 bg-rose-500/8 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300"
                  title="Required by the posting"
                >
                  {k.keyword}
                </span>
              ))}
              {preferred.map((k) => (
                <span
                  key={k.keyword}
                  className="rounded-md border px-2 py-0.5 text-xs text-foreground/80"
                  title="Nice to have"
                >
                  {k.keyword}
                </span>
              ))}
            </div>
            {required.length > 0 && preferred.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                <span className="text-rose-700 dark:text-rose-300">Red</span> = required by the posting, outlined = nice
                to have.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No missing keywords. Nice.</p>
        )}

        {analysis.matchedKeywords.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Already covered · {analysis.matchedKeywords.length}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.matchedKeywords.map((keyword) => (
                <span key={keyword} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
        Analyzed {formatDaysAgo(analysis.createdAt, now)} · {analysis.model}
      </p>
    </div>
  )
}

function FinalResumeSection({ application }: { application: ApplicationDetail }) {
  const generateUploadUrl = useMutation(api.applications.generateUploadUrl)
  const setFinalResume = useMutation(api.applications.setFinalResume)
  const removeFinalResume = useMutation(api.applications.removeFinalResume)
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const final = application.finalResume

  async function upload(file: File) {
    const problem = pdfProblem(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setUploading(true)
    try {
      const storageId = await uploadToConvex(await generateUploadUrl(), file)
      await setFinalResume({ id: application._id, storageId: storageId as Id<"_storage">, fileName: file.name })
      toast.success("Submitted resume attached")
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setUploading(false)
    }
  }

  return (
    <section>
      <SectionHeading
        title="Submitted resume"
        description="Attach the exact PDF you sent, so you can review it before a call."
      />
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) void upload(file)
        }}
      />
      {final ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileTextIcon className="size-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            {application.finalResumeUrl ? (
              <a
                href={application.finalResumeUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium underline-offset-4 hover:underline"
              >
                {final.fileName}
              </a>
            ) : (
              <p className="truncate text-sm font-medium">{final.fileName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Attached {new Date(final.uploadedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
          </div>
          <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2Icon className="animate-spin" /> : <FileUpIcon />}
            Replace
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Remove attached resume"
            onClick={() =>
              removeFinalResume({ id: application._id }).catch((error) => toast.error(errorMessage(error)))
            }
          >
            <Trash2Icon />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files[0]
            if (file) void upload(file)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-60"
        >
          {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <FileUpIcon className="size-4" />}
          {uploading ? "Uploading…" : "Drop a PDF or click to attach"}
        </button>
      )}
    </section>
  )
}
