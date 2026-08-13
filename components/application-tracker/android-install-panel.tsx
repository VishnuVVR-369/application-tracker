"use client"

import * as React from "react"
import Link from "next/link"
import { CheckCircle2, Download, Share2, Smartphone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Panel } from "./common"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function subscribeToStandalone(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)")
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function getStandaloneSnapshot() {
  return window.matchMedia("(display-mode: standalone)").matches
}

export function AndroidInstallPanel() {
  const [installPrompt, setInstallPrompt] = React.useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = React.useState(false)
  const displayModeStandalone = React.useSyncExternalStore(
    subscribeToStandalone,
    getStandaloneSnapshot,
    () => false
  )
  const standalone = installed || displayModeStandalone

  React.useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === "accepted") setInstallPrompt(null)
  }

  return (
    <Panel title="Android quick capture" icon={Smartphone} className="xl:col-span-2">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-sm leading-relaxed text-ink-300">
            Install Way2More from Chrome on Android once. It will then appear as a destination in the Android share sheet for job links.
          </p>
          <ol className="mt-4 grid gap-3 text-sm">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-weak text-xs font-semibold text-brand">1</span>
              Open this site in Chrome on Android and sign in.
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-weak text-xs font-semibold text-brand">2</span>
              Tap Chrome’s menu, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-weak text-xs font-semibold text-brand">3</span>
              On a job page, tap Share, choose Way2More, review the fields, and save.
            </li>
          </ol>
        </div>
        <div className="flex min-w-52 flex-col gap-2">
          {standalone ? (
            <div className="flex items-center gap-2 rounded-lg border border-status-up/30 bg-status-up/10 px-3 py-2 text-sm text-status-up">
              <CheckCircle2 className="size-4" /> Installed on this device
            </div>
          ) : installPrompt ? (
            <Button type="button" onClick={() => void install()}>
              <Download className="size-4" /> Install on Android
            </Button>
          ) : (
            <p className="rounded-lg border border-line bg-surface-1/60 px-3 py-2 text-xs leading-relaxed text-ink-500">
              If no install button appears, use Chrome’s three-dot menu.
            </p>
          )}
          <Button asChild variant="secondary">
            <Link href="/app/capture?source=settings">
              <Share2 className="size-4" /> Open quick capture
            </Link>
          </Button>
          <p className="text-center text-xs text-ink-500">Full troubleshooting: ANDROID_CAPTURE.md</p>
        </div>
      </div>
    </Panel>
  )
}
