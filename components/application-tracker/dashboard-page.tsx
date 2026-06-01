"use client"

import Link from "next/link"
import { useMutation } from "convex/react"
import { Plus } from "lucide-react"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { APPLICATION_STAGES, STAGE_LABELS } from "@/lib/application-model"
import { buildDashboardModel } from "@/lib/dashboard-model"
import { formatShortDate } from "@/lib/date-model"
import { ApplicationFormSheet } from "./application-form-sheet"
import { EmptyState, LoadingPanels, PageHeader, Panel, StageBadge } from "./common"
import { mapActivity, mapApplication, mapReminder } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function DashboardPage() {
  const { data, isLoading } = useAppData()
  const completeReminder = useMutation(api.reminders.complete)

  if (isLoading) {
    return <LoadingPanels />
  }

  if (!data) {
    return (
      <EmptyState
        title="Sign in to load your tracker"
        description="The app stores applications, resumes, reminders, goals, and settings in Convex."
        href="/signin"
        actionLabel="Sign in"
      />
    )
  }

  const applications = data.applications.map(mapApplication)
  const reminders = data.reminders.map(mapReminder)
  const activityEvents = data.activityEvents.map(mapActivity)
  const dashboard = buildDashboardModel({
    applications,
    reminders,
    activityEvents,
  })

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Today in your search"
        description="A calm overview of stages, attention, deadlines, reminders, and recent activity."
        action={
          <ApplicationFormSheet
            resumes={data.resumes}
            trigger={
              <Button>
                <Plus className="size-4" />
                New application
              </Button>
            }
          />
        }
      />

      <div className="grid gap-4">
        <Panel title="Stage strip" label={`${dashboard.activeCount} active`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {APPLICATION_STAGES.map((stage) => (
              <Link
                key={stage}
                href={`/app/applications?stage=${stage}`}
                className="rounded-md border border-line bg-surface-1 p-3 transition-colors hover:bg-surface-3"
              >
                <StageBadge stage={stage} />
                <p className="mt-3 text-2xl font-semibold tabular">
                  {dashboard.stageCounts[stage]}
                </p>
                <p className="text-xs text-ink-500">{STAGE_LABELS[stage]}</p>
              </Link>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Panel title="Needs attention">
            <div className="grid gap-3">
              {dashboard.attentionItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-md border border-line bg-surface-1 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.count} {item.label}
                    </p>
                    <p className="text-xs text-ink-500">{item.detail}</p>
                  </div>
                  <span className="font-mono text-lg tabular">{item.count}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Due this week">
            {dashboard.dueThisWeek.length ? (
              <div className="grid gap-2">
                {dashboard.dueThisWeek.map((item) => (
                  <Link
                    key={item.id}
                    href={
                      item.applicationId
                        ? `/app/applications/${item.applicationId}`
                        : "/app"
                    }
                    className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-1 p-3 hover:bg-surface-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-ink-500">{item.kind}</p>
                    </div>
                    <span className="font-mono text-xs text-status-warn">
                      {formatShortDate(item.dueAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No near-term due dates"
                description="Deadlines and pending reminders due within seven days will appear here."
              />
            )}
          </Panel>
        </div>

        <Panel title="Recent activity">
          {dashboard.recentActivity.length ? (
            <div className="grid gap-2">
              {dashboard.recentActivity.map((event) => (
                <Link
                  href={`/app/applications/${event.applicationId}`}
                  key={event.id}
                  className="flex items-center justify-between rounded-md border border-line bg-surface-1 p-3 hover:bg-surface-3"
                >
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-ink-500">{event.description}</p>
                    )}
                  </div>
                  <span className="font-mono text-xs text-ink-500">
                    {formatShortDate(event.eventDate)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity yet"
              description="Created applications, stage changes, resume links, reminders, and notes will populate this timeline."
            />
          )}
        </Panel>

        {reminders.some((reminder) => reminder.status === "pending") && (
          <Panel title="Reminder actions">
            <div className="grid gap-2">
              {data.reminders
                .filter((reminder) => reminder.status === "pending")
                .slice(0, 5)
                .map((reminder) => (
                  <div
                    key={reminder._id}
                    className="flex items-center justify-between rounded-md border border-line bg-surface-1 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{reminder.title}</p>
                      <p className="text-xs text-ink-500">{formatShortDate(reminder.dueAt)}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void completeReminder({ id: reminder._id })}
                    >
                      Complete
                    </Button>
                  </div>
                ))}
            </div>
          </Panel>
        )}
      </div>
    </>
  )
}

