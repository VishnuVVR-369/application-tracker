"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import {
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  GripVertical,
  ListChecks,
  Monitor,
  Moon,
  Palette,
  Plus,
  Save,
  Sun,
  UserRound,
} from "lucide-react"
import { useTheme } from "next-themes"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { EmptyState, PageHeader, Panel } from "./common"
import { PageSkeleton } from "./skeletons"
import { useAppData } from "./use-app-data"

const THEMES = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
] as const

export function SettingsPage() {
  const { data, isLoading } = useAppData("settings")
  const exportPayload = useQuery(api.exportData.all, data ? {} : "skip")
  const updateSettings = useMutation(api.users.updateSettings)
  const updateQualityItem = useMutation(api.quality.updateItem)
  const addQualityItem = useMutation(api.quality.addItem)
  const reorderQualityItem = useMutation(api.quality.reorderItem)
  const { setTheme } = useTheme()
  const [newLabel, setNewLabel] = React.useState("")

  if (isLoading) {
    return <PageSkeleton columns="1fr 1fr" panels={2} />
  }

  if (!data) {
    return <EmptyState title="Settings unavailable" description="Sign in to load settings from Convex." />
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const displayName = String(formData.get("displayName") ?? "")
    await updateSettings({ displayName })
  }

  async function saveTheme(theme: "dark" | "light" | "system") {
    setTheme(theme)
    await updateSettings({ theme })
  }

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newLabel.trim()) return
    await addQualityItem({ label: newLabel, weight: 1 })
    setNewLabel("")
  }

  function downloadExport() {
    if (!exportPayload) return
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `application-tracker-export-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const qualityItems = [...data.qualityChecklistItems].sort((a, b) => a.sortOrder - b.sortOrder)
  const activeTheme = data.settings?.theme ?? "system"
  const displayName = data.settings?.displayName ?? data.user.name ?? ""

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Profile, appearance, application checks, and export"
        description="Settings and checklist defaults are stored in Convex and applied to new applications."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Profile" icon={UserRound}>
          <form onSubmit={saveProfile} className="grid gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-1/60 p-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-hover to-brand text-base font-semibold text-primary-foreground shadow-glow">
                {(displayName || data.user.email || "?").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="micro-label">OAuth identity</p>
                <p className="mt-0.5 truncate text-sm">{data.user.email ?? "No email from provider"}</p>
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="micro-label">Display name</label>
              <Input key={displayName} name="displayName" defaultValue={displayName} placeholder="Display name" />
            </div>
            <Button type="submit" variant="secondary" className="w-fit">
              <Save className="size-4" />
              Save profile
            </Button>
          </form>
        </Panel>

        <Panel title="Appearance" icon={Palette}>
          <p className="mb-3 text-sm text-ink-300">Choose how the tracker looks. Dark is the default.</p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((theme) => {
              const Icon = theme.icon
              const active = activeTheme === theme.value
              return (
                <button
                  key={theme.value}
                  onClick={() => void saveTheme(theme.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                    active
                      ? "border-brand/40 bg-brand-weak text-brand shadow-glow"
                      : "border-line bg-surface-1/60 text-ink-300 hover:border-line-strong hover:text-ink-100"
                  )}
                >
                  <Icon className="size-5" />
                  <span className="text-sm font-medium">{theme.label}</span>
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel title="Export my data" icon={Database} className="xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm text-ink-300">
              Export applications, resume metadata, tasks, activity, goals, wins, settings, and quality
              defaults as a single JSON file.
            </p>
            <Button onClick={downloadExport} disabled={!exportPayload} className="w-fit shrink-0">
              <Download className="size-4" />
              Download JSON
            </Button>
          </div>
        </Panel>

        <Panel title="Application checklist defaults" icon={ListChecks} className="xl:col-span-2">
          <p className="mb-4 text-sm text-ink-300">
            These are concrete checks, not a weighted score. Applications show how many are complete.
          </p>
          <form onSubmit={addItem} className="mb-4 grid gap-2 border-b border-line/70 pb-4 sm:grid-cols-[1fr_auto]">
            <Input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="Custom checklist item" />
            <Button type="submit" variant="secondary">
              <Plus className="size-4" />
              Add item
            </Button>
          </form>
          <div className="grid gap-2">
            {qualityItems.map((item, index) => (
              <div
                key={item._id}
                className={cn(
                  "grid items-start gap-3 rounded-xl border border-line bg-surface-1/60 p-3 transition-opacity lg:grid-cols-[auto_auto_1fr_auto] lg:items-center",
                  !item.enabled && "opacity-60"
                )}
              >
                <span className="hidden text-ink-500 lg:block">
                  <GripVertical className="size-4" />
                </span>
                <Switch
                  checked={item.enabled}
                  onCheckedChange={(checked) => void updateQualityItem({ id: item._id, enabled: checked })}
                  aria-label={`Enable ${item.label}`}
                />
                <div className="grid gap-2">
                  <Input
                    value={item.label}
                    onChange={(event) => void updateQualityItem({ id: item._id, label: event.target.value })}
                  />
                  <Textarea
                    value={item.description ?? ""}
                    onChange={(event) => void updateQualityItem({ id: item._id, description: event.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => void reorderQualityItem({ id: item._id, direction: "up" })}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    disabled={index === qualityItems.length - 1}
                    onClick={() => void reorderQualityItem({ id: item._id, direction: "down" })}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
