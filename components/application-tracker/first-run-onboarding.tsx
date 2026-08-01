"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { ArrowRight, BriefcaseBusiness, FileUp, LayoutDashboard, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ApplicationFormSheet } from "./application-form-sheet"

type FirstRunOnboardingProps = {
  firstName: string
  resumes: Doc<"resumes">[]
}

const paths = [
  {
    icon: BriefcaseBusiness,
    title: "Add your first application",
    description: "Capture the posting, company, role, and stage now. Add the rest when it matters.",
    action: "Quick capture",
    kind: "capture" as const,
  },
  {
    icon: FileUp,
    title: "Upload your resume",
    description: "Keep a PDF ready to link to applications and track which version you submitted.",
    action: "Open documents",
    kind: "resume" as const,
  },
  {
    icon: LayoutDashboard,
    title: "Explore the workspace",
    description: "See the planning tools for targets, interview prep, stories, and outreach.",
    action: "Explore workspace",
    kind: "workspace" as const,
  },
]

export function FirstRunOnboarding({ firstName, resumes }: FirstRunOnboardingProps) {
  const router = useRouter()
  const setOnboardingStatus = useMutation(api.users.setOnboardingStatus)
  const [captureOpen, setCaptureOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<"dismiss" | "workspace" | null>(null)

  async function dismiss() {
    setPendingAction("dismiss")
    try {
      await setOnboardingStatus({ status: "dismissed" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not dismiss onboarding")
    } finally {
      setPendingAction(null)
    }
  }

  async function exploreWorkspace() {
    setPendingAction("workspace")
    try {
      await setOnboardingStatus({ status: "dismissed" })
      router.push("/app/workspace")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the workspace")
    } finally {
      setPendingAction(null)
    }
  }

  function choosePath(kind: (typeof paths)[number]["kind"]) {
    if (kind === "capture") {
      setCaptureOpen(true)
      return
    }
    if (kind === "resume") {
      router.push("/app/documents")
      return
    }
    void exploreWorkspace()
  }

  return (
    <>
      <section className="grain relative overflow-hidden rounded-2xl border border-brand/25 bg-surface-2/80 shadow-[0_30px_100px_-55px_color-mix(in_oklch,var(--brand)_70%,transparent)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-brand/15 blur-3xl"
        />
        <div className="relative border-b border-line/70 px-5 py-5 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="micro-label flex items-center gap-1.5 text-brand">
                <Sparkles className="size-3.5" />
                First run
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-tight">
                Welcome, <span className="text-gradient">{firstName}</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-300">
                Start where you are. One useful action is enough to turn this into your job-search
                command center.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pendingAction !== null}
              onClick={() => void dismiss()}
              className="w-fit text-ink-400"
            >
              {pendingAction === "dismiss" ? "Dismissing…" : "Dismiss guide"}
            </Button>
          </div>
        </div>

        <div className="relative grid gap-3 p-4 sm:p-5 lg:grid-cols-3">
          {paths.map((path, index) => {
            const Icon = path.icon
            const isPrimary = index === 0
            return (
              <button
                key={path.kind}
                type="button"
                disabled={pendingAction !== null}
                onClick={() => choosePath(path.kind)}
                className={cn(
                  "group flex min-h-48 flex-col rounded-xl border p-4 text-left outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60",
                  isPrimary
                    ? "border-brand/35 bg-brand-weak/60 hover:border-brand/60 hover:bg-brand-weak"
                    : "border-line bg-surface-1/65 hover:border-line-strong hover:bg-surface-3/60"
                )}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border",
                    isPrimary
                      ? "border-brand/30 bg-brand-weak text-brand shadow-glow"
                      : "border-line bg-surface-3/70 text-ink-300"
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold tracking-tight">{path.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{path.description}</p>
                <span
                  className={cn(
                    "mt-auto flex items-center gap-1.5 pt-5 text-sm font-medium",
                    isPrimary ? "text-brand" : "text-ink-200"
                  )}
                >
                  {path.kind === "workspace" && pendingAction === "workspace"
                    ? "Opening…"
                    : path.action}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <ApplicationFormSheet
        resumes={resumes}
        open={captureOpen}
        onOpenChange={setCaptureOpen}
      />
    </>
  )
}
