import { storage } from "#imports"

import type { DiagnosticEvent, TrackerConnection } from "./types"

const MAX_DIAGNOSTICS = 100
const DIAGNOSTIC_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000

export const connectionStorage = storage.defineItem<TrackerConnection | null>(
  "local:trackerConnection",
  { fallback: null }
)

export const diagnosticsStorage = storage.defineItem<DiagnosticEvent[]>("local:diagnostics", {
  fallback: [],
})

export async function addDiagnostic(event: Omit<DiagnosticEvent, "at">) {
  const now = Date.now()
  const current = await diagnosticsStorage.getValue()
  const retained = current.filter((item) => now - item.at <= DIAGNOSTIC_RETENTION_MS)
  await diagnosticsStorage.setValue([...retained, { ...event, at: now }].slice(-MAX_DIAGNOSTICS))
}

export async function clearLocalExtensionData() {
  await Promise.all([connectionStorage.removeValue(), diagnosticsStorage.removeValue()])
}

export function normalizeTrackerUrl(value: string) {
  const url = new URL(value.trim())
  const isProduction = url.protocol === "https:"
  const isLocalhost = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)
  if (!isProduction && !isLocalhost) {
    throw new Error("Use HTTPS, or HTTP only for localhost development.")
  }
  if (isProduction && url.hostname !== "way2more.vercel.app") {
    throw new Error("This personal release supports way2more.vercel.app and localhost only.")
  }
  url.hash = ""
  url.search = ""
  url.pathname = url.pathname.replace(/\/+$/, "") || "/"
  return url.toString().replace(/\/$/, "")
}
