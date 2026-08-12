import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import {
  enrichCapture,
  extractLinkedInJob,
  mergeCapture,
  parseCompensation,
  parseGuestPosting,
} from "./linkedin"

const dirname = path.dirname(fileURLToPath(import.meta.url))

function fixture(name: string) {
  const html = fs.readFileSync(path.join(dirname, "../test/fixtures", name), "utf8")
  return new DOMParser().parseFromString(html, "text/html")
}

function structuredCurrencyFixture(currency: unknown) {
  const posting = {
    "@type": "JobPosting",
    title: "Engineer",
    hiringOrganization: { name: "Example" },
    baseSalary: {
      currency,
      value: { minValue: 100_000, maxValue: 120_000, unitText: "YEAR" },
    },
  }
  return new DOMParser().parseFromString(
    `<script type="application/ld+json">${JSON.stringify(posting)}</script>`,
    "text/html"
  )
}

function malformedScalarFixture() {
  const posting = {
    "@type": "JobPosting",
    title: 42,
    description: { html: "invalid" },
    hiringOrganization: { name: ["invalid"] },
    jobLocation: {
      address: {
        addressLocality: 123,
        addressRegion: { name: "invalid" },
        addressCountry: false,
      },
    },
    jobLocationType: ["TELECOMMUTE"],
    baseSalary: {
      currency: { code: "INR" },
      value: {
        minValue: "2000000",
        maxValue: { amount: 3000000 },
        unitText: ["YEAR"],
      },
    },
  }
  return new DOMParser().parseFromString(`
    <script type="application/ld+json">${JSON.stringify(posting)}</script>
    <section data-job-id="4250044444">
      <div class="job-details-jobs-unified-top-card__company-name">DOM Company</div>
      <div class="job-details-jobs-unified-top-card__job-title"><h1>DOM Engineer</h1></div>
      <div class="job-details-jobs-unified-top-card__primary-description-container"><span class="tvm__text">DOM Location</span></div>
      <div class="job-details-jobs-unified-top-card__job-insight">Remote</div>
      <div class="job-details-jobs-unified-top-card__job-insight">₹20L-₹30L per year</div>
      <article id="job-details"><p>DOM description</p></article>
    </section>
  `, "text/html")
}

describe("LinkedIn extraction", () => {
  it("prefers structured job data on direct job pages", () => {
    const job = extractLinkedInJob(
      fixture("direct-job.html"),
      "https://www.linkedin.com/jobs/view/senior-platform-engineer-4250012345/?trackingId=abc"
    )
    expect(job).toMatchObject({
      jobId: "4250012345",
      postingUrl: "https://www.linkedin.com/jobs/view/4250012345/",
      companyName: "Acme Cloud",
      roleTitle: "Senior Platform Engineer",
      location: "Bengaluru, Karnataka, India",
      compensationMin: 2_000_000,
      compensationMax: 3_000_000,
      compensationCurrency: "INR",
      compensationPeriod: "year",
    })
    expect(job.jobDescriptionSnapshot).toBe("About the role\nBuild reliable systems.")
    expect(job.diagnostics).toMatchObject({ pageType: "direct", missingFields: [] })
  })

  it("extracts the selected job from LinkedIn search detail DOM", () => {
    const job = extractLinkedInJob(
      fixture("search-job.html"),
      "https://www.linkedin.com/jobs/search/?currentJobId=4250098765"
    )
    expect(job).toMatchObject({
      jobId: "4250098765",
      companyName: "Example Labs",
      roleTitle: "Backend Engineer",
      location: "Remote - India",
      workArrangement: "remote",
      compensationMin: 2_000_000,
      compensationMax: 3_000_000,
      compensationCurrency: "INR",
      compensationPeriod: "year",
    })
    expect(job.jobDescriptionSnapshot).toBe("Responsibilities\nOwn APIs\nScale systems")
    expect(job.diagnostics.pageType).toBe("search")
  })

  it("preserves ambiguous compensation without inventing structured values", () => {
    expect(parseCompensation("Competitive compensation based on experience")).toEqual({
      compensationNotes: "Competitive compensation based on experience",
    })
    expect(parseCompensation("$100k-$120k per year")).toEqual({
      compensationMin: 100_000,
      compensationMax: 120_000,
      compensationCurrency: undefined,
      compensationPeriod: "year",
      compensationNotes: "$100k-$120k per year",
    })
    expect(parseCompensation("¥10m-¥12m per year")).toEqual({
      compensationMin: 10_000_000,
      compensationMax: 12_000_000,
      compensationCurrency: undefined,
      compensationPeriod: "year",
      compensationNotes: "¥10m-¥12m per year",
    })
  })

  it("preserves explicit currency symbols", () => {
    expect(parseCompensation("₹20L-₹30L per year")).toMatchObject({
      compensationCurrency: "INR",
    })
    expect(parseCompensation("€90k-€100k per year")).toMatchObject({
      compensationCurrency: "EUR",
    })
    expect(parseCompensation("£80k-£95k per year")).toMatchObject({
      compensationCurrency: "GBP",
    })
  })

  it("normalizes explicit JSON-LD currency codes conservatively", () => {
    for (const [currency, expected] of [
      [" chf ", "CHF"],
      ["sgd", "SGD"],
      ["NZD", "NZD"],
      ["AED", "AED"],
      ["CNY", "CNY"],
      ["US dollars", undefined],
      ["US", undefined],
      ["123", undefined],
      ["ZZZ", undefined],
      ["$", undefined],
      ["₹", "INR"],
      [840, undefined],
      [{ code: "USD" }, undefined],
      [null, undefined],
    ] as const) {
      const job = extractLinkedInJob(
        structuredCurrencyFixture(currency),
        "https://www.linkedin.com/jobs/view/4250033333/"
      )
      expect(job.compensationCurrency).toBe(expected)
    }
  })

  it("falls back to DOM data for malformed JSON-LD scalars", () => {
    const job = extractLinkedInJob(
      malformedScalarFixture(),
      "https://www.linkedin.com/jobs/view/4250044444/"
    )

    expect(job).toMatchObject({
      companyName: "DOM Company",
      roleTitle: "DOM Engineer",
      location: "DOM Location",
      workArrangement: "remote",
      compensationMin: 2_000_000,
      compensationMax: 3_000_000,
      compensationCurrency: "INR",
      compensationPeriod: "year",
      jobDescriptionSnapshot: "DOM description",
    })
  })

  it("never takes a job ID from an unrelated search result card", () => {
    const document = new DOMParser().parseFromString(`
      <main>
        <article data-job-id="4250011111">Unrelated result</article>
        <section class="jobs-search__job-details--container" data-job-id="4250022222">
          <div class="job-details-jobs-unified-top-card__job-title"><h1>Selected role</h1></div>
          <div class="job-details-jobs-unified-top-card__company-name">Selected company</div>
        </section>
      </main>
    `, "text/html")

    expect(extractLinkedInJob(document, "https://www.linkedin.com/jobs/search/").jobId)
      .toBe("4250022222")
  })
})

describe("signed-in LinkedIn layout", () => {
  const signedInJob = () => extractLinkedInJob(
    fixture("authenticated-search-job.html"),
    "https://www.linkedin.com/jobs/search/?currentJobId=4100000002&keywords=backend"
  )

  it("reads every detail from the selected pane without structured data", () => {
    const job = signedInJob()

    expect(job).toMatchObject({
      jobId: "4100000002",
      postingUrl: "https://www.linkedin.com/jobs/view/4100000002/",
      companyName: "Northwind Robotics",
      roleTitle: "Staff Backend Engineer",
      location: "Bengaluru, Karnataka, India",
      workArrangement: "hybrid",
      compensationMin: 4_000_000,
      compensationMax: 6_000_000,
      compensationCurrency: "INR",
      compensationPeriod: "year",
    })
    expect(job.jobDescriptionSnapshot).toBe([
      "Northwind Robotics is hiring a Staff Backend Engineer to lead our fleet telemetry platform.",
      "Design event pipelines that ingest millions of robot events per hour.",
      "Mentor a team of five backend engineers.",
    ].join("\n"))
    expect(job.diagnostics).toMatchObject({ pageType: "search", missingFields: [] })
  })

  it("ignores the results rail and the page-level heading", () => {
    const job = signedInJob()

    expect(job.roleTitle).not.toBe("Job search results")
    expect(job.companyName).not.toBe("Unrelated Company")
    expect(job.location).not.toBe("Pune, Maharashtra, India")
  })

  it("collapses labels LinkedIn duplicates for screen readers", () => {
    expect(signedInJob().roleTitle).toBe("Staff Backend Engineer")
  })

  it("drops posting recency and applicant counts from the location", () => {
    const job = extractLinkedInJob(new DOMParser().parseFromString(`
      <div class="jobs-search__job-details--container" data-job-id="4100000003">
        <div class="job-details-jobs-unified-top-card__job-title"><h1>Designer</h1></div>
        <div class="job-details-jobs-unified-top-card__company-name">Helio</div>
        <div class="job-details-jobs-unified-top-card__primary-description-container">
          Helio &middot; 3 days ago &middot; 48 applicants
        </div>
      </div>
    `, "text/html"), "https://www.linkedin.com/jobs/search/?currentJobId=4100000003")

    expect(job.location).toBeUndefined()
    expect(job.diagnostics.missingFields).toContain("location")
  })

  it("reads the workplace type from a location suffix", () => {
    const job = extractLinkedInJob(new DOMParser().parseFromString(`
      <div class="jobs-search__job-details--container" data-job-id="4100000004">
        <div class="job-details-jobs-unified-top-card__job-title"><h1>Designer</h1></div>
        <div class="job-details-jobs-unified-top-card__primary-description-container">
          <span class="tvm__text">Berlin, Germany (Remote)</span>
        </div>
      </div>
    `, "text/html"), "https://www.linkedin.com/jobs/search/?currentJobId=4100000004")

    expect(job.location).toBe("Berlin, Germany")
    expect(job.workArrangement).toBe("remote")
  })

  it("falls back to the Open Graph hiring title", () => {
    const job = extractLinkedInJob(new DOMParser().parseFromString(`
      <head><meta property="og:title" content="Helio Systems hiring Product Designer in Berlin, Germany | LinkedIn" /></head>
      <body><div id="job-details">A long enough description to be captured by the extension preview.</div></body>
    `, "text/html"), "https://www.linkedin.com/jobs/view/4100000005/")

    expect(job).toMatchObject({
      companyName: "Helio Systems",
      roleTitle: "Product Designer",
      location: "Berlin, Germany",
    })
  })

  it("infers an omitted compensation period from the magnitude of the range", () => {
    expect(parseCompensation("$150,000 - $200,000")).toMatchObject({
      compensationMin: 150_000,
      compensationMax: 200_000,
      compensationPeriod: "year",
    })
    expect(parseCompensation("$55 - $70")).toMatchObject({
      compensationMin: 55,
      compensationMax: 70,
      compensationPeriod: "hour",
    })
    expect(parseCompensation("Base pay range 401(k) eligible")).toEqual({
      compensationNotes: "Base pay range 401(k) eligible",
    })
  })

  it("prefers currency-anchored amounts over unrelated numbers", () => {
    expect(parseCompensation("Base pay range · $180,000/yr - $220,000/yr · 401(k)")).toMatchObject({
      compensationMin: 180_000,
      compensationMax: 220_000,
      compensationPeriod: "year",
    })
  })
})

describe("guest posting fallback", () => {
  const guestHtml = () => fs.readFileSync(
    path.join(dirname, "../test/fixtures/guest-posting.html"),
    "utf8"
  )

  it("parses the public posting fragment", () => {
    expect(parseGuestPosting(guestHtml())).toMatchObject({
      roleTitle: "Staff Backend Engineer",
      companyName: "Northwind Robotics",
      location: "Bengaluru, Karnataka, India",
      workArrangement: "hybrid",
      compensationMin: 4_000_000,
      compensationMax: 6_000_000,
      compensationCurrency: "INR",
      compensationPeriod: "year",
      jobDescriptionSnapshot: "Own the telemetry platform end to end.\nDesign event pipelines.\nMentor backend engineers.",
    })
  })

  it("fills fields the rendered page could not provide", async () => {
    const bare = extractLinkedInJob(
      new DOMParser().parseFromString("<body></body>", "text/html"),
      "https://www.linkedin.com/jobs/view/4100000002/"
    )
    expect(bare.diagnostics.missingFields).toContain("companyName")

    const enriched = await enrichCapture(bare, async () => guestHtml())

    expect(enriched).toMatchObject({
      jobId: "4100000002",
      companyName: "Northwind Robotics",
      roleTitle: "Staff Backend Engineer",
      location: "Bengaluru, Karnataka, India",
      workArrangement: "hybrid",
    })
    expect(enriched.diagnostics.missingFields).toEqual([])
    expect(enriched.diagnostics.strategies).toContain("guest-api")
  })

  it("keeps the rendered capture when the guest endpoint fails", async () => {
    const bare = extractLinkedInJob(
      new DOMParser().parseFromString("<body></body>", "text/html"),
      "https://www.linkedin.com/jobs/view/4100000002/"
    )

    await expect(enrichCapture(bare, async () => { throw new Error("429") })).resolves.toEqual(bare)
    await expect(enrichCapture(bare, async () => undefined)).resolves.toEqual(bare)
  })

  it("skips the request when the rendered capture is already complete", async () => {
    const complete = signedInComplete()
    let requested = false

    const enriched = await enrichCapture(complete, async () => {
      requested = true
      return guestHtml()
    })

    expect(requested).toBe(false)
    expect(enriched).toEqual(complete)
  })

  function signedInComplete() {
    return extractLinkedInJob(
      fixture("authenticated-search-job.html"),
      "https://www.linkedin.com/jobs/search/?currentJobId=4100000002"
    )
  }
})

describe("merging captures", () => {
  const base = extractLinkedInJob(
    new DOMParser().parseFromString(`
      <div data-job-id="4100000006" class="jobs-details">
        <div class="job-details-jobs-unified-top-card__job-title"><h1>Analyst</h1></div>
      </div>
    `, "text/html"),
    "https://www.linkedin.com/jobs/view/4100000006/"
  )

  it("never overwrites values already present", () => {
    const edited = { ...base, companyName: "User Typed Co" }
    const merged = mergeCapture(edited, { companyName: "Extracted Co", location: "Lisbon, Portugal" })

    expect(merged.companyName).toBe("User Typed Co")
    expect(merged.location).toBe("Lisbon, Portugal")
    expect(merged.roleTitle).toBe("Analyst")
  })

  it("records a strategy only when it contributed a field", () => {
    expect(mergeCapture(base, { location: "Lisbon" }, "guest-api").diagnostics.strategies)
      .toContain("guest-api")
    expect(mergeCapture(base, {}, "guest-api").diagnostics.strategies)
      .not.toContain("guest-api")
  })

  it("recanonicalizes the posting URL when a job ID arrives late", () => {
    const withoutId = extractLinkedInJob(
      new DOMParser().parseFromString("<body></body>", "text/html"),
      "https://www.linkedin.com/jobs/collections/recommended/"
    )
    const merged = mergeCapture(withoutId, { jobId: "4100000007" })

    expect(merged.jobId).toBe("4100000007")
    expect(merged.postingUrl).toBe("https://www.linkedin.com/jobs/view/4100000007/")
  })
})
