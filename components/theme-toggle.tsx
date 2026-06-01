"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const OPTIONS = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
] as const

/**
 * Returns false during SSR and the first (hydration) render, then true — without
 * a setState-in-effect. Used to gate theme-dependent markup so it only diverges
 * from the server output after hydration.
 */
function useMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

/**
 * Quick theme toggle (docs/design.md §6 sidebar footer): an icon button that
 * opens a dark / light / system menu. Renders a stable placeholder until
 * mounted to avoid a hydration mismatch from next-themes.
 */
export function ThemeToggle() {
  const { theme = "system", setTheme } = useTheme()
  const mounted = useMounted()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="hidden [:root:not([data-theme=light])_&]:block" />
          <Moon className="hidden [[data-theme=light]_&]:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(mounted && theme === value && "text-primary")}
          >
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Segmented dark / light / system control (docs/design.md §6 Settings + §8
 * Appearance). Active segment carries the accent.
 */
export function ThemeSegmented() {
  const { theme = "system", setTheme } = useTheme()
  const mounted = useMounted()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-1 p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-brand-weak text-primary"
                : "text-ink-300 hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
