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
  })
})
