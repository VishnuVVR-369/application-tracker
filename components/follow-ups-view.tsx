"use client"

import { useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { BellRingIcon, CheckCheckIcon, ChevronDownIcon, ExternalLinkIcon, InboxIcon } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { useNow } from "@/hooks/use-now"
import { CHANNEL_LABELS, DAY_MS, daysUntil, followUpDueAt, formatDaysAgo, REFERRAL_STATUS_LABELS } from "@/lib/domain"
import { errorMessage } from "@/lib/errors"
import { FOLLOW_UP_TEXT } from "@/lib/status-style"
import { cn } from "@/lib/utils"

type Request = NonNullable<FunctionReturnType<typeof api.referrals.awaitingReply>>[number]

export function FollowUpsView() {
  const requests = useQuery(api.referrals.awaitingReply)
  const settings = useQuery(api.settings.get)
  const now = useNow()

  if (requests === undefined || settings === undefined) return <FollowUpsSkeleton />
  if (requests === null || settings === null) return null

  const withDue = requests
    .map((request) => ({ request, dueAt: followUpDueAt(request, settings.followUpDays)! }))
    .sort((a, b) => a.dueAt - b.dueAt)
  const due = withDue.filter((row) => row.dueAt <= now)
  const upcoming = withDue.filter((row) => row.dueAt > now)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Follow-ups</h1>
      <p className="text-sm text-muted-foreground">
        Referral requests with no reply after {settings.followUpDays} day{settings.followUpDays === 1 ? "" : "s"}.
        Change the timing in{" "}
        <Link href="/settings" className="underline underline-offset-4 hover:text-foreground">
          Settings
        </Link>
        .
      </p>

      {requests.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
          <InboxIcon className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">Nobody to chase</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            When you mark a referral request as Asked, it shows up here until they reply.
          </p>
        </div>
      ) : (
        <>
          <Section title="Due now" count={due.length} icon={<BellRingIcon className={cn("size-4", FOLLOW_UP_TEXT)} />}>
            {due.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            ) : (
              due.map(({ request, dueAt }) => <Row key={request._id} request={request} dueAt={dueAt} now={now} due />)
            )}
          </Section>
          {upcoming.length > 0 && (
            <Section title="Waiting for a reply" count={upcoming.length}>
              {upcoming.map(({ request, dueAt }) => (
                <Row key={request._id} request={request} dueAt={dueAt} now={now} due={false} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string
  count: number
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
        <span className="text-muted-foreground tabular-nums">{count}</span>
      </h2>
      <ul className="grid gap-2">{children}</ul>
    </section>
  )
}

function Row({ request, dueAt, now, due }: { request: Request; dueAt: number; now: number; due: boolean }) {
  const update = useMutation(api.referrals.update)
  const markFollowedUp = useMutation(api.referrals.markFollowedUp)
  const report = (promise: Promise<unknown>) => promise.catch((error) => toast.error(errorMessage(error)))
  const overdueDays = Math.floor((now - dueAt) / DAY_MS)

  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-3.5", due && "border-amber-500/40")}>
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{request.personName}</p>
          {request.profileUrl && (
            <a
              href={request.profileUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${request.personName}'s profile`}
              className="shrink-0 rounded text-muted-foreground hover:text-foreground"
            >
              <ExternalLinkIcon className="size-3.5" />
            </a>
          )}
          {request.personTitle && (
            <span className="truncate text-xs text-muted-foreground">· {request.personTitle}</span>
          )}
        </div>
        <Link
          href={`/?app=${request.applicationId}`}
          className="mt-0.5 block truncate text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {request.role} at {request.company}
        </Link>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {[
            request.channel && `via ${CHANNEL_LABELS[request.channel]}`,
            request.askedAt !== undefined && `asked ${formatDaysAgo(request.askedAt, now)}`,
            request.followedUpAt && `followed up ${formatDaysAgo(request.followedUpAt, now)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
          {due ? (
            overdueDays > 0 && <span className={cn("font-medium", FOLLOW_UP_TEXT)}> · {overdueDays}d overdue</span>
          ) : (
            <span> · follow up in {daysUntil(dueAt, now)}d</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {due && (
          <Button size="sm" variant="outline" onClick={() => report(markFollowedUp({ id: request._id }))}>
            <CheckCheckIcon />
            Followed up
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              Mark as
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["referred", "declined", "no_reply"] as const).map((status) => (
              <DropdownMenuItem key={status} onSelect={() => report(update({ id: request._id, status }))}>
                {REFERRAL_STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

function FollowUpsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 px-4 pt-6 sm:px-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="mt-8 h-4 w-24" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  )
}
