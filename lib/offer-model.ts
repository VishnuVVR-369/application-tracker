import type { ApplicationOffer, OfferDecision } from "@/lib/application-model"

export function offerDecisionTone(
  decision: OfferDecision
): "up" | "down" | "warn" | "info" | "neutral" {
  switch (decision) {
    case "accepted":
      return "up"
    case "declined":
    case "expired":
      return "down"
    case "negotiating":
      return "info"
    case "pending":
      return "warn"
    default:
      return "neutral"
  }
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatOfferBase(offer: ApplicationOffer) {
  if (offer.baseAmount === undefined) return "—"
  const base = formatMoney(offer.baseAmount, offer.currency ?? "USD")
  return offer.period && offer.period !== "unknown" && offer.period !== "year"
    ? `${base} / ${offer.period}`
    : base
}

/** Best-effort total comp (base + bonus); equity is summarized separately. */
export function formatOfferTotal(offer: ApplicationOffer) {
  if (offer.baseAmount === undefined && offer.bonusAmount === undefined) {
    return undefined
  }
  const total = (offer.baseAmount ?? 0) + (offer.bonusAmount ?? 0)
  return formatMoney(total, offer.currency ?? "USD")
}
