"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { Download, Plus, Save } from "lucide-react"
import { useTheme } from "next-themes"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState, LoadingPanels, PageHeader, Panel } from "./common"
import { useAppData } from "./use-app-data"

export function SettingsPage() {
  const { data, isLoading } = useAppData()
  const exportPayload = useQuery(api.exportData.all)
  const updateSettings = useMutation(api.users.updateSettings)
  const updateQualityItem = useMutation(api.quality.updateItem)
  const addQualityItem = useMutation(api.quality.addItem)
  const reorderQualityItem = useMutation(api.quality.reorderItem)
  const { setTheme } = useTheme()
  const [newLabel, setNewLabel] = React.useState("")
  const [newWeight, setNewWeight] = React.useState("10")

  if (isLoading) {
    return <LoadingPanels />
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
    await addQualityItem({ label: newLabel, weight: Number(newWeight) || 1 })
    setNewLabel("")
    setNewWeight("10")
  }

  function downloadExport() {
    const payload = exportPayload ?? data
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `application-tracker-export-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const qualityItems = [...data.qualityChecklistItems].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Profile, appearance, quality defaults, and export"
        description="Settings and checklist defaults are stored in Convex and applied to new applications."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Profile">
          <form onSubmit={saveProfile} className="grid gap-3">
            <div className="rounded-md border border-line bg-surface-1 p-3">
              <p className="micro-label">OAuth identity</p>
              <p className="mt-1 text-sm">{data.user.email ?? "No email from provider"}</p>
            </div>
            <Input
              key={data.settings?.displayName ?? data.user.name ?? ""}
              name="displayName"
              defaultValue={data.settings?.displayName ?? data.user.name ?? ""}
              placeholder="Display name"
            />
            <Button type="submit" variant="secondary">
              <Save className="size-4" />
              Save profile
            </Button>
          </form>
        </Panel>

        <Panel title="Appearance">
          <div className="flex flex-wrap gap-2">
            {(["dark", "light", "system"] as const).map((theme) => (
              <Button
                key={theme}
                variant={data.settings?.theme === theme ? "default" : "secondary"}
                onClick={() => void saveTheme(theme)}
              >
                {theme[0].toUpperCase() + theme.slice(1)}
              </Button>
            ))}
          </div>
        </Panel>

        <Panel title="Export my data">
          <p className="mb-4 text-sm text-ink-300">
            Export applications, resume metadata, reminders, activity, goals, wins, settings, and quality defaults as JSON.
          </p>
          <Button onClick={downloadExport}>
            <Download className="size-4" />
            Download JSON
          </Button>
        </Panel>

        <Panel title="Quality checklist defaults" className="xl:col-span-2">
          <form onSubmit={addItem} className="mb-4 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <Input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="Custom checklist item" />
            <Input type="number" min={1} value={newWeight} onChange={(event) => setNewWeight(event.target.value)} />
            <Button type="submit" variant="secondary">
              <Plus className="size-4" />
              Add
            </Button>
          </form>
          <div className="grid gap-2">
            {qualityItems.map((item) => (
              <div key={item._id} className="grid gap-2 rounded-md border border-line bg-surface-1 p-3 lg:grid-cols-[auto_1fr_120px_auto] lg:items-start">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(event) => void updateQualityItem({ id: item._id, enabled: event.target.checked })}
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
                  />
                </div>
                <Input
                  type="number"
                  min={1}
                  value={item.weight}
                  onChange={(event) => void updateQualityItem({ id: item._id, weight: Number(event.target.value) || 1 })}
                />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void reorderQualityItem({ id: item._id, direction: "up" })}>
                    Up
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void reorderQualityItem({ id: item._id, direction: "down" })}>
                    Down
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
