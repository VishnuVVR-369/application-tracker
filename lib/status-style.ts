import type { ApplicationStatus, Outcome, ReferralStatus } from "@/lib/domain"

export const STATUS_DOT: Record<ApplicationStatus, string> = {
  saved: "bg-zinc-400 dark:bg-zinc-500",
  applied: "bg-signal",
  in_progress: "bg-amber-500",
  closed: "bg-emerald-500",
}

export const OUTCOME_BADGE: Record<Outcome, string> = {
  offer: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
  ghosted: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-400",
  withdrawn: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-400",
}

export const REFERRAL_BADGE: Record<ReferralStatus, string> = {
  to_ask: "bg-zinc-500/12 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  asked: "bg-sky-500/12 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  referred: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  declined: "bg-rose-500/12 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  no_reply: "bg-zinc-500/12 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
}

export const FOLLOW_UP_TEXT = "text-amber-700 dark:text-amber-400"
