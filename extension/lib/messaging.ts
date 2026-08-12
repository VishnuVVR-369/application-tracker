import { browser } from "wxt/browser"

import type {
  ApiError,
  ApiOperation,
  ApiResult,
  BackgroundMessage,
  ContentMessage,
  TrackerConnection,
} from "./types"

export async function requestTracker(operation: ApiOperation, connection?: TrackerConnection) {
  const message: BackgroundMessage = { type: "api-request", operation, connection }
  const response = (await browser.runtime.sendMessage(message)) as ApiResult | ApiError
  if ("error" in response) {
    throw new Error(response.message)
  }
  return response
}

export async function disconnectTracker() {
  const message: BackgroundMessage = { type: "disconnect" }
  await browser.runtime.sendMessage(message)
}

export async function openCaptureInTab(tabId: number) {
  const message: ContentMessage = { type: "open-capture" }
  await browser.tabs.sendMessage(tabId, message)
}
