import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-2",
        "after:absolute after:inset-0 after:-translate-x-full after:bg-linear-to-r after:from-transparent after:via-ink-500/10 after:to-transparent after:[animation:shimmer_1.6s_infinite]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
