"use client"

import { useMutation } from "convex/react"
import {
  AlertCircleIcon,
  BookmarkPlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  RefreshCwIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { errorMessage } from "@/lib/errors"
import { DISMISS_REASONS } from "@/lib/jobs"
import { cn } from "@/lib/utils"

type Pipeline = Pick<NonNullable<Doc<"applications">["pipeline"]>, "state" | "reason"> | null | undefined

/** Shortlist or dismiss a job in the inbox; restore or shortlist a dismissed one. */
export function InboxActions({
  id,
  status,
  size = "sm",
  onShortlisted,
}: {
  id: Id<"applications">
  status: "discovered" | "dismissed"
  size?: "sm" | "xs"
  onShortlisted?: () => void
}) {
  const shortlist = useMutation(api.jobs.shortlist)
  const dismiss = useMutation(api.jobs.dismiss)
  const restore = useMutation(api.jobs.restore)
  const report = (promise: Promise<unknown>, success?: string) =>
    promise.then(() => success && toast.success(success)).catch((error) => toast.error(errorMessage(error)))

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size={size}
        onClick={() =>
          report(
            shortlist({ id }).then(() => onShortlisted?.()),
            "Shortlisted. It's on your board under Saved.",
          )
        }
      >
        <BookmarkPlusIcon />
        Shortlist
      </Button>
      {status === "discovered" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size={size} variant="outline">
              <XIcon />
              Dismiss
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Why not this one?</DropdownMenuLabel>
            {DISMISS_REASONS.map((reason) => (
              <DropdownMenuItem key={reason} onSelect={() => report(dismiss({ id, reason }))}>
                {reason}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => report(dismiss({ id }))}>No reason</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size={size} variant="outline" onClick={() => report(restore({ id }), "Back in your inbox")}>
          <RotateCcwIcon />
          Restore
        </Button>
      )}
    </div>
  )
}

/** What the automation did for a job: scoring, writing suggestions, waiting on you, or done. */
export function PipelineStatus({
  id,
  pipeline,
  score,
  threshold,
  suggestionsReady,
  className,
}: {
  id: Id<"applications">
  pipeline: Pipeline
  score: number | null
  threshold: number
  suggestionsReady: boolean
  className?: string
}) {
  const retry = useMutation(api.pipeline.retry)
  const base = cn("inline-flex items-center gap-1.5 text-xs", className)
  if (!pipeline) return null
  if (pipeline.state === "analyzing" || pipeline.state === "suggesting") {
    return (
      <span className={cn(base, "text-muted-foreground")}>
        <Loader2Icon className="size-3.5 animate-spin" />
        {pipeline.state === "analyzing" ? "Scoring against your resumes" : "Writing suggested edits"}
      </span>
    )
  }
  if (pipeline.state === "waiting") {
    return (
      <span className={cn(base, "text-amber-700 dark:text-amber-400")}>
        <ClockIcon className="size-3.5 shrink-0" />
        {pipeline.reason}
      </span>
    )
  }
  if (pipeline.state === "failed") {
    return (
      <span className={cn(base, "text-destructive")}>
        <AlertCircleIcon className="size-3.5 shrink-0" />
        <span className="min-w-0">{pipeline.reason}</span>
        <Button
          size="xs"
          variant="ghost"
          className="text-foreground"
          onClick={() => retry({ id }).catch((error) => toast.error(errorMessage(error)))}
        >
          <RefreshCwIcon />
          Retry
        </Button>
      </span>
    )
  }
  if (suggestionsReady) {
    return (
      <span className={cn(base, "text-emerald-700 dark:text-emerald-400")}>
        <CheckCircle2Icon className="size-3.5" />
        Suggested edits ready
      </span>
    )
  }
  if (score !== null && score < threshold) {
    return <span className={cn(base, "text-muted-foreground")}>Below your threshold of {threshold}</span>
  }
  return null
}
