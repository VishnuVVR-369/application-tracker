import type {
  CaptureDiagnostics,
  CapturedJob,
  CompensationPeriod,
  WorkArrangement,
} from "./types"

type Scope = Document | Element

type JsonLdJobPosting = {
  "@type"?: string | string[]
  title?: string
  description?: string
  hiringOrganization?: { name?: string }
  jobLocation?: { address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } } | Array<{ address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } }>
  jobLocationType?: string
  baseSalary?: {
    currency?: unknown
    value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string }
  }
}

const BLOCK_TAGS = /<\/?(?:p|div|h[1-6]|li|ul|ol|br|section|article|tr)\b[^>]*>/gi
const TAGS = /<[^>]+>/g
const EXPLICIT_CURRENCY_SYMBOLS: Record<string, string> = {
  "€": "EUR",
  "£": "GBP",
  "₹": "INR",
}
const CURRENCY_CODE_PATTERN = /\b(USD|EUR|GBP|INR|CAD|AUD|JPY|SGD|CHF|SEK|NOK|DKK|PLN|BRL|MXN|ZAR|AED|NZD|HKD|CNY)\b/i
const MONEY_PATTERN = /(?:[$€£₹¥]|\b(?:USD|EUR|GBP|INR|CAD|AUD|JPY|SGD|CHF|SEK|NOK|DKK|PLN|BRL|MXN|ZAR|AED|NZD|HKD|CNY)\b)\s*\d/i
const ISO_CURRENCY_CODES = new Set(Intl.supportedValuesOf("currency"))

// LinkedIn separates top-card facts with middots and renders posting metadata
// (recency, applicant counts, promotion badges) in the same run of text.
const SEGMENT_SEPARATOR = /\s*[·•|]\s*|\s+–\s+/
const NON_LOCATION_PATTERN =
  /\bago\b|\bapplicant|\bapplied\b|\bpeople clicked\b|\bpromoted\b|\breposted\b|\bviewers?\b|\bactively (?:reviewing|hiring)\b|\brecruit(?:er|ing)\b|\bfull-?time\b|\bpart-?time\b|\bcontract\b|\binternship\b|\bemployees?\b|\bfollowers?\b|\bsee how you compare\b|^\d[\d,.]*\+?$|^[·•|-]+$/i
const DESCRIPTION_NOISE =
  /^(?:about the job|about this job|job description|show more|show less|see more|see less|…\s*see more|about the company)$/i

const DETAIL_ANCHOR_SELECTORS = [
  ".job-details-jobs-unified-top-card__job-title",
  ".job-details-jobs-unified-top-card__container--two-pane",
  ".jobs-unified-top-card__job-title",
  ".jobs-details-top-card__job-title",
  "#job-details",
  ".jobs-description__content",
]
const DETAIL_CONTAINER_SELECTORS = [
  "[data-job-id]",
  "[data-occludable-job-id]",
  ".jobs-search__job-details--container",
  ".jobs-search__job-details",
  ".job-view-layout",
  ".scaffold-layout__detail",
  ".jobs-details",
]

// Selectors specific enough to be safe outside the selected-job pane.
const TITLE_SELECTORS = [
  ".job-details-jobs-unified-top-card__job-title h1",
  ".job-details-jobs-unified-top-card__job-title",
  ".jobs-unified-top-card__job-title",
  ".jobs-details-top-card__job-title",
  "[class*='top-card'][class*='job-title']",
  ".top-card-layout__title",
  ".topcard__title",
]
// Selectors that only identify the right job inside the selected-job pane.
const TITLE_SELECTORS_LOOSE = ["h1 a[href*='/jobs/view/']", "h1"]

const COMPANY_SELECTORS = [
  ".job-details-jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name",
  ".jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name",
  ".jobs-details-top-card__company-info a",
  "[class*='top-card'][class*='company-name'] a",
  "[class*='top-card'][class*='company-name']",
  ".topcard__org-name-link",
  ".top-card-layout__second-subline a",
]
const COMPANY_SELECTORS_LOOSE = [
  ".job-details-jobs-unified-top-card__primary-description-container a[href*='/company/']",
  "a[href*='/company/']",
  "a[href*='/school/']",
]

const LOCATION_CONTAINER_SELECTORS = [
  ".job-details-jobs-unified-top-card__primary-description-container",
  ".job-details-jobs-unified-top-card__tertiary-description-container",
  ".jobs-unified-top-card__primary-description",
  ".jobs-unified-top-card__subtitle-primary-grouping",
  "[class*='top-card'][class*='description-container']",
  ".topcard__flavor-row",
]
const LOCATION_SELECTORS = [
  ".job-details-jobs-unified-top-card__bullet",
  ".jobs-unified-top-card__bullet",
  ".jobs-details-top-card__bullet",
  ".topcard__flavor--bullet",
  "[class*='top-card'][class*='workplace-type']",
]

const INSIGHT_SELECTORS = [
  ".job-details-jobs-unified-top-card__job-insight",
  ".job-details-jobs-unified-top-card__job-insight-view-model-secondary",
  ".job-details-fit-level-preferences button",
  ".job-details-fit-level-preferences span",
  ".job-details-preferences-and-skills__pill",
  ".jobs-unified-top-card__job-insight",
  ".jobs-unified-top-card__workplace-type",
  "[class*='workplace-type']",
  "[class*='job-insight']",
  "[class*='salary']",
  "[class*='compensation']",
  ".description__job-criteria-item",
]

const DESCRIPTION_SELECTORS = [
  "#job-details",
  ".jobs-description__content .jobs-box__html-content",
  ".jobs-description-content__text",
  ".jobs-description__content",
  ".jobs-box__html-content",
  "[class*='jobs-description'] [class*='html-content']",
  "[class*='jobs-description']",
  ".show-more-less-html__markup",
  ".description__text",
]

const GUEST_POSTING_ENDPOINT = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting"
const GUEST_REQUEST_TIMEOUT_MS = 8_000
const MAX_GUEST_HTML_LENGTH = 2_000_000

function collapse(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || undefined
}

// LinkedIn frequently duplicates a label for screen readers next to an
// `aria-hidden` copy, which makes a naive `textContent` read "AcmeAcme".
function visibleTextOf(element: Element) {
  if (element.querySelector(".visually-hidden, .a11y-text, .sr-only")) {
    const visible = collapse(element.querySelector('[aria-hidden="true"]')?.textContent)
    if (visible) return visible
  }
  const raw = collapse(element.textContent)
  if (!raw) return undefined
  const half = Math.floor(raw.length / 2)
  if (raw.length % 2 === 0 && raw.slice(0, half) === raw.slice(half)) return raw.slice(0, half).trim()
  const spaced = raw.slice(0, half) === raw.slice(half + 1) && raw[half] === " "
  return spaced ? raw.slice(0, half).trim() : raw
}

function text(element: Element | null) {
  return element ? visibleTextOf(element) : undefined
}

function firstText(scope: Scope, selectors: string[]) {
  for (const selector of selectors) {
    for (const element of scope.querySelectorAll(selector)) {
      const value = text(element)
      if (value) return value
    }
  }
  return undefined
}

function allText(scope: Scope, selectors: string[]) {
  const values: string[] = []
  for (const selector of selectors) {
    for (const element of scope.querySelectorAll(selector)) {
      const value = text(element)
      if (value && !values.includes(value)) values.push(value)
    }
  }
  return values
}

function meta(document: Document, property: string) {
  return document.querySelector<HTMLMetaElement>(`meta[property="${property}"], meta[name="${property}"]`)?.content?.trim() || undefined
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function normalizeJobLocation(value: unknown) {
  const location = record(value)
  const address = record(location?.address)
  if (!location || !address) return undefined
  return {
    address: {
      addressLocality: stringValue(address.addressLocality),
      addressRegion: stringValue(address.addressRegion),
      addressCountry: stringValue(address.addressCountry),
    },
  }
}

function normalizeJsonLdPosting(candidate: unknown): JsonLdJobPosting | undefined {
  const value = record(candidate)
  if (!value) return undefined
  const type = value["@type"]
  if (
    type !== "JobPosting" &&
    !(Array.isArray(type) && type.some((entry) => entry === "JobPosting"))
  ) {
    return undefined
  }

  const organization = record(value.hiringOrganization)
  const locations = (Array.isArray(value.jobLocation)
    ? value.jobLocation
    : [value.jobLocation])
    .map(normalizeJobLocation)
    .filter((location) => location !== undefined)
  const salary = record(value.baseSalary)
  const salaryValue = record(salary?.value)

  return {
    "@type": "JobPosting",
    title: stringValue(value.title),
    description: stringValue(value.description),
    hiringOrganization: organization
      ? { name: stringValue(organization.name) }
      : undefined,
    jobLocation: locations.length > 0 ? locations : undefined,
    jobLocationType: stringValue(value.jobLocationType),
    baseSalary: salary && salaryValue
      ? {
          currency: salary.currency,
          value: {
            minValue: numberValue(salaryValue.minValue),
            maxValue: numberValue(salaryValue.maxValue),
            value: numberValue(salaryValue.value),
            unitText: stringValue(salaryValue.unitText),
          },
        }
      : undefined,
  }
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
    .filter((line) => line && !DESCRIPTION_NOISE.test(line))
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
        : Array.isArray(record(parsed)?.["@graph"])
          ? record(parsed)?.["@graph"] as unknown[]
          : [parsed]
      for (const candidate of candidates) {
        const posting = normalizeJsonLdPosting(candidate)
        if (posting) return posting
      }
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
  const anchor = document.querySelector(DETAIL_ANCHOR_SELECTORS.join(", "))
  const fromAnchor = anchor?.closest<HTMLElement>(DETAIL_CONTAINER_SELECTORS.join(", "))
  if (fromAnchor) return fromAnchor
  // A hydrating two-pane layout can render the detail container before the top card.
  return document.querySelector<HTMLElement>([
    ".jobs-search__job-details--container",
    ".jobs-search__job-details",
    ".job-view-layout",
    ".jobs-details",
  ].join(", "))
}

function extractJobId(url: URL, document: Document, detailsRoot: HTMLElement | null) {
  const currentUrlJobId = jobIdFromUrl(url)
  if (currentUrlJobId) return currentUrlJobId

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

function cleanTitle(value: string | undefined) {
  return value
    ?.replace(/\s*\|\s*LinkedIn\s*$/i, "")
    .replace(/\s+with verification$/i, "")
    .replace(/^\s*[-–|]\s*/, "")
    .trim() || undefined
}

function cleanCompany(value: string | undefined) {
  return value
    ?.split(SEGMENT_SEPARATOR)[0]
    ?.replace(/\s*\|\s*LinkedIn\s*$/i, "")
    .replace(/^\s*at\s+/i, "")
    .replace(/\s+logo$/i, "")
    .trim() || undefined
}

// `Acme hiring Staff Engineer in Berlin | LinkedIn` is the shape LinkedIn uses
// for job Open Graph titles, and it survives layout changes.
function fromOpenGraph(document: Document) {
  const raw = meta(document, "og:title")
  if (!raw) return {}
  const cleaned = raw.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim()
  const hiring = cleaned.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+?))?$/i)
  if (hiring) {
    return {
      companyName: cleanCompany(hiring[1]),
      roleTitle: cleanTitle(hiring[2]),
      location: collapse(hiring[3]),
    }
  }
  const parts = cleaned.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean)
  return { roleTitle: cleanTitle(parts[0]), companyName: cleanCompany(parts[1]) }
}

function arrangementFromText(value: string | undefined): WorkArrangement | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase()
  if (/\bhybrid\b/.test(normalized)) return "hybrid"
  if (/\bremote\b|\bwork from home\b/.test(normalized)) return "remote"
  if (/\bon-?site\b|\bin[- ]office\b/.test(normalized)) return "onsite"
  return undefined
}

// LinkedIn appends the workplace type to the location as `Berlin (Hybrid)`.
function splitArrangementSuffix(value: string | undefined) {
  if (!value) return { location: undefined, arrangement: undefined }
  const match = value.match(/[([]\s*(remote|hybrid|on-?site)\s*[)\]]\s*$/i)
  if (!match) return { location: value, arrangement: arrangementFromText(value) }
  return {
    location: value.slice(0, match.index).replace(/[\s,;-]+$/, "").trim() || undefined,
    arrangement: arrangementFromText(match[1]),
  }
}

function segments(value: string | undefined) {
  return (value ?? "")
    .split(SEGMENT_SEPARATOR)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function isLocationLike(value: string, companyName: string | undefined) {
  if (value.length < 2 || value.length > 120) return false
  if (NON_LOCATION_PATTERN.test(value)) return false
  return !companyName || value.toLowerCase() !== companyName.toLowerCase()
}

function locationFromDom(scope: Scope, companyName: string | undefined) {
  for (const selector of LOCATION_CONTAINER_SELECTORS) {
    for (const container of scope.querySelectorAll(selector)) {
      const bullet = allText(container, LOCATION_SELECTORS)
        .find((value) => isLocationLike(value, companyName))
      if (bullet) return bullet
      const match = segments(text(container)).find((value) => isLocationLike(value, companyName))
      if (match) return match
    }
  }
  return allText(scope, LOCATION_SELECTORS).find((value) => isLocationLike(value, companyName))
}

function periodFromUnit(value: string | undefined): CompensationPeriod | undefined {
  const unit = value?.toLowerCase()
  if (!unit) return undefined
  if (unit.includes("hour") || /\/\s?hr\b/.test(unit)) return "hour"
  if (unit.includes("day")) return "day"
  if (unit.includes("month") || /\/\s?mo\b/.test(unit)) return "month"
  if (unit.includes("year") || /\/\s?yr\b/.test(unit) || unit.includes("annum")) return "year"
  return undefined
}

function currencyCodeFromText(value: string | undefined) {
  if (!value) return undefined
  const code = value.match(CURRENCY_CODE_PATTERN)?.[1]?.toUpperCase()
  if (code) return code
  return Object.entries(EXPLICIT_CURRENCY_SYMBOLS)
    .find(([symbol]) => value.includes(symbol))?.[1]
}

function structuredCurrencyCode(value: unknown) {
  if (typeof value !== "string") return undefined
  const normalized = value.trim().toUpperCase()
  if (normalized && /^[A-Z]{3}$/.test(normalized) && ISO_CURRENCY_CODES.has(normalized)) {
    return normalized
  }
  return currencyCodeFromText(value)
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
    compensationCurrency: structuredCurrencyCode(salary.currency),
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

function amountsIn(value: string) {
  const anchored = [...value.matchAll(/(?:[$€£₹¥]|\b(?:USD|EUR|GBP|INR|CAD|AUD|JPY|SGD|CHF|SEK|NOK|DKK|PLN|BRL|MXN|ZAR|AED|NZD|HKD|CNY)\b)\s*(\d[\d,.]*\s*[kKmMlL]?)/gi)]
    .map((match) => parseAmount(match[1] ?? ""))
    .filter((amount): amount is number => amount !== undefined)
  if (anchored.length > 0) return { amounts: anchored, anchored: true }
  const bare = [...value.matchAll(/(\d[\d,.]*\s*[kKmMlL]?)/g)]
    .map((match) => parseAmount(match[1] ?? ""))
    .filter((amount): amount is number => amount !== undefined)
  return { amounts: bare, anchored: false }
}

// A currency-anchored range without an explicit unit is unambiguous at the
// extremes: LinkedIn posts no four-figure hourly rate or three-figure salary.
// Unanchored digits are left alone — plan names such as "401(k)" live there.
function inferPeriod(amounts: number[], anchored: boolean): CompensationPeriod | undefined {
  if (!anchored || amounts.length === 0) return undefined
  if (amounts.every((amount) => amount >= 10_000)) return "year"
  if (amounts.every((amount) => amount > 0 && amount <= 500)) return "hour"
  return undefined
}

export function parseCompensation(value: string | undefined) {
  if (!value) return {}
  const code = currencyCodeFromText(value)
  const { amounts: amountMatches, anchored } = amountsIn(value)
  const period = periodFromUnit(value) ?? inferPeriod(amountMatches, anchored)
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

function descriptionElement(scope: Scope) {
  let fallback: Element | undefined
  for (const selector of DESCRIPTION_SELECTORS) {
    for (const element of scope.querySelectorAll(selector)) {
      const length = collapse(element.textContent)?.length ?? 0
      if (length >= 120) return element
      if (length > 0 && !fallback) fallback = element
    }
  }
  return fallback
}

function pageType(url: URL): CaptureDiagnostics["pageType"] {
  if (/\/jobs\/view\//.test(url.pathname)) return "direct"
  if (url.pathname.startsWith("/jobs/search") || url.searchParams.has("currentJobId")) return "search"
  return "unknown"
}

function missingFieldsFor(job: Omit<CapturedJob, "diagnostics">) {
  return [
    !job.jobId && "jobId",
    !job.companyName && "companyName",
    !job.roleTitle && "roleTitle",
    !job.location && "location",
    !job.jobDescriptionSnapshot && "jobDescriptionSnapshot",
  ].filter((field): field is string => Boolean(field))
}

function canonicalPostingUrl(jobId: string) {
  return `https://www.linkedin.com/jobs/view/${jobId}/`
}

export function extractLinkedInJob(document: Document, urlValue = document.location.href): CapturedJob {
  const url = new URL(urlValue)
  const type = pageType(url)
  const strategies: string[] = []
  const posting = parseJsonLd(document)
  if (posting) strategies.push("json-ld")

  const detailsRoot = selectedDetailsRoot(document)
  // Search results keep every unselected job in the DOM, so generic selectors
  // are only trustworthy inside the selected detail pane (or on a direct page).
  const paneScope: Scope | undefined = detailsRoot ?? (type === "direct" ? document : undefined)
  const scope: Scope = detailsRoot ?? document
  const openGraph = fromOpenGraph(document)

  const wholePage: Scope | undefined = scope === document ? undefined : document

  const roleTitle = cleanTitle(posting?.title)
    || cleanTitle(firstText(scope, TITLE_SELECTORS))
    || (wholePage ? cleanTitle(firstText(wholePage, TITLE_SELECTORS)) : undefined)
    || (paneScope ? cleanTitle(firstText(paneScope, TITLE_SELECTORS_LOOSE)) : undefined)
    || openGraph.roleTitle
    || ""
  const companyName = cleanCompany(posting?.hiringOrganization?.name)
    || cleanCompany(firstText(scope, COMPANY_SELECTORS))
    || (wholePage ? cleanCompany(firstText(wholePage, COMPANY_SELECTORS)) : undefined)
    || (paneScope ? cleanCompany(firstText(paneScope, COMPANY_SELECTORS_LOOSE)) : undefined)
    || openGraph.companyName
    || ""
  if (roleTitle || companyName) strategies.push(posting ? "json-ld-fields" : "dom-top-card")

  const jobId = extractJobId(url, document, detailsRoot)
  const postingUrl = jobId ? canonicalPostingUrl(jobId) : (meta(document, "og:url") || url.href)

  const rawLocation = locationFromJsonLd(posting)
    || locationFromDom(scope, companyName)
    || (wholePage ? locationFromDom(wholePage, companyName) : undefined)
    || openGraph.location
  const { location, arrangement: locationArrangement } = splitArrangementSuffix(rawLocation)

  // A pane can advertise both a workplace pill and a remote-friendly blurb, so
  // the more specific "hybrid" wins over any other reading.
  const insights = allText(scope, INSIGHT_SELECTORS)
  const arrangements = insights.map(arrangementFromText)
  const workArrangement = (posting?.jobLocationType?.toUpperCase() === "TELECOMMUTE" ? "remote" : undefined)
    || arrangements.find((value) => value === "hybrid")
    || arrangements.find((value) => value !== undefined)
    || locationArrangement

  const descriptionSource = descriptionElement(scope)
    ?? (wholePage ? descriptionElement(wholePage) : undefined)
  const jobDescriptionSnapshot = normalizeDescription(posting?.description)
    || normalizeDescription(descriptionSource?.innerHTML)
  if (descriptionSource && !posting?.description) strategies.push("dom-description")

  const structuredCompensation = compensationFromJsonLd(posting)
  const compensationText = insights.find((value) => MONEY_PATTERN.test(value))
  const compensation = Object.keys(structuredCompensation).length > 0
    ? { ...structuredCompensation, compensationNotes: compensationText }
    : parseCompensation(compensationText)

  const captured = {
    jobId,
    postingUrl,
    companyName,
    roleTitle,
    stage: "saved" as const,
    location,
    workArrangement,
    ...compensation,
    jobDescriptionSnapshot,
  }

  return {
    ...captured,
    diagnostics: {
      pageType: type,
      strategies,
      missingFields: missingFieldsFor(captured),
    },
  }
}

const MERGEABLE_KEYS = [
  "companyName",
  "roleTitle",
  "location",
  "workArrangement",
  "compensationMin",
  "compensationMax",
  "compensationCurrency",
  "compensationPeriod",
  "compensationNotes",
  "jobDescriptionSnapshot",
] as const

function isBlank(value: unknown) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "")
}

/**
 * Fills blank fields of `base` from `extra`. Values already present — including
 * anything the user typed in the preview — are never overwritten.
 */
export function mergeCapture(base: CapturedJob, extra: Partial<CapturedJob>, strategy?: string): CapturedJob {
  const merged: CapturedJob = { ...base }
  const writable = merged as Record<string, unknown>
  let filled = false
  for (const key of MERGEABLE_KEYS) {
    if (isBlank(merged[key]) && !isBlank(extra[key])) {
      writable[key] = extra[key]
      filled = true
    }
  }
  if (isBlank(base.jobId) && typeof extra.jobId === "string" && /^\d{5,30}$/.test(extra.jobId)) {
    merged.jobId = extra.jobId
    merged.postingUrl = canonicalPostingUrl(extra.jobId)
    filled = true
  }

  const contributed = filled
    ? [...(strategy ? [strategy] : []), ...(extra.diagnostics?.strategies ?? [])]
    : []
  const strategies = [
    ...base.diagnostics.strategies,
    ...contributed.filter((name, index) =>
      !base.diagnostics.strategies.includes(name) && contributed.indexOf(name) === index),
  ]
  return {
    ...merged,
    diagnostics: { ...base.diagnostics, strategies, missingFields: missingFieldsFor(merged) },
  }
}

/**
 * Parses LinkedIn's public guest job-posting fragment. Its markup predates the
 * authenticated single-page app and changes far less often, which makes it a
 * dependable fallback when the logged-in top card cannot be read.
 */
export function parseGuestPosting(html: string): Partial<CapturedJob> | undefined {
  const parsed = new DOMParser().parseFromString(html, "text/html")
  const roleTitle = cleanTitle(firstText(parsed, [
    ".top-card-layout__title",
    ".topcard__title",
    ".sub-nav-cta__header",
    "h1",
    "h2",
  ]))
  const companyName = cleanCompany(firstText(parsed, [
    ".topcard__org-name-link",
    ".top-card-layout__second-subline a",
    ".sub-nav-cta__optional-url",
    ".topcard__flavor",
  ]))
  if (!roleTitle && !companyName) return undefined

  const rawLocation = firstText(parsed, [
    ".topcard__flavor--bullet",
    ".top-card-layout__second-subline .topcard__flavor--bullet",
    ".sub-nav-cta__meta-text",
  ])
  const { location, arrangement } = splitArrangementSuffix(rawLocation)
  const compensationText = allText(parsed, [
    ".compensation__salary",
    ".salary",
    "[class*='salary']",
    "[class*='compensation']",
  ]).find((value) => MONEY_PATTERN.test(value))

  return {
    roleTitle,
    companyName,
    location,
    workArrangement: arrangement
      ?? arrangementFromText(firstText(parsed, [".topcard__flavor--workplace-type"])),
    jobDescriptionSnapshot: normalizeDescription(
      parsed.querySelector(".show-more-less-html__markup, .description__text")?.innerHTML
    ),
    ...parseCompensation(compensationText),
  }
}

function onLinkedIn() {
  return typeof location !== "undefined" && /(^|\.)linkedin\.com$/i.test(location.hostname)
}

async function fetchGuestPosting(jobId: string) {
  if (!onLinkedIn()) return undefined
  const response = await fetch(`${GUEST_POSTING_ENDPOINT}/${encodeURIComponent(jobId)}`, {
    credentials: "omit",
    headers: { accept: "text/html" },
    signal: AbortSignal.timeout(GUEST_REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) return undefined
  return (await response.text()).slice(0, MAX_GUEST_HTML_LENGTH)
}

/**
 * Second pass for jobs whose rendered top card did not yield every field. Only
 * blanks are filled, so a capture never regresses and never overrides an edit.
 */
export async function enrichCapture(
  job: CapturedJob,
  fetchPosting: (jobId: string) => Promise<string | undefined> = fetchGuestPosting
): Promise<CapturedJob> {
  if (!/^\d{5,30}$/.test(job.jobId) || job.diagnostics.missingFields.length === 0) return job
  try {
    const html = await fetchPosting(job.jobId)
    if (!html) return job
    const parsed = parseGuestPosting(html)
    return parsed ? mergeCapture(job, parsed, "guest-api") : job
  } catch {
    // The guest endpoint can rate limit or drop closed postings; keep the DOM capture.
    return job
  }
}
