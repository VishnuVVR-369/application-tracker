// Weekly application pace, computed on the client from each card's appliedAt against the live clock.
// Weeks run Monday to Sunday in the viewer's local time zone.

export const HEATMAP_WEEKS = 15

/** Local midnight of the Monday that starts the week containing `timestamp`. */
export function startOfWeek(timestamp: number) {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date.getTime()
}

function addDays(timestamp: number, days: number) {
  const date = new Date(timestamp)
  date.setDate(date.getDate() + days)
  return date.getTime()
}

function dayKey(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

type Applied = { appliedAt?: number }

/** Applications sent since Monday, oldest first so the week's slots fill left to right. */
export function sentThisWeek<T extends Applied>(cards: T[], now: number) {
  const weekStart = startOfWeek(now)
  return cards
    .filter((card): card is T & { appliedAt: number } => card.appliedAt !== undefined && card.appliedAt >= weekStart)
    .sort((a, b) => a.appliedAt - b.appliedAt)
}

export type HeatDay = { start: number; count: number; future: boolean }

/** A weeks x 7 grid of applications sent per day, ending with the current week. */
export function activityGrid(cards: Applied[], now: number, weeks = HEATMAP_WEEKS): HeatDay[][] {
  const counts = new Map<string, number>()
  for (const { appliedAt } of cards) {
    if (appliedAt === undefined) continue
    const key = dayKey(appliedAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const firstWeek = addDays(startOfWeek(now), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const start = addDays(firstWeek, week * 7 + day)
      return { start, count: counts.get(dayKey(start)) ?? 0, future: start > now }
    }),
  )
}

/**
 * Consecutive weeks that hit the goal, counting back from this week. The current week only counts once it is
 * met, so an unfinished week never breaks a streak.
 */
export function goalStreak(cards: Applied[], goal: number, now: number) {
  const perWeek = new Map<number, number>()
  for (const { appliedAt } of cards) {
    if (appliedAt === undefined) continue
    const week = startOfWeek(appliedAt)
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1)
  }
  let week = startOfWeek(now)
  let streak = (perWeek.get(week) ?? 0) >= goal ? 1 : 0
  week = startOfWeek(addDays(week, -1))
  while ((perWeek.get(week) ?? 0) >= goal) {
    streak++
    week = startOfWeek(addDays(week, -1))
  }
  return streak
}

/** A stable hue per company so its monogram looks the same everywhere it appears. */
export function companyHue(name: string) {
  let hash = 0
  for (const char of name.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 360
}

export function monogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}
