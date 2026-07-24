"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import {
  Archive,
  ArchiveRestore,
  BookMarked,
  ChevronDown,
  ChevronUp,
  History,
  Library,
  Pencil,
  Plus,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { STORY_COMPETENCY_LABELS, type StoryUsageRecord } from "@/lib/application-model"
import { formatShortDate } from "@/lib/date-model"
import { buildStoryBankModel } from "@/lib/story-bank-model"
import { cn } from "@/lib/utils"
import { Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, PageHeader, Panel } from "./common"
import { PageSkeleton } from "./skeletons"
import { StoryFormSheet } from "./story-form-sheet"
import { StoryUsageSheet } from "./story-usage-sheet"
import { mapApplication, mapInterview, mapStory, mapStoryUsage } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function StoryBankPage() {
  const { data, isLoading } = useAppData("stories")
  const updateStory = useMutation(api.stories.updateStory)
  const [editingStoryId, setEditingStoryId] = React.useState<string | null>(null)
  const [usageStoryId, setUsageStoryId] = React.useState<string | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  if (isLoading) return <PageSkeleton action stats={4} columns="1.35fr 0.9fr" panels={3} />
  if (!data) {
    return <EmptyState title="Story bank unavailable" description="Sign in to load your stories." />
  }

  const applications = data.applications.map(mapApplication)
  const interviews = data.applicationInterviews.map(mapInterview)
  const allStories = data.storyBankEntries.map(mapStory)
  const archivedStories = allStories.filter((story) => story.archived)
  const model = buildStoryBankModel({
    stories: allStories,
    usages: data.storyUsages.map(mapStoryUsage),
  })

  const editingStory = allStories.find((story) => story.id === editingStoryId)
  const usageStory = allStories.find((story) => story.id === usageStoryId)

  async function archiveStory(id: string) {
    try {
      await updateStory({ id: id as Id<"storyBankEntries">, archived: true })
      toast.success("Story archived")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not archive story")
    }
  }

  async function restoreStory(id: string) {
    try {
      await updateStory({ id: id as Id<"storyBankEntries">, archived: false })
      toast.success("Story restored")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore story")
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Stories"
        title="Story bank"
        description="Build reusable STAR stories with impact, technical depth, and competency coverage for behavioral and hiring-manager rounds."
        action={
          <StoryFormSheet
            trigger={
              <Button>
                <Plus className="size-4" /> Add story
              </Button>
            }
          />
        }
      />

      <Stagger className="grid gap-6">
        <StaggerItem>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Stories" value={model.summary.total} />
            <Stat label="Ready" value={model.summary.ready} />
            <Stat label="Unused" value={model.summary.unused} />
            <Stat label="Gaps" value={model.missingCompetencies.length} warn />
          </div>
        </StaggerItem>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="grid content-start gap-4">
            {model.rows.length === 0 ? (
              <StaggerItem>
                <EmptyState
                  icon={Library}
                  title="No stories yet"
                  description="Add project stories that prove ownership, technical judgment, and impact."
                  action={
                    <StoryFormSheet
                      trigger={
                        <Button>
                          <Plus className="size-4" /> Add story
                        </Button>
                      }
                    />
                  }
                />
              </StaggerItem>
            ) : (
              model.rows.map(({ story, completeness, usages }) => {
                const expanded = expandedId === story.id
                return (
                  <StaggerItem key={story.id}>
                    <Panel
                      title={story.title}
                      label={story.project ?? `${usages.length} usage${usages.length === 1 ? "" : "s"}`}
                      icon={BookMarked}
                      action={
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit story"
                            onClick={() => setEditingStoryId(story.id)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Log story usage"
                            onClick={() => setUsageStoryId(story.id)}
                          >
                            <History className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Archive story"
                            onClick={() => void archiveStory(story.id)}
                          >
                            <Archive className="size-3.5" />
                          </Button>
                        </div>
                      }
                    >
                      <div className="grid gap-4 lg:grid-cols-[1fr_11rem]">
                        <div className="grid gap-3">
                          {expanded ? (
                            <div className="grid gap-2.5">
                              <StarSection label="Situation" text={story.situation} />
                              <StarSection label="Task" text={story.task} />
                              <StarSection label="Action" text={story.action} />
                              <StarSection label="Result" text={story.result} />
                              {story.impactMetrics && (
                                <p className="rounded-lg border border-brand/20 bg-brand-weak px-3 py-2 text-sm text-brand">
                                  {story.impactMetrics}
                                </p>
                              )}
                              {story.senioritySignal && (
                                <p className="text-xs text-ink-500">
                                  Seniority signal: <span className="text-ink-300">{story.senioritySignal}</span>
                                </p>
                              )}
                              {story.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {story.technologies.map((tech) => (
                                    <span
                                      key={tech}
                                      className="rounded-md border border-line bg-surface-1 px-2 py-1 text-xs text-ink-500"
                                    >
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div>
                                <p className="micro-label mb-1.5">Usage history</p>
                                {usages.length ? (
                                  <div className="grid gap-1.5">
                                    {usages.map((usage) => (
                                      <UsageRow
                                        key={usage.id}
                                        usage={usage}
                                        companyName={
                                          applications.find((item) => item.id === usage.applicationId)
                                            ?.companyName
                                        }
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-ink-500">
                                    Not used yet — log it after your next interview.
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="line-clamp-2 text-sm text-ink-300">{story.result}</p>
                              {story.impactMetrics && (
                                <p className="rounded-lg border border-brand/20 bg-brand-weak px-3 py-2 text-sm text-brand">
                                  {story.impactMetrics}
                                </p>
                              )}
                            </>
                          )}

                          {story.competencies.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {story.competencies.map((competency) => (
                                <span
                                  key={competency}
                                  className="rounded-md border border-line bg-surface-1 px-2 py-1 text-xs text-ink-300"
                                >
                                  {STORY_COMPETENCY_LABELS[competency]}
                                </span>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : story.id)}
                            className="flex w-fit items-center gap-1 text-xs text-ink-500 transition-colors hover:text-brand"
                          >
                            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            {expanded ? "Show less" : "Show full story"}
                          </button>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface-1/60 p-3">
                          <p className="micro-label">Completeness</p>
                          <CompletenessRing score={completeness} />
                          <Badge variant={usages.length ? "accent" : "outline"} className="font-mono tabular">
                            {usages.length} use{usages.length === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      </div>
                    </Panel>
                  </StaggerItem>
                )
              })
            )}
          </div>

          <div className="grid content-start gap-4">
            <StaggerItem>
              <Panel title="Competency coverage" icon={ShieldCheck}>
                <div className="grid gap-2.5">
                  {model.competencyCoverage.map((item) => {
                    const max = Math.max(1, ...model.competencyCoverage.map((c) => c.count))
                    const pct = Math.round((item.count / max) * 100)
                    const missing = item.count === 0
                    return (
                      <div key={item.competency}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className={missing ? "text-status-warn" : "text-ink-300"}>
                            {STORY_COMPETENCY_LABELS[item.competency]}
                          </span>
                          <span className="font-mono tabular text-ink-500">{item.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3 ring-1 ring-inset ring-line">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-brand to-status-info"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {model.missingCompetencies.length > 0 && (
                  <p className="mt-3 rounded-lg border border-status-warn/30 bg-status-warn/10 px-3 py-2 text-xs text-status-warn">
                    Gaps: no story yet for{" "}
                    {model.missingCompetencies.map((c) => STORY_COMPETENCY_LABELS[c]).join(", ")}.
                  </p>
                )}
              </Panel>
            </StaggerItem>

            {archivedStories.length > 0 && (
              <StaggerItem>
                <Panel title="Archived stories" label={`${archivedStories.length} archived`} icon={Archive}>
                  <div className="grid gap-2">
                    {archivedStories.map((story) => (
                      <div
                        key={story.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-1/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-ink-300">{story.title}</p>
                          {story.project && <p className="truncate text-xs text-ink-500">{story.project}</p>}
                        </div>
                        <Button variant="secondary" size="xs" onClick={() => void restoreStory(story.id)}>
                          <ArchiveRestore className="size-3.5" /> Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                </Panel>
              </StaggerItem>
            )}
          </div>
        </div>
      </Stagger>

      {editingStory && (
        <StoryFormSheet
          story={editingStory}
          open={Boolean(editingStory)}
          onOpenChange={(open) => !open && setEditingStoryId(null)}
        />
      )}
      {usageStory && (
        <StoryUsageSheet
          story={usageStory}
          applications={applications}
          interviews={interviews}
          open={Boolean(usageStory)}
          onOpenChange={(open) => !open && setUsageStoryId(null)}
        />
      )}
    </>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="micro-label">{label}</p>
      <p className={cn("mt-2 font-mono text-2xl font-semibold tabular", warn && value > 0 && "text-status-warn")}>
        {value}
      </p>
    </div>
  )
}

function StarSection({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="micro-label mb-1">{label}</p>
      <p className="text-sm leading-relaxed text-ink-300">{text}</p>
    </div>
  )
}

function UsageRow({ usage, companyName }: { usage: StoryUsageRecord; companyName?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface-1/60 px-2.5 py-1.5 text-xs">
      <span className="truncate text-ink-300">{companyName ?? "Practice / unlogged"}</span>
      <span className="flex shrink-0 items-center gap-2">
        <ConfidenceBadge confidence={usage.confidence} />
        <span className="font-mono tabular text-ink-500">
          {formatShortDate(usage.usedAtDate ?? usage.createdAt)}
        </span>
      </span>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: StoryUsageRecord["confidence"] }) {
  const variant = confidence === "high" ? "success" : confidence === "medium" ? "warn" : "danger"
  return (
    <Badge variant={variant} className="capitalize">
      {confidence}
    </Badge>
  )
}

function CompletenessRing({ score }: { score: number }) {
  const tone = score >= 80 ? "var(--brand)" : score >= 50 ? "var(--status-warn)" : "var(--status-down)"
  return (
    <div className="relative flex size-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-3)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 97.4} 97.4`}
          style={{ filter: `drop-shadow(0 0 4px color-mix(in oklch, ${tone} 60%, transparent))` }}
        />
      </svg>
      <span className="absolute font-mono text-sm font-semibold tabular">{score}</span>
    </div>
  )
}
