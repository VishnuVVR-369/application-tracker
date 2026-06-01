import Link from "next/link"
import { Sparkles, Plus } from "lucide-react"

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
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="micro-label mb-2 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-brand shadow-glow" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-[2rem] sm:leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Panel({
  title,
  label,
  action,
  children,
  className,
  contentClassName,
  icon: Icon,
}: {
  title: string
  label?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <section
      className={cn(
        "glass overflow-hidden rounded-xl shadow-[0_1px_0_0_color-mix(in_oklch,var(--ink-100)_4%,transparent)_inset]",
        className
      )}
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line/70 px-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex size-7 items-center justify-center rounded-md border border-line bg-surface-3/70 text-ink-300">
              <Icon className="size-3.5" />
            </span>
          )}
          <div>
            {label && <p className="micro-label">{label}</p>}
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </section>
  )
}

export function StageBadge({ stage }: { stage: ApplicationStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        stageClasses[stage]
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STAGE_LABELS[stage]}
    </span>
  )
}

export function EmptyState({
  title,
  description,
  href,
  actionLabel,
  icon: Icon = Sparkles,
}: {
  title: string
  description: string
  href?: string
  actionLabel?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="grain relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-strong/60 bg-surface-1/50 p-10 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-3xl"
      />
      <span className="relative mb-4 flex size-12 items-center justify-center rounded-xl border border-brand/30 bg-brand-weak text-brand shadow-glow">
        <Icon className="size-5" />
      </span>
      <h3 className="relative text-base font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-1.5 max-w-md text-sm leading-relaxed text-ink-300">
        {description}
      </p>
      {href && actionLabel && (
        <Button asChild className="relative mt-5">
          <Link href={href}>
            <Plus className="size-4" />
            {actionLabel}
          </Link>
        </Button>
      )}
    </div>
  )
}

export function LoadingPanels({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-36 rounded-xl" />
      ))}
    </div>
  )
}

export function ProgressBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      className={cn(
        "h-2 overflow-hidden rounded-full bg-surface-3 ring-1 ring-inset ring-line",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-brand to-status-info transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          boxShadow: pct > 0 ? "0 0 10px -1px color-mix(in oklch, var(--brand) 60%, transparent)" : undefined,
        }}
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
        "h-8 rounded-md border border-line bg-surface-1 px-2 text-sm text-ink-100 outline-none transition-colors hover:border-line-strong focus:ring-3 focus:ring-ring/50",
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
        "h-9 rounded-md border border-line bg-surface-1 px-2 text-sm text-ink-100 outline-none transition-colors hover:border-line-strong focus:ring-3 focus:ring-ring/50",
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
