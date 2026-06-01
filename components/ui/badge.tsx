import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // §5: badges use --r-sm (not pill).
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",

        // §6 status badges — hue at ~15% bg, full-strength text + border.
        accent: "border-primary/30 bg-brand-weak text-primary",
        success: "border-status-up/30 bg-status-up/15 text-status-up",
        warn: "border-status-warn/30 bg-status-warn/15 text-status-warn",
        danger: "border-status-down/30 bg-status-down/15 text-status-down",
        info: "border-status-info/30 bg-status-info/15 text-status-info",

        // §3 stage badges — per-stage hue at ~12–15% bg, full-strength text/border.
        saved: "border-stage-saved/30 bg-stage-saved/15 text-stage-saved",
        applied: "border-stage-applied/30 bg-stage-applied/15 text-stage-applied",
        phone_screen: "border-stage-phone/30 bg-stage-phone/15 text-stage-phone",
        interview:
          "border-stage-interview/30 bg-stage-interview/15 text-stage-interview",
        offer: "border-stage-offer/30 bg-stage-offer/15 text-stage-offer",
        closed: "border-stage-closed/30 bg-stage-closed/15 text-stage-closed",
        // closed + rejected outcome reads in the danger hue (§3).
        rejected: "border-status-down/30 bg-status-down/15 text-status-down",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
