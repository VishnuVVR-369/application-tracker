import { companyHue, monogram } from "@/lib/momentum"
import { cn } from "@/lib/utils"

/** A company's initials on its own stable hue, so the same company is recognisable across the board. */
export function CompanyMark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ "--hue": companyHue(name) } as React.CSSProperties}
      className={cn(
        "monogram flex size-8 shrink-0 items-center justify-center rounded-md font-display text-[13px] font-semibold tracking-tight select-none",
        className,
      )}
    >
      {monogram(name)}
    </span>
  )
}
