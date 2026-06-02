"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/* Shared form primitives used across every create/edit sheet so the whole app
   speaks one visual language for inputs. */

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {hint && <span className="text-[11px] font-normal text-ink-500">{hint}</span>}
      </Label>
      {children}
    </div>
  )
}

export function NativeSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-8 rounded-md border border-line bg-surface-1 px-2 text-sm text-ink-100 outline-none transition-colors hover:border-line-strong focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      {children}
    </select>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="micro-label mt-1 flex items-center gap-2 first:mt-0">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </p>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="rounded-md border border-status-down/30 bg-status-down/10 px-3 py-2 text-sm text-status-down">
      {message}
    </p>
  )
}
