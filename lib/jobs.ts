// Shared between Convex functions and the UI. Keep free of runtime-specific imports.

import { companyKey } from "./domain"

/** Job portals the Job Scout reads. */
export const PORTALS = ["linkedin", "naukri"] as const
export type Portal = (typeof PORTALS)[number]

export const PORTAL_LABELS: Record<Portal, string> = { linkedin: "LinkedIn", naukri: "Naukri" }

export const FEEDS = ["recommended", "saved_search", "alert"] as const
export type Feed = (typeof FEEDS)[number]

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const
export type WorkMode = (typeof WORK_MODES)[number]

export const WORK_MODE_LABELS: Record<WorkMode, string> = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" }

/** Quick reasons offered when dismissing a job. Free text is allowed too. */
export const DISMISS_REASONS = ["Not my level", "Wrong role", "Location", "Company", "Pay", "Already applied"] as const

/** Page text is kept for re-extraction, up to this size per posting. */
export const MAX_PAGE_TEXT = 100_000
/** A description shorter than this is almost always a card or a login wall, not a posting. */
export const MIN_DESCRIPTION_LENGTH = 200
/** Postings found on another portal join a job collected in this window. */
export const DEDUPE_WINDOW_MS = 60 * 24 * 60 * 60 * 1000
/** Descriptions at least this similar (word-shingle Jaccard) are the same job. */
export const SAME_JOB_SIMILARITY = 0.5

const LINKEDIN_VIEW = /^\/jobs\/view\/(?:[^/]*?-)?(\d{6,})\/?$/
const NAUKRI_LISTING = /^\/job-listings-[^/]*?-(\d{6,})\/?$/

/** A portal posting's id and canonical address, from any link to it, or null for other links. */
export function postingFromUrl(raw: string): { portal: Portal; postingId: string; url: string } | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    const id = url.pathname.match(LINKEDIN_VIEW)?.[1] ?? url.searchParams.get("currentJobId")
    if (!id || !/^\d{6,}$/.test(id)) return null
    return { portal: "linkedin", postingId: id, url: `https://www.linkedin.com/jobs/view/${id}/` }
  }
  if (host === "naukri.com" || host.endsWith(".naukri.com")) {
    const match = url.pathname.match(NAUKRI_LISTING)
    if (!match) return null
    return { portal: "naukri", postingId: match[1], url: `https://www.naukri.com${url.pathname.replace(/\/$/, "")}` }
  }
  return null
}

/** "Senior Backend Engineer (m/f/d) - Payments" and "senior backend engineer, payments" compare equal. */
export function roleKey(role: string) {
  return role
    .toLowerCase()
    .replace(/\((?:[mfwdx]\s*\/\s*)+[mfwdx]\)/g, " ")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .trim()
}

/** The same company and role, whatever the portal or punctuation. Cities are compared separately. */
export function dedupeKey(company: string, role: string) {
  return `${companyKey(company)}|${roleKey(role)}`
}

/** The city part of a location, lowercase, or "" when there is none to compare. */
export function cityKey(location: string | undefined) {
  const first = (location ?? "").split(/[,(/|]/)[0]
  const city = first
    .toLowerCase()
    .replace(/[^\p{L}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
  return city === "remote" || city === "anywhere" ? "" : city
}

/** Unknown cities never rule a match out; known ones must agree ("Bengaluru" and "Bengaluru Urban" do). */
export function citiesCompatible(a: string | undefined, b: string | undefined) {
  const left = cityKey(a)
  const right = cityKey(b)
  return !left || !right || left.includes(right) || right.includes(left)
}

function shingles(text: string, size = 3) {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  const set = new Set<string>()
  if (words.length < size) {
    if (words.length) set.add(words.join(" "))
    return set
  }
  for (let index = 0; index + size <= words.length; index++) set.add(words.slice(index, index + size).join(" "))
  return set
}

/** How much two descriptions overlap, from 0 to 1. */
export function descriptionSimilarity(a: string, b: string) {
  const left = shingles(a)
  const right = shingles(b)
  if (!left.size || !right.size) return 0
  let shared = 0
  for (const item of left) if (right.has(item)) shared++
  return shared / (left.size + right.size - shared)
}

function comparable(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[\s\u2022\u25cf\u25cb\u25e6\u25aa\u25a0\u2013\u2014*\u00b7-]+/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
}

/** Whether every line of an extracted description appears in the page, ignoring list markers and spacing. */
export function isQuotedFrom(pageText: string, description: string) {
  const page = comparable(pageText)
  const lines = description
    .split("\n")
    .map((line) => comparable(line))
    .filter(Boolean)
  return lines.length > 0 && lines.every((line) => page.includes(line))
}
