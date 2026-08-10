import type {
  CaptureDiagnostics,
  CapturedJob,
  CompensationPeriod,
  WorkArrangement,
} from "./types"

type JsonLdJobPosting = {
  "@type"?: string | string[]
  title?: string
  description?: string
  hiringOrganization?: { name?: string }
  jobLocation?: { address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } } | Array<{ address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } }>
  jobLocationType?: string
  baseSalary?: {
    currency?: string
    value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string }
  }
}

const BLOCK_TAGS = /<\/?(?:p|div|h[1-6]|li|ul|ol|br|section|article)\b[^>]*>/gi
const TAGS = /<[^>]+>/g
function text(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, " ").trim() || undefined
}

function firstText(document: Document, selectors: string[]) {
  for (const selector of selectors) {
    const value = text(document.querySelector(selector))
    if (value) return value
  }
  return undefined
}

function meta(document: Document, property: string) {
  return document.querySelector<HTMLMetaElement>(`meta[property="${property}"], meta[name="${property}"]`)?.content?.trim() || undefined
}

export function normalizeDescription(value: string | undefined) {
  if (!value) return undefined
  const textarea = document.createElement("textarea")
  textarea.innerHTML = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(BLOCK_TAGS, "\n")
    .replace(TAGS, " ")
  const lines = textarea.value
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
  return lines
    .filter((line, index) => line !== lines[index - 1])
    .join("\n")
    .slice(0, 100_000)
    .trim() || undefined
}

function parseJsonLd(document: Document) {
  for (const node of document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(node.textContent || "null") as unknown
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && "@graph" in parsed
          ? (parsed as { "@graph": unknown[] })["@graph"]
          : [parsed]
      const posting = candidates.find((candidate): candidate is JsonLdJobPosting => {
        if (!candidate || typeof candidate !== "object") return false
        const type = (candidate as JsonLdJobPosting)["@type"]
        return type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))
      })
      if (posting) return posting
    } catch {
      // LinkedIn can include unrelated malformed JSON-LD; continue to DOM extraction.
    }
  }
  return undefined
}

function jobIdFromUrl(url: URL) {
  const path = url.pathname.match(/\/jobs\/view\/(?:[^/?#]*-)?(\d{5,30})(?:[/?#]|$)/i)?.[1]
  const query = url.searchParams.get("currentJobId") ?? url.searchParams.get("jobId")
  return [path, query].find((value) => value && /^\d{5,30}$/.test(value)) || ""
}

function selectedDetailsRoot(document: Document) {
  const anchor = document.querySelector([
    ".job-details-jobs-unified-top-card__job-title",
    ".jobs-unified-top-card__job-title",
    ".jobs-details-top-card__job-title",
    "#job-details",
    ".jobs-description__content",
  ].join(", "))
  return anchor?.closest<HTMLElement>([
    "[data-job-id]",
    "[data-occludable-job-id]",
    ".jobs-search__job-details--container",
    ".scaffold-layout__detail",
    ".jobs-details",
  ].join(", ")) ?? null
}

function extractJobId(url: URL, document: Document) {
  const currentUrlJobId = jobIdFromUrl(url)
  if (currentUrlJobId) return currentUrlJobId

  const detailsRoot = selectedDetailsRoot(document)
  if (!detailsRoot) return ""
  const identityElement = detailsRoot.matches("[data-job-id], [data-occludable-job-id]")
    ? detailsRoot
    : detailsRoot.querySelector<HTMLElement>("[data-job-id], [data-occludable-job-id]")
  const dataId = identityElement?.dataset.jobId ?? identityElement?.dataset.occludableJobId
  if (dataId && /^\d{5,30}$/.test(dataId)) return dataId

  const href = detailsRoot.querySelector<HTMLAnchorElement>('a[href*="/jobs/view/"]')?.href
  return href ? jobIdFromUrl(new URL(href, url)) : ""
}

function locationFromJsonLd(posting: JsonLdJobPosting | undefined) {
  const jobLocation = Array.isArray(posting?.jobLocation) ? posting.jobLocation[0] : posting?.jobLocation
  const address = jobLocation?.address
  return [address?.addressLocality, address?.addressRegion, address?.addressCountry]
    .filter(Boolean)
    .join(", ") || undefined
}

function explicitWorkArrangement(document: Document, posting: JsonLdJobPosting | undefined) {
  if (posting?.jobLocationType?.toUpperCase() === "TELECOMMUTE") return "remote" as const
  const selectors = [
    ".job-details-jobs-unified-top-card__job-insight",
    ".job-details-fit-level-preferences button",
    ".jobs-unified-top-card__workplace-type",
  ]
  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      const value = text(element)?.toLowerCase()
      if (!value) continue
      if (/\bhybrid\b/.test(value)) return "hybrid" as const
      if (/\bremote\b/.test(value)) return "remote" as const
      if (/\b(on-site|onsite)\b/.test(value)) return "onsite" as const
    }
  }
  return undefined
}

function periodFromUnit(value: string | undefined): CompensationPeriod | undefined {
  const unit = value?.toLowerCase()
  if (!unit) return undefined
  if (unit.includes("hour")) return "hour"
  if (unit.includes("day")) return "day"
  if (unit.includes("month")) return "month"
  if (unit.includes("year")) return "year"
  return undefined
}

function compensationFromJsonLd(posting: JsonLdJobPosting | undefined) {
  const salary = posting?.baseSalary
  const value = salary?.value
  if (!salary || !value) return {}
  const min = value.minValue ?? value.value
  const max = value.maxValue ?? value.value
  if (!Number.isFinite(min) || !Number.isFinite(max)) return {}
  return {
    compensationMin: min,
    compensationMax: max,
    compensationCurrency: salary.currency?.toUpperCase(),
    compensationPeriod: periodFromUnit(value.unitText),
  }
}

function parseAmount(raw: string) {
  const compact = raw.replace(/,/g, "").trim()
  const match = compact.match(/(\d+(?:\.\d+)?)\s*([kKmMlL])?/)
  if (!match) return undefined
  const number = Number(match[1])
  const multiplier = match[2]?.toLowerCase() === "k"
    ? 1_000
    : match[2]?.toLowerCase() === "m"
      ? 1_000_000
      : match[2]?.toLowerCase() === "l"
        ? 100_000
        : 1
  return number * multiplier
}

export function parseCompensation(value: string | undefined) {
  if (!value) return {}
  const code = value.match(/\b(USD|EUR|GBP|INR|CAD|AUD|JPY)\b/i)?.[1]?.toUpperCase()
  const period = periodFromUnit(value) ?? (/\/(?:yr|year)\b/i.test(value) ? "year" : /\/(?:hr|hour)\b/i.test(value) ? "hour" : undefined)
  const amountMatches = [...value.matchAll(/(?:[$€£₹¥]|\b(?:USD|EUR|GBP|INR|CAD|AUD|JPY)\b)?\s*(\d[\d,.]*\s*[kKmMlL]?)/gi)]
    .map((match) => parseAmount(match[1] ?? ""))
    .filter((amount): amount is number => amount !== undefined)
  if (!period || amountMatches.length === 0) {
    return { compensationNotes: value.trim() }
  }
  return {
    compensationMin: amountMatches[0],
    compensationMax: amountMatches[1] ?? amountMatches[0],
    compensationCurrency: code,
    compensationPeriod: period,
    compensationNotes: value.trim(),
  }
}

function domCompensation(document: Document) {
  const selectors = [
    ".job-details-jobs-unified-top-card__job-insight",
    ".jobs-unified-top-card__job-insight",
    "[class*='compensation']",
  ]
  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      const value = text(element)
      if (value && /[$€£₹¥]|\b(?:USD|EUR|GBP|INR|CAD|AUD|JPY)\b/i.test(value)) return value
    }
  }
  return undefined
}

function pageType(url: URL): CaptureDiagnostics["pageType"] {
  if (/\/jobs\/view\//.test(url.pathname)) return "direct"
  if (url.pathname.startsWith("/jobs/search") || url.searchParams.has("currentJobId")) return "search"
  return "unknown"
}

export function extractLinkedInJob(document: Document, urlValue = document.location.href): CapturedJob {
  const url = new URL(urlValue)
  const strategies: string[] = []
  const posting = parseJsonLd(document)
  if (posting) strategies.push("json-ld")

  const roleTitle = posting?.title?.trim() || firstText(document, [
    ".job-details-jobs-unified-top-card__job-title h1",
    ".jobs-unified-top-card__job-title",
    ".jobs-details-top-card__job-title",
    "h1",
  ]) || meta(document, "og:title")?.split(" | ")[0]?.trim() || ""
  const companyName = posting?.hiringOrganization?.name?.trim() || firstText(document, [
    ".job-details-jobs-unified-top-card__company-name",
    ".jobs-unified-top-card__company-name",
    ".jobs-details-top-card__company-info a",
  ]) || ""
  if (roleTitle || companyName) strategies.push(posting ? "json-ld-fields" : "dom-top-card")

  const jobId = extractJobId(url, document)
  const postingUrl = jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : (meta(document, "og:url") || url.href)
  const location = locationFromJsonLd(posting) || firstText(document, [
    ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
    ".jobs-unified-top-card__bullet",
    ".jobs-details-top-card__bullet",
  ])
  const workArrangement = explicitWorkArrangement(document, posting)
  const descriptionElement = document.querySelector("#job-details, .jobs-description__content, .jobs-box__html-content")
  const jobDescriptionSnapshot = normalizeDescription(posting?.description || descriptionElement?.innerHTML)
  if (descriptionElement && !posting?.description) strategies.push("dom-description")

  const structuredCompensation = compensationFromJsonLd(posting)
  const compensationText = domCompensation(document)
  const compensation = Object.keys(structuredCompensation).length > 0
    ? { ...structuredCompensation, compensationNotes: compensationText }
    : parseCompensation(compensationText)

  const missingFields = [
    !jobId && "jobId",
    !companyName && "companyName",
    !roleTitle && "roleTitle",
    !location && "location",
    !jobDescriptionSnapshot && "jobDescriptionSnapshot",
  ].filter((field): field is string => Boolean(field))

  return {
    jobId,
    postingUrl,
    companyName,
    roleTitle,
    stage: "saved",
    location,
    workArrangement: workArrangement as WorkArrangement | undefined,
    ...compensation,
    jobDescriptionSnapshot,
    diagnostics: {
      pageType: pageType(url),
      strategies,
      missingFields,
    },
  }
}
