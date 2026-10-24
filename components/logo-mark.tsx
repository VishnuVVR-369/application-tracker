import { cn } from "@/lib/utils"

/** Three filled slots and one open one: the weekly goal the board is built around. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("size-4", className)}>
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect
        x="9.6"
        y="9.6"
        width="4.8"
        height="4.8"
        rx="1.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="1.6 1.2"
        opacity="0.75"
      />
    </svg>
  )
}
