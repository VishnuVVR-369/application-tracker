"use client"

import { useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { AlertCircleIcon, ChevronRightIcon, ExternalLinkIcon, InboxIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { ApplicationSheet } from "@/components/application/application-sheet"
import { CompanyMark } from "@/components/company-mark"
import { InboxActions, PipelineStatus } from "@/components/inbox/inbox-actions"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { useNow } from "@/hooks/use-now"
import { usePanel } from "@/hooks/use-panel"
import { formatDaysAgo } from "@/lib/domain"
import { errorMessage } from "@/lib/errors"
import { PORTAL_LABELS, WORK_MODE_LABELS } from "@/lib/jobs"
import { scoreTone } from "@/lib/score"
import { cn } from "@/lib/utils"

type Inbox = NonNullable<FunctionReturnType<typeof api.jobs.inbox>>
type Job = Inbox["jobs"][number]
type View = "inbox" | "dismissed"

export function InboxView() {
  const [view, setView] = useState<View>("inbox")
  const data = useQuery(api.jobs.inbox, { view })
  const panel = usePanel()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Jobs the Job Scout collected from LinkedIn and Naukri, best match first.
          </p>
        </div>
        <div role="tablist" aria-label="Show" className="flex rounded-lg bg-muted p-0.5">
          {(["inbox", "dismissed"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => setView(option)}
              className={cn(
                "h-7 rounded-md px-3 text-sm text-muted-foreground transition-colors",
                view === option && "bg-background text-foreground shadow-xs",
              )}
            >
              {option === "inbox" ? "To review" : "Dismissed"}
            </button>
          ))}
        </div>
      </div>

      {data === undefined ? (
        <InboxSkeleton />
      ) : data === null ? null : view === "inbox" ? (
        <ToReview data={data} onOpen={panel.open} />
      ) : (
        <Dismissed data={data} onOpen={panel.open} />
      )}
      <ApplicationSheet id={panel.openId} onClose={panel.close} />
    </div>
  )
}

function ToReview({ data, onOpen }: { data: Inbox; onOpen: (id: Job["_id"]) => void }) {
  const score = (job: Job) => job.chosen?.score ?? job.fit?.score ?? null
  const strong = data.jobs.filter((job) => (score(job) ?? 101) >= data.fitThreshold)
  const below = data.jobs.filter((job) => (score(job) ?? 101) < data.fitThreshold)

  if (data.jobs.length === 0 && data.failed.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
        <InboxIcon className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">Nothing to review</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          The Job Scout in open-bot fills this with the jobs LinkedIn and Naukri recommend to you. Connect it with a
          token from{" "}
          <Link href="/settings" className="font-medium text-foreground underline underline-offset-4">
            Settings
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <>
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          Strong matches
          <span className="text-muted-foreground tabular-nums">{strong.length}</span>
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Score {data.fitThreshold}+ ·{" "}
            <Link href="/settings" className="underline-offset-4 hover:text-foreground hover:underline">
              change
            </Link>
          </span>
        </h2>
        {strong.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No job reaches your threshold yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {strong.map((job) => (
              <JobRow key={job._id} job={job} threshold={data.fitThreshold} onOpen={onOpen} status="discovered" />
            ))}
          </ul>
        )}
      </section>

      {below.length > 0 && (
        <details className="group mt-8">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
            Below threshold
            <span className="text-muted-foreground tabular-nums">{below.length}</span>
          </summary>
          <ul className="mt-3 grid gap-2">
            {below.map((job) => (
              <JobRow key={job._id} job={job} threshold={data.fitThreshold} onOpen={onOpen} status="discovered" />
            ))}
          </ul>
        </details>
      )}

      {data.failed.length > 0 && <FailedPostings postings={data.failed} />}
    </>
  )
}

function Dismissed({ data, onOpen }: { data: Inbox; onOpen: (id: Job["_id"]) => void }) {
  if (data.jobs.length === 0) {
    return (
      <p className="mt-10 rounded-xl border border-dashed px-6 py-14 text-center text-sm text-muted-foreground">
        Jobs you dismiss stay here, so they&apos;re never collected again.
      </p>
    )
  }
  return (
    <ul className="mt-8 grid gap-2">
      {data.jobs.map((job) => (
        <JobRow key={job._id} job={job} threshold={data.fitThreshold} onOpen={onOpen} status="dismissed" />
      ))}
    </ul>
  )
}

function JobRow({
  job,
  threshold,
  onOpen,
  status,
}: {
  job: Job
  threshold: number
  onOpen: (id: Job["_id"]) => void
  status: "discovered" | "dismissed"
}) {
  const now = useNow()
  const shown = job.chosen ?? job.fit
  const details = [job.location, job.workMode && WORK_MODE_LABELS[job.workMode], job.salaryText].filter(Boolean)

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-3.5">
      <CompanyMark name={job.company} />
      <div className="min-w-0 flex-1 basis-60">
        <button
          type="button"
          onClick={() => onOpen(job._id)}
          className="block max-w-full truncate text-left text-sm font-medium underline-offset-4 hover:underline"
        >
          {job.role}
        </button>
        <p className="truncate text-sm text-muted-foreground">
          {job.company}
          {details.length > 0 && <> · {details.join(" · ")}</>}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Found {formatDaysAgo(job.discoveredAt, now)}</span>
          {job.portals.map((posting) => (
            <a
              key={posting.url}
              href={posting.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded underline-offset-4 hover:text-foreground hover:underline"
            >
              {PORTAL_LABELS[posting.portal]}
              <ExternalLinkIcon className="size-3" />
            </a>
          ))}
          {status === "dismissed" && job.dismissReason && <span>Dismissed: {job.dismissReason}</span>}
          {status === "discovered" && (
            <PipelineStatus
              id={job._id}
              pipeline={job.pipeline}
              score={shown?.score ?? null}
              threshold={threshold}
              suggestionsReady={job.suggestions?.status === "ready"}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {shown ? (
          <div className="text-right" title={`Best fit with your ${shown.resume} resume`}>
            <p className={cn("text-xl leading-none font-semibold tracking-tight tabular-nums", scoreTone(shown.score).text)}>
              {shown.score}
            </p>
            <p className="mt-1 max-w-28 truncate text-[11px] text-muted-foreground">{shown.resume}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Not scored</span>
        )}
        <InboxActions id={job._id} status={status} />
      </div>
    </li>
  )
}

function FailedPostings({ postings }: { postings: Inbox["failed"] }) {
  const retry = useMutation(api.jobs.retryPosting)
  const remove = useMutation(api.jobs.removePosting)
  const report = (promise: Promise<unknown>) => promise.catch((error) => toast.error(errorMessage(error)))
  const failed = postings.filter((posting) => posting.status === "failed")
  const reading = postings.length - failed.length

  return (
    <section className="mt-8">
      {reading > 0 && (
        <p className="mb-3 text-xs text-muted-foreground">
          Reading {reading} new posting{reading === 1 ? "" : "s"}…
        </p>
      )}
      {failed.length > 0 && (
        <>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <AlertCircleIcon className="size-4 text-destructive" />
            Couldn&apos;t read
            <span className="text-muted-foreground tabular-nums">{failed.length}</span>
          </h2>
          <ul className="grid gap-2">
            {failed.map((posting) => (
              <li key={posting._id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3.5">
                <div className="min-w-0 flex-1 basis-60">
                  <a
                    href={posting.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 truncate text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {posting.portalLabel} posting
                    <ExternalLinkIcon className="size-3.5 shrink-0" />
                  </a>
                  <p className="mt-0.5 text-xs text-muted-foreground">{posting.error}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => report(retry({ id: posting._id }))}>
                    <RefreshCwIcon />
                    Retry
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove"
                    onClick={() => report(remove({ id: posting._id }))}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function InboxSkeleton() {
  return (
    <div className="mt-8 grid gap-2">
      <Skeleton className="h-4 w-32" />
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-[86px] w-full rounded-xl" />
      ))}
    </div>
  )
}
