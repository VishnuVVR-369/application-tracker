"use client"

import { useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import {
  AlertCircleIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FileUpIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

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
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { errorMessage } from "@/lib/errors"
import { pdfProblem, uploadToConvex } from "@/lib/upload"
import { cn } from "@/lib/utils"

type Resume = NonNullable<FunctionReturnType<typeof api.resumes.list>>[number]

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" })

function labelFromFileName(fileName: string) {
  const label = fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim()
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function ResumesView() {
  const resumes = useQuery(api.resumes.list)
  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="text-sm text-muted-foreground">
            Base resumes to check against each job. Keep one per kind of role you target.
          </p>
        </div>
        {resumes && resumes.length > 0 && (
          <Button onClick={() => setUploadOpen(true)}>
            <PlusIcon />
            Upload resume
          </Button>
        )}
      </div>

      {resumes === undefined ? (
        <div className="mt-6 grid gap-2">
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
        </div>
      ) : resumes === null ? null : resumes.length === 0 ? (
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="mt-8 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center transition-colors hover:border-foreground/30"
        >
          <FileUpIcon className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">Upload your first resume</span>
          <span className="max-w-xs text-xs text-muted-foreground">
            A PDF of your current resume. Add more later, for example &quot;Backend&quot; and &quot;Full-stack&quot;.
          </span>
        </button>
      ) : (
        <ul className="mt-6 grid gap-2">
          {resumes.map((resume) => (
            <ResumeRow key={resume._id} resume={resume} />
          ))}
        </ul>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  )
}

function ResumeRow({ resume }: { resume: Resume }) {
  const generateUploadUrl = useMutation(api.applications.generateUploadUrl)
  const replaceFile = useMutation(api.resumes.replaceFile)
  const retry = useMutation(api.resumes.retryExtraction)
  const remove = useMutation(api.resumes.remove)
  const inputRef = useRef<HTMLInputElement>(null)
  const [replacing, setReplacing] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function replace(file: File) {
    const problem = pdfProblem(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setReplacing(true)
    try {
      const storageId = await uploadToConvex(await generateUploadUrl(), file)
      await replaceFile({ id: resume._id, storageId: storageId as Id<"_storage">, fileName: file.name })
      toast.success(`${resume.label} updated`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setReplacing(false)
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileTextIcon className="size-4.5 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{resume.label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="max-w-56 truncate">{resume.fileName}</span>
          <span aria-hidden>·</span>
          <span>{dateFormat.format(resume.uploadedAt)}</span>
          <span aria-hidden>·</span>
          <TextStatus resume={resume} onRetry={() => retry({ id: resume._id }).catch((e) => toast.error(errorMessage(e)))} />
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) void replace(file)
        }}
      />
      {resume.url && (
        <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
          <a href={resume.url} target="_blank" rel="noreferrer">
            <ExternalLinkIcon />
            View
          </a>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${resume.label}`} disabled={replacing}>
            {replacing ? <Loader2Icon className="animate-spin" /> : <MoreHorizontalIcon />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {resume.url && (
            <DropdownMenuItem asChild className="sm:hidden">
              <a href={resume.url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                View PDF
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <PencilIcon />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <FileUpIcon />
            Replace PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog resume={resume} open={renaming} onOpenChange={setRenaming} />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {resume.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              The PDF and every match analysis made with it will be removed. Applications using it will have no base
              resume selected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => remove({ id: resume._id }).catch((error) => toast.error(errorMessage(error)))}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

function TextStatus({ resume, onRetry }: { resume: Resume; onRetry: () => void }) {
  if (resume.textStatus === "extracting") {
    return (
      <span className="flex items-center gap-1">
        <Loader2Icon className="size-3 animate-spin" />
        Reading PDF…
      </span>
    )
  }
  if (resume.textStatus === "failed") {
    return (
      <span className="flex items-center gap-1.5 text-destructive">
        <AlertCircleIcon className="size-3.5" />
        Couldn&apos;t read text
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 underline underline-offset-4">
          <RefreshCwIcon className="size-3" />
          Retry
        </button>
      </span>
    )
  }
  return <span>{resume.wordCount.toLocaleString()} words</span>
}

function RenameDialog({
  resume,
  open,
  onOpenChange,
}: {
  resume: Resume
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const rename = useMutation(api.resumes.rename)
  const [label, setLabel] = useState(resume.label)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setLabel(resume.label)
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            try {
              await rename({ id: resume._id, label })
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename resume</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rename-label">Label</Label>
            <Input id="rename-label" required autoFocus value={label} onChange={(e) => setLabel(e.target.value)} />
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

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const generateUploadUrl = useMutation(api.applications.generateUploadUrl)
  const create = useMutation(api.resumes.create)
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)

  function pick(next: File) {
    const problem = pdfProblem(next)
    if (problem) {
      toast.error(problem)
      return
    }
    setFile(next)
    if (!label.trim()) setLabel(labelFromFileName(next.name))
  }

  function reset() {
    setFile(null)
    setLabel("")
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) return
    setSaving(true)
    try {
      const storageId = await uploadToConvex(await generateUploadUrl(), file)
      await create({ label, storageId: storageId as Id<"_storage">, fileName: file.name })
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Upload resume</DialogTitle>
            <DialogDescription>PDF up to 10 MB. Its text is read so it can be compared with job descriptions.</DialogDescription>
          </DialogHeader>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const next = event.target.files?.[0]
              event.target.value = ""
              if (next) pick(next)
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragOver(false)
              const next = event.dataTransfer.files[0]
              if (next) pick(next)
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-8 text-center transition-colors hover:border-foreground/30",
              dragOver && "border-foreground/40 bg-muted",
            )}
          >
            {file ? (
              <>
                <FileTextIcon className="size-5 text-foreground" />
                <span className="max-w-full truncate text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">Click to choose a different file</span>
              </>
            ) : (
              <>
                <FileUpIcon className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">Drop a PDF or click to browse</span>
              </>
            )}
          </button>
          <div className="grid gap-2">
            <Label htmlFor="resume-label">Label</Label>
            <Input
              id="resume-label"
              required
              placeholder="Backend, Full-stack, …"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || saving}>
              {saving && <Loader2Icon className="animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
