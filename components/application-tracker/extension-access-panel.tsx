"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { Check, Copy, KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createExtensionTokenSecret } from "@/lib/extension-token"
import { Panel } from "./common"

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function ExtensionAccessPanel() {
  const tokens = useQuery(api.extensionTokens.list)
  const createToken = useMutation(api.extensionTokens.create)
  const revokeToken = useMutation(api.extensionTokens.revoke)
  const [name, setName] = React.useState("Personal Chrome")
  const [revealedToken, setRevealedToken] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [revokingId, setRevokingId] = React.useState<Id<"extensionTokens"> | null>(null)
  const [copied, setCopied] = React.useState(false)

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      return
    }
    setCreating(true)
    try {
      const secret = await createExtensionTokenSecret()
      await createToken({
        name: name.trim(),
        tokenHash: secret.tokenHash,
        tokenPrefix: secret.tokenPrefix,
      })
      setRevealedToken(secret.token)
      setCopied(false)
      toast.success("Extension token created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create extension token")
    } finally {
      setCreating(false)
    }
  }

  async function copyToken() {
    await navigator.clipboard.writeText(revealedToken)
    setCopied(true)
    toast.success("Token copied")
  }

  async function handleRevoke(id: Id<"extensionTokens">, tokenName: string) {
    if (!window.confirm(`Revoke “${tokenName}”? The connected extension will stop working immediately.`)) {
      return
    }
    setRevokingId(id)
    try {
      await revokeToken({ id })
      toast.success("Extension token revoked")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke extension token")
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <Panel title="Chrome extension access" icon={KeyRound} className="xl:col-span-2">
      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-brand/25 bg-brand-weak/50 p-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
          <div>
            <p className="text-sm font-medium">Revocable, capture-only access</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-300">
              Tokens can check, create, refresh, and briefly undo LinkedIn captures. They cannot read your
              pipeline, notes, resumes, or contacts. The secret is shown once and stored only as a hash here.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            aria-label="Extension token name"
            placeholder="Personal Chrome"
          />
          <Button type="submit" variant="secondary" disabled={creating || !name.trim()}>
            <Plus className="size-4" />
            {creating ? "Creating…" : "Create token"}
          </Button>
        </form>

        {revealedToken ? (
          <div role="status" className="rounded-xl border border-status-warn/30 bg-status-warn/10 p-3">
            <p className="text-sm font-medium">Copy this token now—it will not be shown again.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-line bg-surface-1 px-3 py-2 font-mono text-xs">
                {revealedToken}
              </code>
              <Button type="button" variant="secondary" onClick={() => void copyToken()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2">
          <p className="micro-label">Access tokens</p>
          {tokens === undefined ? (
            <p className="text-sm text-ink-300">Loading tokens…</p>
          ) : tokens.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-300">
              No extension tokens yet.
            </p>
          ) : (
            tokens.map((token) => (
              <div
                key={token._id}
                className="flex flex-col gap-3 rounded-xl border border-line bg-surface-1/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{token.name}</p>
                    <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink-300">
                      {token.tokenPrefix}…
                    </code>
                    {token.revokedAt ? (
                      <span className="rounded-full border border-status-down/30 bg-status-down/10 px-2 py-0.5 text-xs text-status-down">
                        Revoked
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-ink-400">
                    Created {DATE_FORMAT.format(token.createdAt)}
                    {token.lastUsedAt ? ` · Last used ${DATE_FORMAT.format(token.lastUsedAt)}` : " · Never used"}
                  </p>
                </div>
                {!token.revokedAt ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={revokingId === token._id}
                    onClick={() => void handleRevoke(token._id, token.name)}
                    className="w-fit shrink-0 text-status-down"
                  >
                    <Trash2 className="size-4" />
                    {revokingId === token._id ? "Revoking…" : "Revoke"}
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  )
}
