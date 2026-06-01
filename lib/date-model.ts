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

export function dateValueToDate(value?: string | number | Date) {
  if (value === undefined) {
    return undefined
  }
  if (value instanceof Date) {
    return value
  }
  if (typeof value === "number") {
    return new Date(value)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`)
  }
  return new Date(value)
}

export function formatShortDate(value?: string | number | Date) {
  const date = dateValueToDate(value)
  if (!date || Number.isNaN(date.getTime())) {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

export function daysBetween(start?: string | number | Date, end?: string | number | Date) {
  const startDate = dateValueToDate(start)
  const endDate = dateValueToDate(end)
  if (!startDate || !endDate) {
    return undefined
  }

  return Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  )
}

export function isDateInRange(
  value: string | number | Date | undefined,
  start: string | number | Date,
  end: string | number | Date
) {
  const date = dateValueToDate(value)
  const startDate = dateValueToDate(start)
  const endDate = dateValueToDate(end)
  if (!date || !startDate || !endDate) {
    return false
  }

  return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime()
}

export function dateKeyFromTimestamp(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}
