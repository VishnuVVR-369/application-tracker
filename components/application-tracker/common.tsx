import Link from "next/link"
import { Sparkles, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  type ApplicationStage,
} from "@/lib/application-model"
import { cn } from "@/lib/utils"

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

export function StageBadge({
  stage,
  className,
}: {
  stage: ApplicationStage
  className?: string
}) {
  return (
    <Badge variant={stage} className={cn("gap-1.5", className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {STAGE_LABELS[stage]}
    </Badge>
  )
}

export function EmptyState({
  title,
  description,
  href,
  actionLabel,
  action,
  icon: Icon = Sparkles,
}: {
  title: string
  description: string
  href?: string
  actionLabel?: string
  action?: React.ReactNode
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
      {action ? (
        <div className="relative mt-5">{action}</div>
      ) : (
        href &&
        actionLabel && (
          <Button asChild className="relative mt-5">
            <Link href={href}>
              <Plus className="size-4" />
              {actionLabel}
            </Link>
          </Button>
        )
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
    <Select value={value} onValueChange={(next) => onChange(next as ApplicationStage)}>
      <SelectTrigger
        aria-label="Move to stage"
        className={cn("h-8 w-full bg-surface-1", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APPLICATION_STAGES.map((stage) => (
          <SelectItem key={stage} value={stage}>
            {STAGE_LABELS[stage]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Radix Select forbids an empty-string item value, so the "all" option uses a
// sentinel that maps back to "" through the onChange boundary.
const FILTER_ALL = "__all__"

export function FilterSelect<TValue extends string>({
  value,
  onChange,
  options,
  placeholder = "Any",
  className,
}: {
  value: TValue | ""
  onChange: (value: TValue | "") => void
  options: Array<{ value: TValue; label: string }>
  placeholder?: string
  className?: string
}) {
  return (
    <Select
      value={value === "" ? FILTER_ALL : value}
      onValueChange={(next) => onChange(next === FILTER_ALL ? "" : (next as TValue))}
    >
      <SelectTrigger
        aria-label={placeholder}
        className={cn(
          "h-9 min-w-[8.5rem] bg-surface-1",
          value !== "" && "border-brand/40 text-brand",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FILTER_ALL}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
