import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"
import { addActivity, createApplicationRecord } from "./applications"
import { extensionOperation } from "./extensionApiValidators"
import { canonicalizeUrl } from "./model"

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_REQUESTS = 30
const UNDO_WINDOW_MS = 60_000
const MAX_DESCRIPTION_LENGTH = 100_000

function requiredText(value: string, label: string, maxLength: number) {
  const normalized = value.trim()
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`INVALID_INPUT:${label}`)
  }
  return normalized
}

function optionalText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim()
  if (!normalized) {
    return undefined
  }
  if (normalized.length > maxLength) {
    throw new Error("INVALID_INPUT:field_too_long")
  }
  return normalized
}

function plainTextDescription(value: string | undefined) {
  const normalized = optionalText(value, MAX_DESCRIPTION_LENGTH)
  if (!normalized) {
    return undefined
  }
  return normalized
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?(?:p|div|h[1-6]|li|ul|ol|br)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim()
}

function maybeLinkedInJobId(jobId: string, postingUrl: string) {
  const normalized = jobId.trim()
  if (/^\d{5,30}$/.test(normalized)) {
    return normalized
  }
  const fromPath = postingUrl.match(/\/jobs\/view\/(?:[^/?#]*-)?(\d{5,30})(?:[/?#]|$)/i)?.[1]
  const fromQuery = postingUrl.match(/[?&](?:currentJobId|jobId)=(\d{5,30})(?:&|$)/i)?.[1]
  return fromPath ?? fromQuery
}

function linkedInJobId(jobId: string, postingUrl: string) {
  const result = maybeLinkedInJobId(jobId, postingUrl)
  if (!result) {
    throw new Error("INVALID_INPUT:job_id")
  }
  return result
}

function canonicalLinkedInUrl(jobId: string) {
  return `https://www.linkedin.com/jobs/view/${jobId}/`
}

async function authorize(ctx: MutationCtx, tokenHash: string) {
  if (!/^[a-f0-9]{64}$/.test(tokenHash)) {
    throw new Error("EXTENSION_TOKEN_INVALID")
  }
  const token = await ctx.db
    .query("extensionTokens")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique()
  if (!token || token.revokedAt) {
    throw new Error("EXTENSION_TOKEN_INVALID")
  }

  const now = Date.now()
  const inCurrentWindow =
    token.rateWindowStartedAt !== undefined &&
    now - token.rateWindowStartedAt < RATE_LIMIT_WINDOW_MS
  const requestCount = inCurrentWindow ? (token.rateWindowRequestCount ?? 0) + 1 : 1
  if (requestCount > RATE_LIMIT_REQUESTS) {
    throw new Error("EXTENSION_RATE_LIMITED")
  }

  await ctx.db.patch(token._id, {
    lastUsedAt: now,
    rateWindowStartedAt: inCurrentWindow ? token.rateWindowStartedAt : now,
    rateWindowRequestCount: requestCount,
  })
  return token
}

async function findExisting(
  ctx: MutationCtx,
  userId: Id<"users">,
  jobId: string,
  postingUrl: string
) {
  const byJobId = await ctx.db
    .query("applications")
    .withIndex("by_userId_and_sourceSystem_and_sourceExternalId", (q) =>
      q
        .eq("userId", userId)
        .eq("sourceSystem", "browser_extension")
        .eq("sourceExternalId", jobId)
    )
    .first()
  if (byJobId) {
    return byJobId
  }

  const canonical = canonicalizeUrl(postingUrl)
  if (!canonical) {
    return null
  }
  const byCanonicalUrl = await ctx.db
    .query("applications")
    .withIndex("by_userId_and_postingUrlCanonical", (q) =>
      q.eq("userId", userId).eq("postingUrlCanonical", canonical)
    )
    .first()
  if (byCanonicalUrl) {
    return byCanonicalUrl
  }

  const userApplications = await ctx.db
    .query("applications")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect()
  return userApplications.find(
    (application) => maybeLinkedInJobId("", application.postingUrl ?? "") === jobId
  ) ?? null
}

function applicationResult(application: Doc<"applications">) {
  return {
    id: application._id,
    companyName: application.companyName,
    roleTitle: application.roleTitle,
    stage: application.stage,
    dateSavedDate: application.dateSavedDate,
    dateAppliedDate: application.dateAppliedDate,
    archived: application.archived,
  }
}

function snapshotPatch(args: {
  jobId: string
  postingUrl: string
  companyName: string
  roleTitle: string
  location?: string
  workArrangement?: "remote" | "hybrid" | "onsite"
  compensationMin?: number
  compensationMax?: number
  compensationCurrency?: string
  compensationPeriod?: "hour" | "day" | "month" | "year" | "contract" | "unknown"
  compensationNotes?: string
  jobDescriptionSnapshot?: string
}) {
  const jobId = linkedInJobId(args.jobId, args.postingUrl)
  return {
    postingUrl: canonicalLinkedInUrl(jobId),
    postingUrlCanonical: canonicalLinkedInUrl(jobId),
    postingTitleSnapshot: requiredText(args.roleTitle, "role_title", 300),
    postingCompanySnapshot: requiredText(args.companyName, "company_name", 300),
    postingCapturedAt: Date.now(),
    source: "linkedin" as const,
    sourceSystem: "browser_extension" as const,
    sourceExternalId: jobId,
    location: optionalText(args.location, 300),
    workArrangement: args.workArrangement,
    compensationMin: args.compensationMin,
    compensationMax: args.compensationMax,
    compensationCurrency: optionalText(args.compensationCurrency, 12)?.toUpperCase(),
    compensationPeriod: args.compensationPeriod,
    compensationNotes: optionalText(args.compensationNotes, 2_000),
    jobDescriptionSnapshot: plainTextDescription(args.jobDescriptionSnapshot),
  }
}

export const executeInternal = internalMutation({
  args: {
    tokenHash: v.string(),
    operation: extensionOperation,
  },
  handler: async (ctx, args) => {
    const token = await authorize(ctx, args.tokenHash.trim().toLowerCase())
    const user = await ctx.db.get(token.userId)
    if (!user) {
      throw new Error("EXTENSION_TOKEN_INVALID")
    }

    if (args.operation.type === "test") {
      return { status: "connected" as const, tokenName: token.name }
    }

    if (args.operation.type === "lookup") {
      const jobId = linkedInJobId(args.operation.jobId, args.operation.postingUrl)
      const postingUrl = canonicalLinkedInUrl(jobId)
      const existing = await findExisting(ctx, user._id, jobId, postingUrl)
      return existing
        ? { status: "exists" as const, application: applicationResult(existing) }
        : { status: "missing" as const }
    }

    if (args.operation.type === "create") {
      const patch = snapshotPatch(args.operation.capture)
      const existing = await findExisting(
        ctx,
        user._id,
        patch.sourceExternalId,
        patch.postingUrl
      )
      if (existing) {
        return { status: "exists" as const, application: applicationResult(existing) }
      }

      const applicationId = await createApplicationRecord(ctx, user, {
        ...patch,
        companyName: requiredText(args.operation.capture.companyName, "company_name", 300),
        roleTitle: requiredText(args.operation.capture.roleTitle, "role_title", 300),
        stage: args.operation.capture.stage,
        notes: optionalText(args.operation.capture.notes, 10_000),
        sourceExtensionTokenId: token._id,
      })
      const application = await ctx.db.get(applicationId)
      if (!application) {
        throw new Error("EXTENSION_CREATE_FAILED")
      }
      return { status: "created" as const, application: applicationResult(application) }
    }

    const application = await ctx.db.get(args.operation.applicationId)
    if (!application || application.userId !== user._id) {
      throw new Error("APPLICATION_NOT_FOUND")
    }

    if (args.operation.type === "refresh") {
      const patch = snapshotPatch(args.operation.capture)
      const currentJobId = maybeLinkedInJobId(
        application.sourceExternalId ?? "",
        application.postingUrl ?? ""
      )
      if (!currentJobId || currentJobId !== patch.sourceExternalId) {
        throw new Error("APPLICATION_JOB_MISMATCH")
      }
      await ctx.db.patch(application._id, {
        ...patch,
        updatedAt: Date.now(),
        lastActivityAt: Date.now(),
      })
      await addActivity(ctx, {
        userId: user._id,
        applicationId: application._id,
        type: "edited",
        title: "LinkedIn job snapshot refreshed",
        eventAt: Date.now(),
        relatedEntityType: "application",
        relatedEntityId: String(application._id),
      })
      const refreshed = await ctx.db.get(application._id)
      if (!refreshed) {
        throw new Error("APPLICATION_NOT_FOUND")
      }
      return { status: "refreshed" as const, application: applicationResult(refreshed) }
    }

    if (
      application.sourceExtensionTokenId !== token._id ||
      application.sourceSystem !== "browser_extension" ||
      Date.now() - application.createdAt > UNDO_WINDOW_MS
    ) {
      throw new Error("UNDO_NOT_ALLOWED")
    }
    const now = Date.now()
    await ctx.db.patch(application._id, {
      archived: true,
      archivedAt: now,
      updatedAt: now,
      lastActivityAt: now,
    })
    await addActivity(ctx, {
      userId: user._id,
      applicationId: application._id,
      type: "edited",
      title: "Application archived from extension undo",
      eventAt: now,
      relatedEntityType: "application",
      relatedEntityId: String(application._id),
    })
    const archived = await ctx.db.get(application._id)
    if (!archived) {
      throw new Error("APPLICATION_NOT_FOUND")
    }
    return { status: "archived" as const, application: applicationResult(archived) }
  },
})
