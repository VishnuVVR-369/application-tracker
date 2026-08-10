import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { extractLinkedInJob, parseCompensation } from "./linkedin"

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
