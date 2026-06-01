import Link from "next/link"
import { AlertCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  type ApplicationStage,
} from "@/lib/application-model"
import { cn } from "@/lib/utils"

const stageClasses: Record<ApplicationStage, string> = {
  saved: "border-stage-saved/50 bg-stage-saved/10 text-stage-saved",
  applied: "border-stage-applied/50 bg-stage-applied/10 text-stage-applied",
  phone_screen: "border-stage-phone/50 bg-stage-phone/10 text-stage-phone",
  interview: "border-stage-interview/50 bg-stage-interview/10 text-stage-interview",
  offer: "border-stage-offer/50 bg-stage-offer/10 text-stage-offer",
  closed: "border-stage-closed/50 bg-stage-closed/10 text-stage-closed",
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow && <p className="micro-label mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-300">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Panel({
  title,
  label,
  action,
  children,
  className,
}: {
  title: string
  label?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface-2", className)}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4">
        <div>
          {label && <p className="micro-label">{label}</p>}
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function StageBadge({ stage }: { stage: ApplicationStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        stageClasses[stage]
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  )
}

export function EmptyState({
  title,
  description,
  href,
  actionLabel,
}: {
  title: string
  description: string
  href?: string
  actionLabel?: string
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface-1 p-8 text-center">
      <AlertCircle className="mb-3 size-5 text-ink-500" />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-300">{description}</p>
      {href && actionLabel && (
        <Button asChild className="mt-4">
          <Link href={href}>
            <Plus className="size-4" />
            {actionLabel}
          </Link>
        </Button>
      )}
    </div>
  )
}

export function LoadingPanels() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-36 rounded-lg" />
      ))}
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
      <div
        className="h-full rounded-full bg-brand"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function StageSelect({
  value,
  onChange,
  className,
}: {
  value: ApplicationStage
  onChange: (stage: ApplicationStage) => void
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ApplicationStage)}
      className={cn(
        "h-8 rounded-md border border-line bg-surface-1 px-2 text-sm text-ink-100 outline-none focus:ring-3 focus:ring-ring/50",
        className
      )}
    >
      {APPLICATION_STAGES.map((stage) => (
        <option key={stage} value={stage}>
          {STAGE_LABELS[stage]}
        </option>
      ))}
    </select>
  )
}

export function NativeSelect<TValue extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: TValue | ""
  onChange: (value: TValue | "") => void
  options: Array<{ value: TValue; label: string }>
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TValue | "")}
      className={cn(
        "h-9 rounded-md border border-line bg-surface-1 px-2 text-sm text-ink-100 outline-none focus:ring-3 focus:ring-ring/50",
        className
      )}
    >
      <option value="">Any</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
