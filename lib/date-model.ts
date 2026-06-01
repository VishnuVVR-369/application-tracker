export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function formatShortDate(dateIso?: string) {
  if (!dateIso) {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateIso))
}

export function daysBetween(startIso?: string, endIso?: string) {
  if (!startIso || !endIso) {
    return undefined
  }

  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()

  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)))
}

export function isDateInRange(dateIso: string | undefined, startIso: string, endIso: string) {
  if (!dateIso) {
    return false
  }

  const value = new Date(dateIso).getTime()
  return value >= new Date(startIso).getTime() && value <= new Date(endIso).getTime()
}
