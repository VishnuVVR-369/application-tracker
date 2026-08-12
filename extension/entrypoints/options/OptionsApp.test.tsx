import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { requestTracker } from "../../lib/messaging"
import { connectionStorage, diagnosticsStorage } from "../../lib/storage"
import { OptionsApp } from "./OptionsApp"

vi.mock("../../lib/messaging", () => ({
  requestTracker: vi.fn(),
  disconnectTracker: vi.fn(),
}))

const requestTrackerMock = vi.mocked(requestTracker)

describe("extension setup", () => {
  beforeEach(async () => {
    requestTrackerMock.mockReset()
    await connectionStorage.removeValue()
    await diagnosticsStorage.removeValue()
  })

  it("tests a token before saving the device-local connection", async () => {
    requestTrackerMock.mockResolvedValue({ status: "connected", tokenName: "Personal Chrome" })
    render(<OptionsApp />)

    const token = `wat_${"a".repeat(43)}`
    fireEvent.change(screen.getByLabelText("Extension access token"), { target: { value: token } })
    fireEvent.click(screen.getByRole("button", { name: "Test connection and save" }))

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Personal Chrome"))
    expect(await connectionStorage.getValue()).toEqual({
      trackerUrl: "https://way2more.vercel.app",
      token,
    })
    expect(requestTrackerMock).toHaveBeenCalledWith(
      { type: "test" },
      { trackerUrl: "https://way2more.vercel.app", token }
    )
  })

  it("does not save when connection testing fails", async () => {
    requestTrackerMock.mockRejectedValue(new Error("The extension token is invalid or revoked."))
    render(<OptionsApp />)

    fireEvent.change(screen.getByLabelText("Extension access token"), {
      target: { value: `wat_${"b".repeat(43)}` },
    })
    fireEvent.click(screen.getByRole("button", { name: "Test connection and save" }))

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("invalid or revoked"))
    expect(await connectionStorage.getValue()).toBeNull()
  })
})
