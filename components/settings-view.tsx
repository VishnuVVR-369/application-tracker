"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import { CheckIcon, CopyIcon, KeyRoundIcon, Loader2Icon, PlusIcon } from "lucide-react"
import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useNow } from "@/hooks/use-now"
import { formatDaysAgo } from "@/lib/domain"
import { errorMessage } from "@/lib/errors"

const MCP_URL = `${(process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "").replace(/\/$/, "")}/mcp`

export function SettingsView() {
  const settings = useQuery(api.settings.get)
  const setFollowUpDays = useMutation(api.settings.setFollowUpDays)
  const setFitThreshold = useMutation(api.settings.setFitThreshold)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
      {settings === undefined ? (
        <div className="mt-8 grid gap-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : settings === null ? null : (
        <div className="mt-8 grid gap-6">
          <NumberSetting
            title="Follow-up timing"
            description="Referral requests with no reply get flagged for a follow-up after this many days."
            label="Days to wait"
            value={settings.followUpDays}
            min={1}
            max={30}
            save={setFollowUpDays}
            toArgs={(days) => ({ days })}
            saved="Follow-up timing saved"
          />
          <NumberSetting
            title="Inbox fit threshold"
            description="Collected jobs whose best match score reaches this get suggested resume edits automatically. 60 to 84 means worth tailoring, 85 and up means ready as is."
            label="Minimum score"
            value={settings.fitThreshold}
            min={0}
            max={100}
            save={setFitThreshold}
            toArgs={(threshold) => ({ threshold })}
            saved="Threshold saved. The inbox is being updated."
          />
          <ApiTokens />
        </div>
      )}
    </div>
  )
}

function Card({ title, description, children }: { title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function NumberSetting<Args>({
  title,
  description,
  label,
  value,
  min,
  max,
  save,
  toArgs,
  saved,
}: {
  title: string
  description: string
  label: string
  value: number
  min: number
  max: number
  save: (args: Args) => Promise<unknown>
  toArgs: (value: number) => Args
  saved: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const id = title.toLowerCase().replace(/\W+/g, "-")
  const current = draft ?? String(value)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await save(toArgs(Number(current)))
      setDraft(null)
      toast.success(saved)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title={title} description={description}>
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            type="number"
            min={min}
            max={max}
            required
            className="w-28"
            value={current}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={saving || draft === null || Number(draft) === value}>
          {saving && <Loader2Icon className="animate-spin" />}
          Save
        </Button>
      </form>
    </Card>
  )
}

function ApiTokens() {
  const tokens = useQuery(api.apiTokens.list)
  const now = useNow()
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<{ id: Id<"apiTokens">; name: string } | null>(null)
  const revoke = useMutation(api.apiTokens.revoke)

  return (
    <Card
      title="API tokens"
      description={
        <>
          Let open-bot&apos;s Job Scout save the jobs it collects. In open-bot, add an http connection with this
          address and the header <code className="rounded bg-muted px-1 py-0.5 text-xs">Authorization: Bearer &lt;token&gt;</code>.
        </>
      }
    >
      <CopyField value={MCP_URL} label="MCP address" />
      <div className="mt-4 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tokens</h3>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          <PlusIcon />
          New token
        </Button>
      </div>
      {tokens === undefined ? (
        <Skeleton className="mt-3 h-12 w-full rounded-lg" />
      ) : !tokens?.length ? (
        <p className="mt-3 rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          No tokens yet.
        </p>
      ) : (
        <ul className="mt-3 divide-y rounded-lg border">
          {tokens.map((token) => (
            <li key={token._id} className="flex items-center gap-3 px-3 py-2.5">
              <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{token.name}</p>
                <p className="text-xs text-muted-foreground">
                  <code>{token.prefix}…</code> · created {formatDaysAgo(token.createdAt, now)} ·{" "}
                  {token.lastUsedAt ? `last used ${formatDaysAgo(token.lastUsedAt, now)}` : "never used"}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setRevoking({ id: token._id, name: token.name })}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
      <CreateTokenDialog open={creating} onOpenChange={setCreating} />
      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revoking?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using this token stops reaching the tracker right away. Jobs it already saved stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!revoking) return
                revoke({ id: revoking.id })
                  .then(() => toast.success("Token revoked"))
                  .catch((error) => toast.error(errorMessage(error)))
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function CreateTokenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useAction(api.apiTokens.create)
  const [name, setName] = useState("Job Scout")
  const [token, setToken] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      setToken(await create({ name }))
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
        if (!next) {
          setToken(null)
          setName("Job Scout")
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        {token ? (
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Copy your token</DialogTitle>
              <DialogDescription>This is the only time it&apos;s shown. Paste it into open-bot now.</DialogDescription>
            </DialogHeader>
            <CopyField value={token} label="Token" />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>New API token</DialogTitle>
              <DialogDescription>Name it after what will use it, so you know what to revoke later.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="token-name">Name</Label>
              <Input id="token-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2Icon className="animate-spin" />}
                Create token
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.")
    }
  }
  return (
    <div className="flex items-center gap-2">
      <Input readOnly aria-label={label} value={value} className="font-mono text-xs" onFocus={(event) => event.target.select()} />
      <Button type="button" size="icon-sm" variant="outline" aria-label={`Copy ${label.toLowerCase()}`} onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  )
}
