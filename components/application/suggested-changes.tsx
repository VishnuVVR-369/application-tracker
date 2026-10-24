"use client"

import { useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { CopyIcon, Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import type { ApplicationDetail } from "@/components/application/application-sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useNow } from "@/hooks/use-now"
import { errorMessage } from "@/lib/errors"
import { JOB_TIMEOUT_MS } from "@/lib/resume-writing-limits"

type Result = NonNullable<NonNullable<FunctionReturnType<typeof api.suggestions.forResume>>["job"]>["result"]
type Suggestion = NonNullable<Result>["suggestions"][number]

export function SuggestedChanges({
  application,
  baseResumeId,
  ready,
}: {
  application: ApplicationDetail
  baseResumeId: Id<"baseResumes">
  ready: boolean
}) {
  const data = useQuery(api.suggestions.forResume, { applicationId: application._id, baseResumeId })
  const generate = useMutation(api.suggestions.generate)
  const now = useNow()
  const [starting, setStarting] = useState(false)
  if (data === undefined) return <Skeleton className="mt-5 h-32 rounded-xl" />
  if (data === null) return null

  const { job, stale, confirmedCount } = data
  const result = job?.result
  const timedOut = job?.status === "generating" && now - job.startedAt >= JOB_TIMEOUT_MS
  const running = starting || (job?.status === "generating" && !timedOut)
  const hasJobDescription = application.jobDescription.trim().length >= 80

  async function suggest() {
    setStarting(true)
    try {
      await generate({ applicationId: application._id, baseResumeId })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setStarting(false)
    }
  }

  return (
    <section className="mt-5" aria-label="Suggested resume changes" aria-busy={running}>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={suggest} disabled={running || !ready || !hasJobDescription || confirmedCount === 0}>
          {running ? (
            <Loader2Icon className="animate-spin" />
          ) : result || job?.status === "failed" || timedOut ? (
            <RefreshCwIcon />
          ) : (
            <SparklesIcon />
          )}
          {running
            ? "Generating suggestions…"
            : result
              ? "Regenerate suggestions"
              : job?.status === "failed" || timedOut
                ? "Retry suggestions"
                : "Suggest changes"}
        </Button>
        {confirmedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            Using {confirmedCount} confirmed {confirmedCount === 1 ? "accomplishment" : "accomplishments"}
          </span>
        )}
      </div>
      {confirmedCount === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          <Link href="/experience" className="font-medium text-foreground underline underline-offset-4">
            Add a review and confirm accomplishments
          </Link>{" "}
          in your Experience library first. You only need to do this once; the library is shared across applications.
        </p>
      )}
      {running && (
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          Checking the job against your resume and confirmed experience. You can close this application and return
          later.{result ? " Previous suggestions remain below until the new ones are ready." : ""}
        </p>
      )}
      {(job?.status === "failed" || timedOut) && (
        <p role="alert" className="mt-3 rounded-lg border p-3 text-sm">
          {timedOut ? "Generation is taking longer than expected. You can retry suggestions." : job?.error}
        </p>
      )}
      {stale && (
        <p role="status" className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          These saved suggestions are outdated. The job details, base PDF, or confirmed experience have changed.
          Regenerate to use the latest information.
        </p>
      )}
      {!result && !running && confirmedCount > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Get focused edits with supporting evidence. Copy the wording into Overleaf and attach your final PDF below.
        </p>
      )}
      {running && !result && <Skeleton className="mt-4 h-40 rounded-xl" />}
      {result && (
        <div className="mt-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium">Suggested changes</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground wrap-break-word">{result.summary}</p>
            </div>
            {result.suggestions.length > 0 && (
              <CopyText
                text={result.suggestions
                  .map((item) => `${KIND_LABELS[item.kind]} · ${item.section}\n${item.suggestedText}`)
                  .join("\n\n")}
                label="Copy all changes"
              />
            )}
          </div>
          <div className="mt-4 grid gap-3">
            {result.suggestions.map((suggestion, index) => (
              <SuggestionCard key={`${job?._id}-${result.generatedAt}-${index}`} suggestion={suggestion} />
            ))}
          </div>
          {result.suggestions.length === 0 && (
            <p className="mt-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No supported changes to suggest. Your base resume can stay as it is for this job.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Saved{" "}
            {new Date(result.generatedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            . Review the wording before updating your resume.
          </p>
        </div>
      )}
    </section>
  )
}

const KIND_LABELS = {
  replace: "Replace",
  add: "Add",
  shorten: "Shorten",
  remove: "Remove",
  reorder: "Reorder",
} as const

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{KIND_LABELS[suggestion.kind]}</span>
        <h4 className="min-w-0 flex-1 text-sm font-medium wrap-break-word">{suggestion.section}</h4>
      </div>
      <div className="grid gap-4 p-4">
        {suggestion.currentText && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Current</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground wrap-break-word">
              {suggestion.currentText}
            </p>
          </div>
        )}
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">
              {suggestion.kind === "remove" || suggestion.kind === "reorder" ? "Suggested action" : "Suggested wording"}
            </p>
            <CopyText text={suggestion.suggestedText} label="Copy suggestion" />
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed wrap-break-word">{suggestion.suggestedText}</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground wrap-break-word">
          <span className="font-medium text-foreground">Why this helps: </span>
          {suggestion.reason}
        </p>
        <details className="border-t pt-3 text-xs">
          <summary className="cursor-pointer font-medium">Supporting evidence</summary>
          <div className="mt-3 grid gap-4">
            {suggestion.evidence.map((item) => (
              <div key={item.accomplishmentId}>
                <p className="font-medium wrap-break-word">{item.title}</p>
                <p className="mt-1 text-muted-foreground wrap-break-word">
                  {item.reviewTitle} · {item.company} · {item.role} · {item.period}
                </p>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed wrap-break-word">{item.description}</p>
                <blockquote className="mt-2 border-l-2 pl-3 whitespace-pre-wrap leading-relaxed text-muted-foreground wrap-break-word">
                  {item.sourceQuote}
                </blockquote>
              </div>
            ))}
            {suggestion.resumeQuote && (
              <div>
                <p className="font-medium">Base resume passage</p>
                <blockquote className="mt-2 border-l-2 pl-3 whitespace-pre-wrap leading-relaxed text-muted-foreground wrap-break-word">
                  {suggestion.resumeQuote}
                </blockquote>
              </div>
            )}
          </div>
        </details>
      </div>
    </article>
  )
}

function CopyText({ text, label }: { text: string; label: string }) {
  const [copying, setCopying] = useState(false)
  async function copy() {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.")
    } finally {
      setCopying(false)
    }
  }
  return (
    <Button type="button" size="xs" variant="ghost" onClick={copy} disabled={copying}>
      <CopyIcon />
      {label}
    </Button>
  )
}
