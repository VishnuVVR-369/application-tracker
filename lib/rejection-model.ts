import type { ClosedOutcome, RejectionReason, RejectionStage } from "@/lib/application-model"

export const CLOSED_OUTCOME_LABELS: Record<ClosedOutcome, string> = {
  rejected: "Rejected",
  withdrew: "Withdrew",
  accepted_elsewhere: "Accepted elsewhere",
  ghosted: "Ghosted",
}

export const REJECTION_STAGE_LABELS: Record<RejectionStage, string> = {
  application_review: "Application review",
  recruiter_screen: "Recruiter screen",
  technical_screen: "Technical screen",
  onsite: "Onsite",
  offer: "Offer",
  other: "Other",
}

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  resume_mismatch: "Resume mismatch",
  experience_gap: "Experience gap",
  compensation: "Compensation",
  location: "Location",
  timing: "Timing",
  competition: "Competition",
  unknown: "Unknown",
  other: "Other",
}

export function isRejectedOutcome(outcome: ClosedOutcome | undefined) {
  return outcome === "rejected"
}
