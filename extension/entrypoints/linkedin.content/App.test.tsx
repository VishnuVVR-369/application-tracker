import * as React from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { requestTracker } from "../../lib/messaging"
import { CaptureApp } from "./App"

vi.mock("../../lib/messaging", () => ({ requestTracker: vi.fn() }))

const requestTrackerMock = vi.mocked(requestTracker)

function renderCapture(markup: string) {
  document.body.innerHTML = markup
  render(<CaptureApp registerOpen={() => undefined} />)
  fireEvent.click(screen.getByRole("button", { name: "Add to Tracker" }))
  return screen.getByRole("dialog")
}

describe("capture preview", () => {
  beforeEach(() => {
    requestTrackerMock.mockReset()
  })

  it("requires company and role while allowing other fields to stay missing", () => {
    const dialog = renderCapture(`
      <div data-job-id="4250012345">
        <div class="job-details-jobs-unified-top-card__job-title"><h1>Software Engineer</h1></div>
      </div>
    `)
    const addButton = within(dialog).getByRole("button", { name: "Add to Tracker" })
    expect((within(dialog).getByLabelText("Company") as HTMLInputElement).value).toBe("")
    expect(addButton.hasAttribute("disabled")).toBe(true)

    fireEvent.change(within(dialog).getByLabelText("Company"), { target: { value: "Acme" } })
    expect(addButton.hasAttribute("disabled")).toBe(false)
  })

  it("keeps the populated preview open with retry and copy actions after an API error", async () => {
    requestTrackerMock.mockRejectedValue(new Error("Could not reach the tracker."))
    const dialog = renderCapture(`
      <div data-job-id="4250012345">
        <div class="job-details-jobs-unified-top-card__company-name">Acme</div>
        <div class="job-details-jobs-unified-top-card__job-title"><h1>Software Engineer</h1></div>
      </div>
    `)
    fireEvent.click(within(dialog).getByRole("button", { name: "Add to Tracker" }))

    await waitFor(() => expect(within(dialog).getByRole("alert").textContent).toContain("Could not reach"))
    expect(within(dialog).getByRole("button", { name: "Retry" })).toBeTruthy()
    expect(within(dialog).getByRole("button", { name: "Copy details" })).toBeTruthy()
    expect((within(dialog).getByLabelText("Company") as HTMLInputElement).value).toBe("Acme")
  })

  it("submits edited identity and structured compensation fields", async () => {
    requestTrackerMock.mockResolvedValue({
      status: "created",
      application: {
        id: "application-id",
        companyName: "Acme",
        roleTitle: "Software Engineer",
        stage: "saved",
        archived: false,
      },
    })
    const dialog = renderCapture(`
      <section data-job-id="4250012345">
        <div class="job-details-jobs-unified-top-card__company-name">Acme</div>
        <div class="job-details-jobs-unified-top-card__job-title"><h1>Software Engineer</h1></div>
      </section>
    `)

    fireEvent.change(within(dialog).getByLabelText("Job ID"), { target: { value: "4250099999" } })
    fireEvent.change(within(dialog).getByLabelText("Posting URL"), {
      target: { value: "https://www.linkedin.com/jobs/view/4250099999/" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: /^More details/ }))
    fireEvent.change(within(dialog).getByLabelText("Minimum compensation"), { target: { value: "100000" } })
    fireEvent.change(within(dialog).getByLabelText("Maximum compensation"), { target: { value: "120000" } })
    fireEvent.change(within(dialog).getByLabelText("Currency"), { target: { value: "CAD" } })
    fireEvent.change(within(dialog).getByLabelText("Compensation period"), { target: { value: "year" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Add to Tracker" }))

    await waitFor(() => expect(requestTrackerMock).toHaveBeenCalledWith({
      type: "create",
      capture: expect.objectContaining({
        jobId: "4250099999",
        postingUrl: "https://www.linkedin.com/jobs/view/4250099999/",
        compensationMin: 100_000,
        compensationMax: 120_000,
        compensationCurrency: "CAD",
        compensationPeriod: "year",
      }),
    }))
  })
})
