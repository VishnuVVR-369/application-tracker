import type { Doc } from "./_generated/dataModel"

export function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase() || undefined
}

export function canonicalizeUrl(value: string | undefined) {
  if (!value?.trim()) {
    return undefined
  }

  try {
    const url = new URL(value.trim())
    url.hash = ""
    url.searchParams.sort()
    const pathname = url.pathname.replace(/\/+$/, "")
    url.pathname = pathname || "/"
    return url.toString()
  } catch {
    return value.trim()
  }
}

const TRACKING_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "msclkid",
])

export function canonicalizePostingUrl(value: string | undefined) {
  if (!value?.trim()) return undefined

  try {
    const url = new URL(value.trim())
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return undefined
    }

    const hostname = url.hostname.toLowerCase().replace(/^m\./, "www.")
    const isLinkedIn = hostname === "linkedin.com" || hostname === "www.linkedin.com"
    if (isLinkedIn) {
      const pathJobId = url.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d{5,})(?:\/|$)/)?.[1]
      const queryJobId = url.searchParams.get("currentJobId") ?? url.searchParams.get("jobId")
      const jobId = pathJobId ?? queryJobId?.match(/^\d{5,}$/)?.[0]
      if (jobId) return `https://www.linkedin.com/jobs/view/${jobId}`
    }

    url.hash = ""
    for (const key of [...url.searchParams.keys()]) {
      const normalizedKey = key.toLowerCase()
      if (normalizedKey.startsWith("utm_") || TRACKING_QUERY_KEYS.has(normalizedKey)) {
        url.searchParams.delete(key)
      }
    }
    url.searchParams.sort()
    url.pathname = url.pathname.replace(/\/+$/, "") || "/"
    return url.toString()
  } catch {
    return undefined
  }
}

export function getDomain(value: string | undefined) {
  const canonical = canonicalizeUrl(value)
  if (!canonical) {
    return undefined
  }

  try {
    return new URL(canonical).hostname.replace(/^www\./, "")
  } catch {
    return undefined
  }
}

export function dateKeyFromTimestamp(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

export function removeUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined)
  ) as Partial<T>
}

export function buildResumeSnapshot(resume: Doc<"resumes">) {
  return {
    label: resume.label,
    fileName: resume.fileName,
    storageId: resume.storageId,
    mimeType: resume.mimeType,
    sizeBytes: resume.sizeBytes,
  }
}
