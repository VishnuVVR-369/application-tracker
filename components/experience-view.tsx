"use client"

import { useMutation, useQuery } from "convex/react"
import {
  BookOpenIcon,
  CheckIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { useNow } from "@/hooks/use-now"
import { errorMessage } from "@/lib/errors"
import { JOB_TIMEOUT_MS, MAX_REVIEW_LENGTH } from "@/lib/resume-writing-limits"
import { cn } from "@/lib/utils"

type Accomplishment = Doc<"accomplishments">
type Review = Doc<"reviews">
type Status = Accomplishment["status"]

export function ExperienceView() {
  const data = useQuery(api.experience.list)
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<Id<"reviews"> | null>(null)
  const selected = data?.reviews.find((review) => review._id === selectedId) ?? data?.reviews[0]
  const confirmedCount = data?.accomplishments.filter((item) => item.status === "confirmed").length ?? 0

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto max-w-xl">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Experience library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn your reviews into confirmed accomplishments. Reuse them for every application.
          </p>
          {confirmedCount > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckIcon className="size-3.5" />
              {confirmedCount} confirmed {confirmedCount === 1 ? "accomplishment" : "accomplishments"} available for
              resume suggestions
            </p>
          )}
        </div>
        <Button onClick={() => setAdding(true)}>
          <PlusIcon />
          Add review
        </Button>
      </div>

      {data === undefined ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-[220px_1fr]">
          <Skeleton className="h-40" />
          <Skeleton className="h-80" />
        </div>
      ) : data === null ? null : data.reviews.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed px-6 py-14 text-center">
          <BookOpenIcon className="mx-auto size-6 text-muted-foreground" />
          <h2 className="mt-3 text-sm font-medium">Your experience goes beyond your resume</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Paste a quarterly or year-end review. Check the extracted accomplishments once, then use them to tailor any
            application.
          </p>
          <Button variant="outline" className="mt-5" onClick={() => setAdding(true)}>
            Paste your first review
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Performance reviews" className="grid gap-1 md:sticky md:top-20">
            <h2 className="mb-2 px-3 text-xs font-medium text-muted-foreground">Reviews</h2>
            {data.reviews.map((review) => {
              const pending = data.accomplishments.filter(
                (item) => item.reviewId === review._id && item.status === "draft",
              ).length
              return (
                <button
                  key={review._id}
                  type="button"
                  onClick={() => setSelectedId(review._id)}
                  aria-current={review._id === selected?._id ? "true" : undefined}
                  className={cn(
                    "min-w-0 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted",
                    review._id === selected?._id && "bg-muted",
                  )}
                >
                  <span className="block truncate text-sm font-medium">{review.title}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {review.company} · {review.period}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {review.status === "extracting"
                      ? "Extracting accomplishments…"
                      : review.status === "failed"
                        ? "Extraction needs attention"
                        : pending
                          ? `${pending} to confirm`
                          : "Reviewed"}
                  </span>
                </button>
              )
            })}
          </nav>
          {selected && (
            <ReviewDetail
              key={selected._id}
              review={selected}
              accomplishments={data.accomplishments.filter((item) => item.reviewId === selected._id)}
            />
          )}
        </div>
      )}
      {adding && (
        <AddReviewDialog
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setSelectedId(id)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

function AddReviewDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (id: Id<"reviews">) => void }) {
  const add = useMutation(api.experience.addReview)
  const [saving, setSaving] = useState(false)
  const [text, setText] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setSaving(true)
    try {
      const id = await add({
        title: String(fields.get("title")),
        company: String(fields.get("company")),
        role: String(fields.get("role")),
        period: String(fields.get("period")),
        text,
      })
      toast.success("Review added. Extracting accomplishments…")
      onAdded(id)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a performance review</DialogTitle>
          <DialogDescription>
            Paste your review once. You’ll confirm accomplishments before they can inform any resume suggestions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="review-title">Review title</Label>
            <Input
              id="review-title"
              name="title"
              placeholder="Q3 performance review"
              required
              maxLength={200}
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="review-company">Company</Label>
              <Input id="review-company" name="company" required maxLength={200} disabled={saving} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="review-role">Your role</Label>
              <Input id="review-role" name="role" required maxLength={200} disabled={saving} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="review-period">Review period</Label>
            <Input
              id="review-period"
              name="period"
              placeholder="July–September 2026"
              required
              maxLength={200}
              disabled={saving}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="review-text">Review text</Label>
            <Textarea
              id="review-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste your self-assessment, manager feedback, or project outcomes…"
              className="min-h-48 max-h-80 field-sizing-fixed"
              required
              maxLength={MAX_REVIEW_LENGTH}
              disabled={saving}
            />
            <p className="text-right text-xs text-muted-foreground">
              {text.length.toLocaleString()} / {MAX_REVIEW_LENGTH.toLocaleString()} characters
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !text.trim()}>
              {saving && <Loader2Icon className="animate-spin" />}Add review & extract
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ReviewDetail({ review, accomplishments }: { review: Review; accomplishments: Accomplishment[] }) {
  const retry = useMutation(api.experience.retryExtraction)
  const remove = useMutation(api.experience.removeReview)
  const now = useNow()
  const [filter, setFilter] = useState<Status>("draft")
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const timedOut = review.status === "extracting" && now - review.startedAt >= JOB_TIMEOUT_MS
  const visible = accomplishments.filter((item) => item.status === filter)

  async function retryExtraction() {
    setBusy(true)
    try {
      await retry({ reviewId: review._id })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="min-w-0" aria-label={review.title}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold tracking-tight wrap-break-word">{review.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground wrap-break-word">
            {review.role} at {review.company}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{review.period}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${review.title}`} onClick={() => setDeleting(true)}>
          <Trash2Icon />
        </Button>
      </div>
      <details className="mt-4 rounded-lg border bg-card p-3">
        <summary className="cursor-pointer text-sm font-medium">Original review</summary>
        <p className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground wrap-break-word">
          {review.text}
        </p>
      </details>

      {review.status === "extracting" && !timedOut && (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Extracting accomplishments. You can leave this page and return later.
        </p>
      )}
      {(review.status === "failed" || timedOut) && (
        <div role="alert" className="mt-6 rounded-lg border p-4">
          <p className="text-sm">
            {timedOut ? "Extraction is taking longer than expected. You can retry it." : review.error}
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={retryExtraction} disabled={busy}>
            <RefreshCwIcon />
            Retry extraction
          </Button>
        </div>
      )}

      {review.status === "ready" && (
        <>
          <Tabs value={filter} onValueChange={(value) => setFilter(value as Status)} className="mt-6">
            <TabsList variant="line" className="max-w-full flex-wrap justify-start gap-3">
              {(["draft", "confirmed", "dismissed"] as const).map((status) => (
                <TabsTrigger key={status} value={status} className="px-0">
                  {status === "draft" ? "To confirm" : status === "confirmed" ? "Confirmed" : "Dismissed"}
                  <span className="text-muted-foreground tabular-nums">
                    {accomplishments.filter((item) => item.status === status).length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {visible.length ? (
            <div className="mt-4 grid gap-3">
              {visible.map((item) => (
                <AccomplishmentCard key={item._id} accomplishment={item} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-muted-foreground">
              {accomplishments.length === 0
                ? "No concrete accomplishments were found in this review. Add another review with specific contributions or project outcomes."
                : filter === "draft"
                  ? "All accomplishments have been reviewed. Confirmed ones are available across your applications."
                  : `No ${filter} accomplishments in this review.`}
            </p>
          )}
        </>
      )}

      <AlertDialog
        open={deleting}
        onOpenChange={(open) => {
          if (!busy) setDeleting(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              The review and its accomplishments will be removed from your library. Saved application suggestions retain
              their evidence snapshots and will be marked outdated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={async (event) => {
                event.preventDefault()
                setBusy(true)
                try {
                  await remove({ reviewId: review._id })
                  toast.success("Review deleted")
                } catch (error) {
                  toast.error(errorMessage(error))
                } finally {
                  setBusy(false)
                  setDeleting(false)
                }
              }}
            >
              Delete review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function AccomplishmentCard({ accomplishment }: { accomplishment: Accomplishment }) {
  const changeStatus = useMutation(api.experience.setAccomplishmentStatus)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  async function setStatus(status: Status) {
    setBusy(true)
    try {
      await changeStatus({ id: accomplishment._id, status })
      toast.success(
        status === "confirmed"
          ? "Accomplishment confirmed"
          : status === "dismissed"
            ? "Accomplishment dismissed"
            : "Moved back to review",
      )
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-medium wrap-break-word">{accomplishment.title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground wrap-break-word">
        {accomplishment.description}
      </p>
      {accomplishment.skills.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground wrap-break-word">{accomplishment.skills.join(" · ")}</p>
      )}
      {accomplishment.clarification && (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm wrap-break-word">
          <span className="font-medium">Clarify before confirming: </span>
          {accomplishment.clarification}
        </p>
      )}
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground">Supporting review passage</summary>
        <blockquote className="mt-2 border-l-2 pl-3 whitespace-pre-wrap leading-relaxed text-muted-foreground wrap-break-word">
          {accomplishment.sourceQuote}
        </blockquote>
      </details>
      <div className="mt-4 flex flex-wrap gap-2">
        {accomplishment.status === "draft" && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => (accomplishment.clarification ? setEditing(true) : void setStatus("confirmed"))}
          >
            <CheckIcon />
            {accomplishment.clarification ? "Clarify & confirm" : "Confirm"}
          </Button>
        )}
        {accomplishment.status !== "dismissed" && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={busy}>
            <PencilIcon />
            Edit
          </Button>
        )}
        {accomplishment.status === "draft" && (
          <Button variant="ghost" size="sm" onClick={() => void setStatus("dismissed")} disabled={busy}>
            <XIcon />
            Dismiss
          </Button>
        )}
        {accomplishment.status !== "draft" && (
          <Button variant="ghost" size="sm" onClick={() => void setStatus("draft")} disabled={busy}>
            <RefreshCwIcon />
            Review again
          </Button>
        )}
      </div>
      {editing && <EditAccomplishmentDialog accomplishment={accomplishment} onClose={() => setEditing(false)} />}
    </article>
  )
}

function EditAccomplishmentDialog({
  accomplishment,
  onClose,
}: {
  accomplishment: Accomplishment
  onClose: () => void
}) {
  const update = useMutation(api.experience.updateAccomplishment)
  const [title, setTitle] = useState(accomplishment.title)
  const [description, setDescription] = useState(accomplishment.description)
  const [skills, setSkills] = useState(accomplishment.skills.join(", "))
  const [saving, setSaving] = useState(false)
  const valid = title.trim().length > 0 && description.trim().length > 0
  async function save(status: "draft" | "confirmed") {
    if (!valid) return
    setSaving(true)
    try {
      await update({
        id: accomplishment._id,
        title,
        description,
        skills: skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        sourceQuote: accomplishment.sourceQuote,
        clarification: accomplishment.clarification,
        status,
      })
      toast.success(status === "confirmed" ? "Accomplishment confirmed" : "Draft saved")
      onClose()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Review accomplishment</DialogTitle>
          <DialogDescription>
            Check your contribution, skills, and metrics. Only confirmed accomplishments inform resume suggestions.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save("confirmed")
          }}
        >
          {accomplishment.clarification && (
            <p className="rounded-lg bg-muted p-3 text-sm">
              {accomplishment.clarification} Update the description with your answer before confirming.
            </p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="accomplishment-title">Title</Label>
            <Input
              id="accomplishment-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={160}
              disabled={saving}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="accomplishment-description">Your contribution and results</Label>
            <Textarea
              id="accomplishment-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-36 max-h-72 field-sizing-fixed"
              required
              maxLength={3000}
              disabled={saving}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="accomplishment-skills">Skills, separated by commas</Label>
            <Input
              id="accomplishment-skills"
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">Include only skills you used in this work.</p>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Original supporting passage</summary>
            <blockquote className="mt-2 border-l-2 pl-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground wrap-break-word">
              {accomplishment.sourceQuote}
            </blockquote>
          </details>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving || !valid} onClick={() => void save("draft")}>
              Save draft
            </Button>
            <Button type="submit" disabled={saving || !valid}>
              {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}Confirm accomplishment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
