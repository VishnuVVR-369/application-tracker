"use client"

import { useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { ExternalLinkIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { DetailsTab } from "@/components/application/details-tab"
import { ReferralsTab } from "@/components/application/referrals-tab"
import { ResumeTab } from "@/components/application/resume-tab"
import { CloseDialog } from "@/components/close-dialog"
import { CompanyMark } from "@/components/company-mark"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useSetStatus } from "@/hooks/use-set-status"
import {
  APPLICATION_STATUSES,
  OUTCOME_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/domain"
import { errorMessage } from "@/lib/errors"
import { OUTCOME_BADGE, STATUS_DOT } from "@/lib/status-style"
import { cn } from "@/lib/utils"

export type ApplicationDetail = NonNullable<FunctionReturnType<typeof api.applications.get>>

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })

export function ApplicationSheet({ id, onClose }: { id: Id<"applications"> | null; onClose: () => void }) {
  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {id && <SheetBody key={id} id={id} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function SheetBody({ id, onClose }: { id: Id<"applications">; onClose: () => void }) {
  const application = useQuery(api.applications.get, { id })
  const referrals = useQuery(api.referrals.forApplication, { applicationId: id })
  const [tab, setTab] = useState("details")

  if (application === undefined) return <SheetSkeleton />
  if (application === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <SheetTitle>Application not found</SheetTitle>
        <SheetDescription>It may have been deleted.</SheetDescription>
        <Button variant="outline" onClick={onClose}>
          Back to board
        </Button>
      </div>
    )
  }

  const referralCount = referrals?.requests.length ?? 0

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
      <header className="border-b px-5 pt-5 sm:px-6">
        <DeleteMenu application={application} onDeleted={onClose} />
        <div className="flex items-center gap-1.5 pr-16 text-sm text-muted-foreground">
          <CompanyMark name={application.company} className="mr-0.5 size-5 rounded text-[10px]" />
          <span className="truncate font-medium">{application.company}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{SOURCE_LABELS[application.source]}</span>
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-flex shrink-0 items-center gap-1 rounded text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
            >
              View posting
              <ExternalLinkIcon className="size-3.5" />
            </a>
          )}
        </div>
        <SheetTitle className="mt-1 text-xl leading-tight font-semibold tracking-tight">{application.role}</SheetTitle>
        <SheetDescription className="sr-only">Application details, referrals, and resume</SheetDescription>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusControl application={application} />
          <Timeline application={application} />
        </div>
        <TabsList variant="line" className="mt-3 -mb-px h-10 gap-4 p-0">
          <TabsTrigger value="details" className="px-0">
            Details
          </TabsTrigger>
          <TabsTrigger value="referrals" className="px-0">
            Referrals
            {referralCount > 0 && <span className="text-muted-foreground tabular-nums">{referralCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="resume" className="px-0">
            Resume
          </TabsTrigger>
        </TabsList>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <TabsContent value="details" className="p-5 sm:p-6">
          <DetailsTab application={application} />
        </TabsContent>
        <TabsContent value="referrals" className="p-5 sm:p-6">
          <ReferralsTab
            applicationId={application._id}
            company={application.company}
            closed={application.status === "closed"}
            data={referrals}
          />
        </TabsContent>
        <TabsContent value="resume" className="p-5 sm:p-6">
          <ResumeTab application={application} />
        </TabsContent>
      </div>
    </Tabs>
  )
}

function StatusControl({ application }: { application: ApplicationDetail }) {
  const setStatus = useSetStatus()
  const [closing, setClosing] = useState(false)

  function change(status: ApplicationStatus) {
    if (status === "closed") {
      setClosing(true)
      return
    }
    setStatus({ id: application._id, status }).catch((error) => toast.error(errorMessage(error)))
  }

  return (
    <>
      <Select value={application.status} onValueChange={(value) => change(value as ApplicationStatus)}>
        <SelectTrigger size="sm" aria-label="Status" className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APPLICATION_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {application.status === "closed" && application.outcome && (
        <button
          type="button"
          onClick={() => setClosing(true)}
          title="Change outcome"
          className={cn("h-7 rounded-md px-2 text-xs font-medium", OUTCOME_BADGE[application.outcome])}
        >
          {OUTCOME_LABELS[application.outcome]}
        </button>
      )}
      <CloseDialog
        open={closing}
        title={`${application.role} at ${application.company}`}
        onCancel={() => setClosing(false)}
        onConfirm={(outcome) => {
          setClosing(false)
          setStatus({ id: application._id, status: "closed", outcome }).catch((error) => toast.error(errorMessage(error)))
        }}
      />
    </>
  )
}

function Timeline({ application }: { application: ApplicationDetail }) {
  const parts = [`Saved ${dateFormat.format(application.savedAt)}`]
  if (application.appliedAt) parts.push(`Applied ${dateFormat.format(application.appliedAt)}`)
  if (application.status === "in_progress" || application.status === "closed") {
    parts.push(`${STATUS_LABELS[application.status]} ${dateFormat.format(application.statusChangedAt)}`)
  }
  return <p className="ml-1 text-xs text-muted-foreground">{parts.join(" · ")}</p>
}

function DeleteMenu({ application, onDeleted }: { application: ApplicationDetail; onDeleted: () => void }) {
  const remove = useMutation(api.applications.remove)
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="absolute top-3 right-11" aria-label="More actions">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
            <Trash2Icon />
            Delete application
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              {application.role} at {application.company} will be removed along with its referral requests, resume
              analyses, and attached PDF. People you added stay saved under {application.company}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onDeleted()
                remove({ id: application._id })
                  .then(() => toast.success("Application deleted"))
                  .catch((error) => toast.error(errorMessage(error)))
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SheetSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="space-y-3 border-b px-6 pt-5 pb-4">
        <SheetTitle className="sr-only">Loading application</SheetTitle>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-3 h-5 w-56" />
      </div>
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}
