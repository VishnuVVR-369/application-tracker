"use client"

import { useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import {
  BellRingIcon,
  ExternalLinkIcon,
  HistoryIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { useNow } from "@/hooks/use-now"
import {
  CHANNEL_LABELS,
  CHANNELS,
  daysUntil,
  followUpDueAt,
  formatDaysAgo,
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUSES,
  type Channel,
  type ReferralStatus,
} from "@/lib/domain"
import { errorMessage } from "@/lib/errors"
import { FOLLOW_UP_TEXT, REFERRAL_BADGE } from "@/lib/status-style"
import { cn } from "@/lib/utils"

type ReferralData = NonNullable<FunctionReturnType<typeof api.referrals.forApplication>>
type RequestRow = ReferralData["requests"][number]
type HistoryEntry = RequestRow["history"][number]

const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })

function report(promise: Promise<unknown>) {
  promise.catch((error) => toast.error(errorMessage(error)))
}

export function ReferralsTab({
  applicationId,
  company,
  closed,
  data,
}: {
  applicationId: Id<"applications">
  company: string
  /** Closed applications keep their referral history but stop nagging for follow-ups. */
  closed: boolean
  data: ReferralData | null | undefined
}) {
  const settings = useQuery(api.settings.get)
  const now = useNow()
  const [adding, setAdding] = useState(false)

  if (data === undefined || settings === undefined) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }
  if (data === null || settings === null) return null

  const { requests, candidates } = data
  const counts = {
    referred: requests.filter((r) => r.status === "referred").length,
    waiting: requests.filter((r) => r.status === "to_ask" || r.status === "asked").length,
  }
  // With nobody on the list yet but people already known at this company, offer them straight away.
  const suggestKnown = requests.length === 0 && candidates.length > 0
  const showAdd = adding || suggestKnown

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <p className="mr-auto text-sm text-muted-foreground">
          {requests.length === 0
            ? `Ask people at ${company} to refer you.`
            : [
                counts.referred > 0 && `${counts.referred} referred`,
                counts.waiting > 0 && `${counts.waiting} waiting`,
                counts.referred === 0 && counts.waiting === 0 && `${requests.length} asked`,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          className={cn(showAdd && "invisible")}
          aria-hidden={showAdd}
          tabIndex={showAdd ? -1 : undefined}
        >
          <UserPlusIcon />
          Add person
        </Button>
      </div>

      {showAdd && (
        <AddReferral
          applicationId={applicationId}
          company={company}
          candidates={candidates}
          onDone={() => setAdding(false)}
          onCancel={suggestKnown ? undefined : () => setAdding(false)}
        />
      )}

      {requests.length === 0 && !showAdd ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors hover:border-foreground/30"
        >
          <UserPlusIcon className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">No referrals yet</span>
          <span className="max-w-xs text-xs text-muted-foreground">
            List the people you plan to message. Each one is saved under {company}, so you can ask them again for
            other roles.
          </span>
        </button>
      ) : requests.length === 0 ? null : (
        <ul className="grid gap-2.5">
          {requests.map((request) => (
            <RequestCard
              key={request._id}
              request={request}
              followUpDays={settings.followUpDays}
              now={now}
              tracksFollowUps={!closed}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function RequestCard({
  request,
  followUpDays,
  now,
  tracksFollowUps,
}: {
  request: RequestRow
  followUpDays: number
  now: number
  tracksFollowUps: boolean
}) {
  const update = useMutation(api.referrals.update)
  const markFollowedUp = useMutation(api.referrals.markFollowedUp)
  const remove = useMutation(api.referrals.remove)
  const [editingPerson, setEditingPerson] = useState(false)
  const { person } = request
  const dueAt = tracksFollowUps ? followUpDueAt(request, followUpDays) : null
  const due = dueAt !== null && now >= dueAt

  return (
    <li className={cn("rounded-xl border bg-card p-3.5", due && "border-amber-500/40")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{person.name}</p>
            {person.profileUrl && (
              <a
                href={person.profileUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${person.name}'s profile`}
                className="shrink-0 rounded text-muted-foreground hover:text-foreground"
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </div>
          {person.title && <p className="truncate text-xs text-muted-foreground">{person.title}</p>}
        </div>
        <Select
          value={request.status}
          onValueChange={(status) => report(update({ id: request._id, status: status as ReferralStatus }))}
        >
          <SelectTrigger
            size="sm"
            aria-label="Referral status"
            className={cn("border-transparent font-medium", REFERRAL_BADGE[request.status])}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {REFERRAL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {REFERRAL_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${person.name}`}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditingPerson(true)}>
              <PencilIcon />
              Edit contact
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => report(remove({ id: request._id }))}>
              <XIcon />
              Remove from this application
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <Select
          value={request.channel ?? ""}
          onValueChange={(channel) => report(update({ id: request._id, channel: channel as Channel }))}
        >
          <SelectTrigger size="sm" aria-label="Channel" className="h-6 gap-1 px-2 text-xs">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((channel) => (
              <SelectItem key={channel} value={channel}>
                {CHANNEL_LABELS[channel]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RequestTiming request={request} now={now} />
        {dueAt !== null &&
          (due ? (
            <span className={cn("flex items-center gap-2 font-medium", FOLLOW_UP_TEXT)}>
              <span className="flex items-center gap-1">
                <BellRingIcon className="size-3.5" />
                Follow-up due
              </span>
              <Button size="xs" variant="outline" onClick={() => report(markFollowedUp({ id: request._id }))}>
                Mark followed up
              </Button>
            </span>
          ) : (
            <span>Follow up in {daysUntil(dueAt, now)}d</span>
          ))}
      </div>

      <NotesField key={request.notes ?? ""} request={request} />

      {request.history.length > 0 && <History entries={request.history} />}

      <EditPersonDialog person={person} open={editingPerson} onOpenChange={setEditingPerson} />
    </li>
  )
}

function RequestTiming({ request, now }: { request: RequestRow; now: number }) {
  if (request.askedAt === undefined) return <span>Not asked yet</span>
  const parts = [`Asked ${formatDaysAgo(request.askedAt, now)}`]
  if (request.followedUpAt) parts.push(`followed up ${formatDaysAgo(request.followedUpAt, now)}`)
  if (request.respondedAt && request.status !== "asked") {
    parts.push(`${REFERRAL_STATUS_LABELS[request.status].toLowerCase()} ${formatDaysAgo(request.respondedAt, now)}`)
  }
  return <span title={new Date(request.askedAt).toLocaleString()}>{parts.join(" · ")}</span>
}

function NotesField({ request }: { request: RequestRow }) {
  const update = useMutation(api.referrals.update)
  const [value, setValue] = useState(request.notes ?? "")
  const [open, setOpen] = useState(Boolean(request.notes))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Add note
      </button>
    )
  }

  return (
    <Textarea
      rows={2}
      autoFocus={!request.notes}
      value={value}
      placeholder="What you sent, what they said…"
      aria-label={`Notes about ${request.person.name}`}
      className="mt-2.5 min-h-0 resize-none text-xs field-sizing-content md:text-xs"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        if (value.trim() === (request.notes ?? "")) {
          if (!value.trim()) setOpen(false)
          return
        }
        report(update({ id: request._id, notes: value }))
      }}
    />
  )
}

function History({ entries }: { entries: HistoryEntry[] }) {
  return (
    <div className="mt-3 flex gap-2 border-t pt-2.5 text-xs text-muted-foreground">
      <HistoryIcon className="mt-0.5 size-3.5 shrink-0" />
      <ul className="grid gap-0.5">
        {entries.slice(0, 3).map((entry) => (
          <li key={entry.requestId}>
            <span className="font-medium text-foreground/80">{REFERRAL_STATUS_LABELS[entry.status]}</span> for{" "}
            {entry.role}
            {entry.askedAt !== undefined && ` · ${shortDate.format(entry.askedAt)}`}
          </li>
        ))}
        {entries.length > 3 && <li>and {entries.length - 3} more</li>}
      </ul>
    </div>
  )
}

function AddReferral({
  applicationId,
  company,
  candidates,
  onDone,
  onCancel,
}: {
  applicationId: Id<"applications">
  company: string
  candidates: ReferralData["candidates"]
  onDone: () => void
  /** Omitted when the panel is the tab's only content, so there's nothing to cancel back to. */
  onCancel?: () => void
}) {
  const add = useMutation(api.referrals.add)
  const [mode, setMode] = useState<"pick" | "new">(candidates.length > 0 ? "pick" : "new")
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [profileUrl, setProfileUrl] = useState("")
  const [status, setStatus] = useState<"to_ask" | "asked">("to_ask")
  const [channel, setChannel] = useState<Channel>("linkedin")
  const [saving, setSaving] = useState(false)

  async function submit(personId?: Id<"people">) {
    setSaving(true)
    try {
      await add({
        applicationId,
        personId,
        newPerson: personId ? undefined : { name, title, profileUrl },
        status,
        channel: status === "asked" ? channel : undefined,
      })
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const statusPicker = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Add as</span>
      <Select value={status} onValueChange={(next) => setStatus(next as "to_ask" | "asked")}>
        <SelectTrigger size="sm" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="to_ask">To ask</SelectItem>
          <SelectItem value="asked">Already asked</SelectItem>
        </SelectContent>
      </Select>
      {status === "asked" && (
        <Select value={channel} onValueChange={(next) => setChannel(next as Channel)}>
          <SelectTrigger size="sm" aria-label="Channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((value) => (
              <SelectItem key={value} value={value}>
                via {CHANNEL_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )

  return (
    <div className="grid gap-4 rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {mode === "pick" ? `People you know at ${company}` : `Add someone at ${company}`}
        </p>
        {onCancel && (
          <Button variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Cancel">
            <XIcon />
          </Button>
        )}
      </div>
      {statusPicker}

      {mode === "pick" ? (
        <>
          <ul className="grid gap-1.5">
            {candidates.map((person) => (
              <li key={person._id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[
                      person.title,
                      person.history[0] &&
                        `${REFERRAL_STATUS_LABELS[person.history[0].status]} for ${person.history[0].role}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No previous requests"}
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={saving} onClick={() => submit(person._id)}>
                  <PlusIcon />
                  Add
                </Button>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => setMode("new")}>
            <UserPlusIcon />
            Someone new
          </Button>
        </>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ref-name">Name</Label>
              <Input id="ref-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ref-title">Their role</Label>
              <Input
                id="ref-title"
                placeholder="Senior Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ref-url">Profile link</Label>
            <Input
              id="ref-url"
              type="url"
              placeholder="https://www.linkedin.com/in/…"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex gap-2">
              {candidates.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setMode("pick")}>
                  Pick existing
                </Button>
              )}
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2Icon className="animate-spin" />}
                Add person
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

function EditPersonDialog({
  person,
  open,
  onOpenChange,
}: {
  person: Doc<"people">
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updatePerson = useMutation(api.referrals.updatePerson)
  const [name, setName] = useState(person.name)
  const [title, setTitle] = useState(person.title ?? "")
  const [profileUrl, setProfileUrl] = useState(person.profileUrl ?? "")

  async function save(event: React.FormEvent) {
    event.preventDefault()
    try {
      await updatePerson({ id: person._id, name, title, profileUrl })
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
            <DialogDescription>Changes apply everywhere this person appears.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-title">Their role</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-url">Profile link</Label>
            <Input id="edit-url" type="url" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

