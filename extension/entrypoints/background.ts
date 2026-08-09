import { browser } from "wxt/browser"

import { addDiagnostic, clearLocalExtensionData, connectionStorage } from "../lib/storage"
import type { ApiError, ApiResult, BackgroundMessage, TrackerConnection } from "../lib/types"

async function callTracker(
  connection: TrackerConnection,
  operation: Extract<BackgroundMessage, { type: "api-request" }>["operation"]
): Promise<ApiResult | ApiError> {
  try {
    const response = await fetch(`${connection.trackerUrl}/api/extension`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ operation }),
      cache: "no-store",
    })
    const body = await response.json().catch(() => null) as ApiResult | ApiError | null
    if (!response.ok) {
      const error = body && "error" in body
        ? { ...body, status: response.status }
        : { error: "request_failed", message: `Tracker returned ${response.status}.`, status: response.status }
      await addDiagnostic({ code: `api:${error.error}` })
      return error
    }
    if (!body) {
      await addDiagnostic({ code: "api:empty_response" })
      return { error: "empty_response", message: "Tracker returned an empty response." }
    }
    return body
  } catch {
    await addDiagnostic({ code: "api:network_error" })
    return {
      error: "network_error",
      message: "Could not reach the tracker. Check the URL and your connection, then retry.",
    }
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      void browser.runtime.openOptionsPage()
    }
  })

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!message || typeof message !== "object" || !("type" in message)) {
      return undefined
    }
    const typedMessage = message as BackgroundMessage
    if (typedMessage.type === "disconnect") {
      return clearLocalExtensionData().then(() => ({ status: "disconnected" }))
    }
    if (typedMessage.type === "api-request") {
      return (async () => {
        const connection = typedMessage.connection ?? (await connectionStorage.getValue())
        if (!connection) {
          return { error: "not_connected", message: "Connect the extension to your tracker first." }
        }
        return await callTracker(connection, typedMessage.operation)
      })()
    }
    return undefined
  })
})
