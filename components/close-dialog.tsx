"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OUTCOME_LABELS, OUTCOMES, type Outcome } from "@/lib/domain"
import { OUTCOME_BADGE } from "@/lib/status-style"
import { cn } from "@/lib/utils"

const HINTS: Record<Outcome, string> = {
  offer: "You got an offer",
  rejected: "They said no",
  ghosted: "They stopped responding",
  withdrawn: "You pulled out",
}

/** Asks how an application ended before moving it to Closed. */
export function CloseDialog({
  open,
  title,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title?: string
  onCancel: () => void
  onConfirm: (outcome: Outcome) => void
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  function close() {
    setOutcome(null)
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Close application</DialogTitle>
          <DialogDescription>{title ? `How did ${title} end?` : "How did it end?"}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Outcome">
          {OUTCOMES.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={outcome === value}
              onClick={() => setOutcome(value)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60",
                outcome === value && "border-foreground/40 bg-muted ring-1 ring-foreground/20",
              )}
            >
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", OUTCOME_BADGE[value])}>
                {OUTCOME_LABELS[value]}
              </span>
              <span className="text-xs text-muted-foreground">{HINTS[value]}</span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!outcome}
            onClick={() => {
              if (!outcome) return
              setOutcome(null)
              onConfirm(outcome)
            }}
          >
            Close application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
