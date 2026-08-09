import { ConvexHttpClient } from "convex/browser"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { extensionRequestSchema } from "@/lib/extension-api-contract"

export const runtime = "nodejs"

const TOKEN_PATTERN = /^Bearer\s+(wat_[A-Za-z0-9_-]{40,})$/i

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin")
  const allowedOrigin = origin?.startsWith("chrome-extension://") ? origin : "null"
  return {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Cache-Control": "no-store",
    Vary: "Origin",
  }
}

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(request) })
}

function errorResponse(request: Request, error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("EXTENSION_TOKEN_INVALID")) {
    return json(request, { error: "invalid_token", message: "The extension token is invalid or revoked." }, 401)
  }
  if (message.includes("EXTENSION_RATE_LIMITED")) {
    return json(request, { error: "rate_limited", message: "Too many requests. Try again in a minute." }, 429)
  }
  if (message.includes("APPLICATION_NOT_FOUND")) {
    return json(request, { error: "not_found", message: "Application not found." }, 404)
  }
  if (message.includes("APPLICATION_JOB_MISMATCH")) {
    return json(request, { error: "job_mismatch", message: "This application belongs to a different LinkedIn job." }, 409)
  }
  if (message.includes("UNDO_NOT_ALLOWED")) {
    return json(request, { error: "undo_not_allowed", message: "This application can no longer be undone from the extension." }, 409)
  }
  if (message.includes("INVALID_INPUT")) {
    return json(request, { error: "invalid_input", message: "Some captured job details are invalid." }, 400)
  }
  console.error("Extension API request failed", error)
  return json(request, { error: "server_error", message: "The tracker could not process this request." }, 500)
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) })
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? ""
  const token = authorization.match(TOKEN_PATTERN)?.[1]
  if (!token) {
    return json(request, { error: "invalid_token", message: "A valid extension token is required." }, 401)
  }

  let requestBody: unknown
  try {
    requestBody = await request.json()
  } catch {
    return json(request, { error: "invalid_json", message: "Request body must be valid JSON." }, 400)
  }

  const parsed = extensionRequestSchema.safeParse(requestBody)
  if (!parsed.success) {
    return json(request, { error: "invalid_input", message: "Request body does not match the extension API contract." }, 400)
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    return json(request, { error: "server_config", message: "The tracker API is not configured." }, 503)
  }

  const client = new ConvexHttpClient(convexUrl)
  const operation = parsed.data.operation

  try {
    const result = await client.action(api.extensionApiActions.execute, {
      token,
      operation:
        operation.type === "refresh" || operation.type === "undo"
          ? { ...operation, applicationId: operation.applicationId as Id<"applications"> }
          : operation,
    })
    return json(request, result)
  } catch (error) {
    return errorResponse(request, error)
  }
}
