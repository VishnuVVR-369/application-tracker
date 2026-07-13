import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type ApplicationTrackerMarkProps = ComponentProps<"svg"> & {
  title?: string
}

/**
 * A small, resilient mark for the job-search workflow: three stages joined by
 * a single rising path. It remains recognizable from a 16px navigation icon
 * through to the browser favicon.
 */
export function ApplicationTrackerMark({
  className,
  title,
  ...props
}: ApplicationTrackerMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={cn("shrink-0", className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M4.5 17.25V14.5M10.5 17.25v-5.5M16.5 17.25V7.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.5 11.5 10.5 8l6-4.5M13.6 3.5h2.9v2.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 19.5h15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
