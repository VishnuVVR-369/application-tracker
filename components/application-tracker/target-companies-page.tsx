"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import {
  Archive,
  ArchiveRestore,
  Building2,
  Clock4,
  Mail,
  MailPlus,
  MessageSquare,
  Pencil,
  PhoneCall,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  UserRoundPlus,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  REFERRAL_OUTREACH_SOURCE_LABELS,
  REFERRAL_OUTREACH_STATUS_LABELS,
  REFERRAL_OUTREACH_STATUSES,
  TARGET_COMPANY_STATUS_LABELS,
  TARGET_COMPANY_STATUSES,
  TARGET_COMPANY_TIER_LABELS,
  TARGET_COMPANY_TIERS,
  type ReferralOutreachStatus,
  type TargetCompanyStatus,
  type TargetCompanyTier,
} from "@/lib/application-model"
import { daysBetween, formatShortDate, toDateKey } from "@/lib/date-model"
import { buildReferralModel } from "@/lib/referral-model"
import { buildTargetCompanyModel } from "@/lib/target-company-model"
import { cn } from "@/lib/utils"
import { Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, PageHeader, Panel } from "./common"
import { PageSkeleton } from "./skeletons"
import { mapApplication, mapReferralOutreach, mapTargetCompany } from "./data-mappers"
import { OutreachFormSheet } from "./outreach-form-sheet"
import { RequiredSelect, TargetFormSheet } from "./target-form-sheet"
import { useAppData } from "./use-app-data"

type TargetRow = ReturnType<typeof buildTargetCompanyModel>["rows"][number]

const TIER_META: Record<TargetCompanyTier, { icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  dream: { icon: Sparkles, accent: "brand" },
  strong: { icon: TrendingUp, accent: "status-info" },
  backup: { icon: ShieldCheck, accent: "ink-500" },
}

const OUTREACH_STATUS_META: Record<
  ReferralOutreachStatus,
  { icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  not_contacted: { icon: UserRoundPlus, accent: "ink-500" },
  messaged: { icon: Mail, accent: "status-info" },
  replied: { icon: MessageSquare, accent: "brand" },
  call_booked: { icon: PhoneCall, accent: "stage-interview" },
  referred: { icon: UserCheck, accent: "status-up" },
  declined: { icon: XCircle, accent: "status-down" },
}

export function TargetCompaniesPage() {
  const { data, isLoading } = useAppData()
  const updateCompany = useMutation(api.targets.updateCompany)
  const updateOutreach = useMutation(api.targets.updateOutreach)

  const [addTargetOpen, setAddTargetOpen] = React.useState(false)
  const [addTargetTier, setAddTargetTier] = React.useState<TargetCompanyTier>("dream")
  const [editingTarget, setEditingTarget] = React.useState<Doc<"targetCompanies"> | null>(null)
  const [addOutreachOpen, setAddOutreachOpen] = React.useState(false)
  const [addOutreachTargetId, setAddOutreachTargetId] = React.useState<string | undefined>(undefined)
  const [editingOutreach, setEditingOutreach] = React.useState<Doc<"referralOutreach"> | null>(null)

  if (isLoading) return <PageSkeleton action stats={4} columns="1fr" panels={4} />
  if (!data) {
    return <EmptyState title="Targets unavailable" description="Sign in to load target companies." />
  }

  const targets = data.targetCompanies.map(mapTargetCompany)
  const outreach = data.referralOutreach.map(mapReferralOutreach)
  const applications = data.applications.map(mapApplication)
  const targetModel = buildTargetCompanyModel({ targets, outreach, applications })
  const todayKey = toDateKey(new Date())
  const referralModel = buildReferralModel(outreach, todayKey)

  const archivedTargets = data.targetCompanies.filter((target) => target.archived)
  const activeOutreachDocs = data.referralOutreach.filter((item) => !item.archived)

  function openAddTarget(tier: TargetCompanyTier = "dream") {
    setAddTargetTier(tier)
    setAddTargetOpen(true)
  }

  function openAddOutreach(targetCompanyId?: string) {
    setAddOutreachTargetId(targetCompanyId)
    setAddOutreachOpen(true)
  }

  async function handleStatusChange(target: Doc<"targetCompanies">, status: TargetCompanyStatus) {
    try {
      await updateCompany({ id: target._id, status })
      toast.success(`${target.companyName} moved to ${TARGET_COMPANY_STATUS_LABELS[status]}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update target status")
    }
  }

  async function handleArchive(target: Doc<"targetCompanies">) {
    try {
      await updateCompany({ id: target._id, archived: true })
      toast.success(`${target.companyName} archived`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not archive target")
    }
  }

  async function handleRestore(target: Doc<"targetCompanies">) {
    try {
      await updateCompany({ id: target._id, archived: false })
      toast.success(`${target.companyName} restored`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not restore target")
    }
  }

  async function handleOutreachStatusChange(item: Doc<"referralOutreach">, status: ReferralOutreachStatus) {
    try {
      await updateOutreach({ id: item._id, status })
      toast.success(`${item.contactName} marked ${REFERRAL_OUTREACH_STATUS_LABELS[status]}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update referral status")
    }
  }

  const hasAnyTargets = targetModel.rows.length > 0 || archivedTargets.length > 0

  return (
    <>
      <PageHeader
        eyebrow="Targets"
        title="Target company pipeline"
        description="Manage dream/strong/backup companies before applying, warm referrals, and decide where your next high-leverage effort goes."
        action={
          <Button onClick={() => openAddTarget("dream")}>
            <Building2 className="size-4" /> Add target
          </Button>
        }
      />

      <Stagger className="grid gap-6">
        <StaggerItem>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Targets" value={targetModel.summary.total} />
            <Stat label="Dream" value={targetModel.summary.dream} />
            <Stat label="Ready" value={targetModel.summary.ready} />
            <Stat label="Referral gaps" value={targetModel.summary.referralGaps} warn />
          </div>
        </StaggerItem>

        {!hasAnyTargets ? (
          <StaggerItem>
            <EmptyState
              icon={Target}
              title="No target companies yet"
              description="Add your dream/strong/backup companies first, then warm referrals before applying."
              action={
                <Button onClick={() => openAddTarget("dream")}>
                  <Building2 className="size-4" /> Add target
                </Button>
              }
            />
          </StaggerItem>
        ) : (
          <StaggerItem>
            <div className="grid gap-5">
              {TARGET_COMPANY_TIERS.map((tier) => {
                const rows = targetModel.rows.filter((row) => row.target.tier === tier)
                const meta = TIER_META[tier]
                return (
                  <Lane
                    key={tier}
                    icon={meta.icon}
                    title={`${TARGET_COMPANY_TIER_LABELS[tier]} companies`}
                    accent={meta.accent}
                    count={rows.length}
                    action={
                      <Button variant="ghost" size="xs" onClick={() => openAddTarget(tier)}>
                        <Plus className="size-3.5" /> Add
                      </Button>
                    }
                  >
                    {rows.length ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {rows.map((row) => {
                          const doc = data.targetCompanies.find((item) => item._id === row.target.id)
                          if (!doc) return null
                          return (
                            <TargetCard
                              key={row.target.id}
                              row={row}
                              onEdit={() => setEditingTarget(doc)}
                              onArchive={() => void handleArchive(doc)}
                              onLogOutreach={() => openAddOutreach(doc._id)}
                              onStatusChange={(status) => void handleStatusChange(doc, status)}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <LaneEmpty
                        icon={meta.icon}
                        text={`No ${TARGET_COMPANY_TIER_LABELS[tier].toLowerCase()} targets yet.`}
                      />
                    )}
                  </Lane>
                )
              })}

              {archivedTargets.length > 0 && (
                <Lane icon={Archive} title="Archived" accent="ink-500" count={archivedTargets.length}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {archivedTargets.map((target) => (
                      <div
                        key={target._id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-surface-1/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-ink-300">{target.companyName}</p>
                          <p className="text-xs text-ink-500">{TARGET_COMPANY_TIER_LABELS[target.tier]} · archived</p>
                        </div>
                        <Button variant="secondary" size="xs" onClick={() => void handleRestore(target)}>
                          <ArchiveRestore className="size-3.5" /> Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                </Lane>
              )}
            </div>
          </StaggerItem>
        )}

        <StaggerItem>
          <OutreachPipeline
            outreachDocs={activeOutreachDocs}
            referralModel={referralModel}
            targets={data.targetCompanies}
            todayKey={todayKey}
            onEdit={(doc) => setEditingOutreach(doc)}
            onStatusChange={(doc, status) => void handleOutreachStatusChange(doc, status)}
            onAdd={() => openAddOutreach(undefined)}
          />
        </StaggerItem>
      </Stagger>

      {/* Create / edit sheets (controlled) */}
      <TargetFormSheet open={addTargetOpen} onOpenChange={setAddTargetOpen} defaultTier={addTargetTier} />
      {editingTarget && (
        <TargetFormSheet
          target={editingTarget}
          open={Boolean(editingTarget)}
          onOpenChange={(open) => !open && setEditingTarget(null)}
        />
      )}
      <OutreachFormSheet
        targets={data.targetCompanies}
        applications={data.applications}
        defaultTargetCompanyId={addOutreachTargetId}
        open={addOutreachOpen}
        onOpenChange={setAddOutreachOpen}
      />
      {editingOutreach && (
        <OutreachFormSheet
          outreach={editingOutreach}
          targets={data.targetCompanies}
          applications={data.applications}
          open={Boolean(editingOutreach)}
          onOpenChange={(open) => !open && setEditingOutreach(null)}
        />
      )}
    </>
  )
}

/* ── Tier lanes ───────────────────────────────────────────────────────── */

function TargetCard({
  row,
  onEdit,
  onArchive,
  onLogOutreach,
  onStatusChange,
}: {
  row: TargetRow
  onEdit: () => void
  onArchive: () => void
  onLogOutreach: () => void
  onStatusChange: (status: TargetCompanyStatus) => void
}) {
  const { target, readiness, referralProgress } = row

  return (
    <StaggerItem>
      <div className="glass rounded-xl border border-line/70 p-4 transition-colors hover:border-line-strong">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-3/70 text-ink-300">
              <Building2 className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{target.companyName}</p>
              <p className="micro-label">{TARGET_COMPANY_TIER_LABELS[target.tier]}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={`Log outreach for ${target.companyName}`} onClick={onLogOutreach}>
              <MailPlus className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${target.companyName}`} onClick={onEdit}>
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Archive ${target.companyName}`} onClick={onArchive}>
              <Archive className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <RequiredSelect
            ariaLabel={`Status for ${target.companyName}`}
            value={target.status}
            onChange={onStatusChange}
            options={TARGET_COMPANY_STATUSES.map((status) => ({
              value: status,
              label: TARGET_COMPANY_STATUS_LABELS[status],
            }))}
            className="h-8 w-full bg-surface-1 text-xs"
          />
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            {target.targetRoles.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {target.targetRoles.map((role) => (
                  <span key={role} className="rounded-md border border-line bg-surface-1 px-2 py-1 text-xs text-ink-300">
                    {role}
                  </span>
                ))}
              </div>
            )}
            <p className="line-clamp-2 text-sm leading-relaxed text-ink-300">
              {target.researchNotes || target.notes || "No research notes yet — add hiring-bar and interview-process details in Edit."}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniMetric label="Priority" value={target.priorityScore} />
              <MiniMetric label="Fit" value={target.roleFitScore} />
              <MiniMetric label="Warm" value={referralProgress.warm} />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-1">
            <ReadinessRing score={readiness} />
            <p className="text-[10px] uppercase tracking-wide text-ink-500">Ready</p>
          </div>
        </div>
      </div>
    </StaggerItem>
  )
}

function ReadinessRing({ score, size = 68 }: { score: number; size?: number }) {
  const radius = 15.5
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" style={{ width: size, height: size }} className="-rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
          style={{ filter: "drop-shadow(0 0 4px color-mix(in oklch, var(--brand) 60%, transparent))" }}
        />
      </svg>
      <span className="absolute font-mono text-sm font-semibold tabular">{score}</span>
    </div>
  )
}

/* ── Referral outreach pipeline ──────────────────────────────────────── */

function OutreachPipeline({
  outreachDocs,
  referralModel,
  targets,
  todayKey,
  onEdit,
  onStatusChange,
  onAdd,
}: {
  outreachDocs: Doc<"referralOutreach">[]
  referralModel: ReturnType<typeof buildReferralModel>
  targets: Doc<"targetCompanies">[]
  todayKey: string
  onEdit: (doc: Doc<"referralOutreach">) => void
  onStatusChange: (doc: Doc<"referralOutreach">, status: ReferralOutreachStatus) => void
  onAdd: () => void
}) {
  const targetNameById = new Map(targets.map((target) => [target._id, target.companyName]))
  const dueFollowUps = outreachDocs
    .filter(
      (doc) =>
        doc.followUpDate !== undefined &&
        doc.followUpDate <= todayKey &&
        doc.status !== "referred" &&
        doc.status !== "declined"
    )
    .sort((a, b) => String(a.followUpDate).localeCompare(String(b.followUpDate)))

  return (
    <Panel
      title="Referral pipeline"
      label="Outreach grouped by stage"
      icon={UserRoundPlus}
      action={
        <Button size="sm" onClick={onAdd}>
          <MailPlus className="size-4" /> Log outreach
        </Button>
      }
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap gap-2">
          <StatChip label="contacted" value={String(referralModel.metrics.contacted)} />
          <StatChip
            label="reply rate"
            value={`${referralModel.metrics.replyRate}%`}
            tone={referralModel.metrics.replyRate >= 30 ? "up" : undefined}
          />
          <StatChip
            label="referral rate"
            value={`${referralModel.metrics.referralRate}%`}
            tone={referralModel.metrics.referralRate >= 20 ? "up" : undefined}
          />
          <StatChip label="referred" value={String(referralModel.metrics.referred)} />
        </div>

        {outreachDocs.length === 0 ? (
          <EmptyState
            icon={UserRoundPlus}
            title="No referral leads yet"
            description="Log a contact to start warming a referral before you apply."
            action={
              <Button size="sm" onClick={onAdd}>
                <MailPlus className="size-4" /> Log outreach
              </Button>
            }
          />
        ) : (
          <>
            {dueFollowUps.length > 0 && (
              <div className="rounded-xl border border-status-warn/30 bg-status-warn/[0.06] p-3">
                <p className="micro-label mb-2 flex items-center gap-1.5 text-status-warn">
                  <Clock4 className="size-3.5" /> Due follow-ups
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {dueFollowUps.map((doc) => (
                    <button
                      key={doc._id}
                      type="button"
                      onClick={() => onEdit(doc)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-1 p-2.5 text-left text-sm transition-colors hover:border-status-warn/40"
                    >
                      <span className="min-w-0 truncate">
                        {doc.contactName}
                        {doc.targetCompanyId && targetNameById.get(doc.targetCompanyId) && (
                          <span className="text-ink-500"> · {targetNameById.get(doc.targetCompanyId)}</span>
                        )}
                      </span>
                      <FollowUpBadge followUpDate={doc.followUpDate} todayKey={todayKey} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-5">
              {REFERRAL_OUTREACH_STATUSES.map((groupStatus) => {
                const docs = outreachDocs.filter((doc) => doc.status === groupStatus)
                if (docs.length === 0) return null
                const meta = OUTREACH_STATUS_META[groupStatus]
                return (
                  <Lane
                    key={groupStatus}
                    icon={meta.icon}
                    title={REFERRAL_OUTREACH_STATUS_LABELS[groupStatus]}
                    accent={meta.accent}
                    count={docs.length}
                  >
                    <div className="grid gap-2">
                      {docs.map((doc) => (
                        <OutreachRow
                          key={doc._id}
                          outreach={doc}
                          targetName={doc.targetCompanyId ? targetNameById.get(doc.targetCompanyId) : undefined}
                          todayKey={todayKey}
                          onEdit={() => onEdit(doc)}
                          onStatusChange={(nextStatus) => onStatusChange(doc, nextStatus)}
                        />
                      ))}
                    </div>
                  </Lane>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}

function OutreachRow({
  outreach,
  targetName,
  todayKey,
  onEdit,
  onStatusChange,
}: {
  outreach: Doc<"referralOutreach">
  targetName?: string
  todayKey: string
  onEdit: () => void
  onStatusChange: (status: ReferralOutreachStatus) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-1/60 p-3 transition-colors hover:border-line-strong">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {outreach.contactName}
          {outreach.contactRole && <span className="text-ink-500"> · {outreach.contactRole}</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-500">
          <span>{REFERRAL_OUTREACH_SOURCE_LABELS[outreach.source]}</span>
          {targetName && <span>· {targetName}</span>}
          {outreach.notes && <span className="min-w-0 truncate">· {outreach.notes}</span>}
        </p>
      </div>
      <FollowUpBadge followUpDate={outreach.followUpDate} todayKey={todayKey} />
      <RequiredSelect
        ariaLabel={`Status for ${outreach.contactName}`}
        value={outreach.status}
        onChange={onStatusChange}
        options={REFERRAL_OUTREACH_STATUSES.map((status) => ({
          value: status,
          label: REFERRAL_OUTREACH_STATUS_LABELS[status],
        }))}
        className="h-8 w-[9.5rem] shrink-0 bg-surface-1 text-xs"
      />
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${outreach.contactName}`} onClick={onEdit}>
        <Pencil className="size-3.5" />
      </Button>
    </div>
  )
}

function FollowUpBadge({ followUpDate, todayKey }: { followUpDate?: string; todayKey: string }) {
  if (!followUpDate) return null
  if (followUpDate > todayKey) {
    return (
      <Badge variant="outline" className="shrink-0 font-mono tabular">
        {formatShortDate(followUpDate)}
      </Badge>
    )
  }
  const days = daysBetween(followUpDate, todayKey) ?? 0
  return (
    <Badge variant={days > 0 ? "danger" : "warn"} className="shrink-0 font-mono tabular">
      {days > 0 ? `${days}d overdue` : "Due today"}
    </Badge>
  )
}

/* ── Local building blocks ───────────────────────────────────────────── */

function Lane({
  icon: Icon,
  title,
  accent,
  count,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  accent: string
  count: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <StaggerItem>
      <section>
        <div className="mb-2.5 flex items-center gap-2.5">
          <span
            className="flex size-7 items-center justify-center rounded-lg border"
            style={{
              borderColor: `color-mix(in oklch, var(--${accent}) 30%, transparent)`,
              background: `color-mix(in oklch, var(--${accent}) 12%, transparent)`,
              color: `var(--${accent})`,
            }}
          >
            <Icon className="size-4" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <span className="font-mono text-xs tabular text-ink-500">{count}</span>
          <span className="ml-1 h-px flex-1 bg-line/70" />
          {action}
        </div>
        {children}
      </section>
    </StaggerItem>
  )
}

function LaneEmpty({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-line/70 bg-surface-1/40 px-4 py-5 text-sm text-ink-500">
      <Icon className="size-4 shrink-0" />
      {text}
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="micro-label">{label}</p>
      <p className={cn("mt-2 font-mono text-2xl font-semibold tabular", warn && value > 0 && "text-status-warn")}>{value}</p>
    </div>
  )
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: "up" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
        tone === "up" ? "border-status-up/30 bg-status-up/10 text-status-up" : "border-line bg-surface-1 text-ink-300"
      )}
    >
      <span className="font-mono font-semibold tabular">{value}</span>
      <span className={tone === "up" ? "text-status-up/80" : "text-ink-500"}>{label}</span>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface-1/60 px-3 py-2">
      <p className="micro-label">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular">{value}</p>
    </div>
  )
}
