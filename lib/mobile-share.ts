export const MOBILE_CAPTURE_STORAGE_KEY = "way2more.mobileCaptureDraft.v1"
export const MOBILE_CAPTURE_TTL_MS = 30 * 60 * 1000

const MAX_SHARED_TITLE_LENGTH = 500
const MAX_SHARED_TEXT_LENGTH = 20_000
const MAX_POSTING_URL_LENGTH = 2_048

export type MobileCaptureDraft = {
  postingUrl: string
  sharedTitle: string
  sharedText: string
  companyName: string
  roleTitle: string
  receivedAt: number
}

function bounded(value: string | null | undefined, maxLength: number) {
  return (value ?? "").trim().slice(0, maxLength)
}

function trimUrlPunctuation(value: string) {
  return value.replace(/[),.;\]}>]+$/g, "")
}

function firstHttpUrl(value: string) {
  const matches = value.match(/https?:\/\/[^\s<>"']+/gi) ?? []

  for (const match of matches) {
    const candidate = trimUrlPunctuation(match).slice(0, MAX_POSTING_URL_LENGTH)
    try {
      const parsed = new URL(candidate)
      if ((parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.username && !parsed.password) {
        return parsed.toString()
      }
    } catch {
      // Keep scanning in case a later URL is valid.
    }
  }

  return ""
}

export function inferCompanyAndRole(title: string) {
  const normalized = title.trim().replace(/\s+\|\s+LinkedIn\s*$/i, "")
  const hiringMatch = normalized.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+.+)?$/i)
  if (hiringMatch) {
    return { companyName: hiringMatch[1].trim(), roleTitle: hiringMatch[2].trim() }
  }

  const atMatch = normalized.match(/^(.+?)\s+at\s+(.+)$/i)
  if (atMatch) {
    return { companyName: atMatch[2].trim(), roleTitle: atMatch[1].trim() }
  }

  return { companyName: "", roleTitle: "" }
}

export function parseAndroidShare(
  input: { title?: string | null; text?: string | null; url?: string | null },
  receivedAt = Date.now()
): MobileCaptureDraft {
  const sharedTitle = bounded(input.title, MAX_SHARED_TITLE_LENGTH)
  const sharedText = bounded(input.text, MAX_SHARED_TEXT_LENGTH)
  const explicitUrl = bounded(input.url, MAX_POSTING_URL_LENGTH)
  const postingUrl = firstHttpUrl(explicitUrl) || firstHttpUrl(sharedText) || firstHttpUrl(sharedTitle)
  const inferred = inferCompanyAndRole(sharedTitle)

  return {
    postingUrl,
    sharedTitle,
    sharedText,
    companyName: inferred.companyName,
    roleTitle: inferred.roleTitle,
    receivedAt,
  }
}

export function isFreshMobileCaptureDraft(
  value: unknown,
  now = Date.now()
): value is MobileCaptureDraft {
  if (!value || typeof value !== "object") return false
  const draft = value as Partial<MobileCaptureDraft>
  return (
    typeof draft.postingUrl === "string" &&
    typeof draft.sharedTitle === "string" &&
    typeof draft.sharedText === "string" &&
    typeof draft.companyName === "string" &&
    typeof draft.roleTitle === "string" &&
    draft.postingUrl.length <= MAX_POSTING_URL_LENGTH &&
    draft.sharedTitle.length <= MAX_SHARED_TITLE_LENGTH &&
    draft.sharedText.length <= MAX_SHARED_TEXT_LENGTH &&
    draft.companyName.length <= MAX_SHARED_TITLE_LENGTH &&
    draft.roleTitle.length <= MAX_SHARED_TITLE_LENGTH &&
    typeof draft.receivedAt === "number" &&
    Number.isFinite(draft.receivedAt) &&
    draft.receivedAt <= now + 60_000 &&
    now - draft.receivedAt <= MOBILE_CAPTURE_TTL_MS
  )
}

export function safeAppCallback(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/app"
  }

  try {
    const base = "https://way2more.invalid"
    const parsed = new URL(value, base)
    if (parsed.origin !== base || (parsed.pathname !== "/app" && !parsed.pathname.startsWith("/app/"))) {
      return "/app"
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return "/app"
  }
}
