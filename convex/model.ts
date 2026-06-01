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
