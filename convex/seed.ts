import { makeFunctionReference } from "convex/server"
import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { action, internalMutation, type MutationCtx } from "./_generated/server"
import {
  buildResumeSnapshot,
  canonicalizeUrl,
  dateKeyFromTimestamp,
  getDomain,
  normalizeEmail,
  normalizeKey,
} from "./model"

const DEFAULT_QUALITY_ITEMS = [
  {
    key: "role-fit",
    label: "Role and level are a strong fit.",
    description: "The role scope matches current experience and target level.",
    weight: 25,
  },
  {
    key: "tailored-resume",
    label: "Resume is tailored to the posting.",
    description: "The resume uses language and evidence from this posting.",
    weight: 25,
  },
  {
    key: "skills-reflected",
    label: "Required skills are reflected in the resume.",
    description: "Important skills are represented with real examples.",
    weight: 20,
  },
  {
    key: "referral-checked",
    label: "Referral path has been checked or acted on.",
    description: "A referral route was checked, requested, or ruled out.",
    weight: 15,
  },
  {
    key: "materials-complete",
    label: "Application materials are complete and specific.",
    description: "The submission has tailored notes, cover copy, or answers where needed.",
    weight: 15,
  },
]

const demoResumeFiles = [
  {
    label: "Backend Platform Resume",
    fileName: "backend-platform-resume.pdf",
    body: "Demo backend platform resume for application tracker seed data.",
  },
  {
    label: "Product Engineering Resume",
    fileName: "product-engineering-resume.pdf",
    body: "Demo product engineering resume for application tracker seed data.",
  },
] as const

type SeedResumeInput = {
  label: string
  fileName: string
  storageId: Id<"_storage">
  sizeBytes: number
}

type SeedInsertArgs = {
  reset: boolean
  authSubject: string
  tokenIdentifier: string
  email: string
  name: string
  timezone: string
  resumes: SeedResumeInput[]
}

type SeedResult = {
  userId: Id<"users">
  applications: number
  resumes: number
  tasks: number
  contacts: number
  interviews: number
  offers: number
  reset: boolean
}

const insertDemoReference = makeFunctionReference<"mutation", SeedInsertArgs, SeedResult>(
  "seed:insertDemo"
)

function minimalPdf(content: string) {
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${content.length + 58} >>
stream
BT /F1 12 Tf 72 720 Td (${content.replace(/[()]/g, "")}) Tj ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`
}

async function ensureSeedUser(
  ctx: MutationCtx,
  args: {
    authSubject: string
    tokenIdentifier: string
    email: string
    name: string
    timezone: string
  }
) {
  const now = Date.now()
  const normalizedEmail = normalizeEmail(args.email)
  const bySubject = await ctx.db
    .query("users")
    .withIndex("by_authSubject", (q) => q.eq("authSubject", args.authSubject))
    .unique()
  const byEmail = normalizedEmail
    ? await ctx.db
        .query("users")
        .withIndex("by_normalizedEmail", (q) => q.eq("normalizedEmail", normalizedEmail))
        .first()
    : null

  const existing = bySubject ?? byEmail
  if (existing) {
    await ctx.db.patch(existing._id, {
      authSubject: args.authSubject,
      tokenIdentifier: args.tokenIdentifier,
      name: args.name,
      email: args.email,
      normalizedEmail,
      lastSeenAt: now,
      updatedAt: now,
    })
    await ensureUserSettings(ctx, existing._id, args.name, args.timezone)
    await ensureQualityDefaults(ctx, existing._id)
    return (await ctx.db.get(existing._id)) as Doc<"users">
  }

  const userId = await ctx.db.insert("users", {
    authSubject: args.authSubject,
    tokenIdentifier: args.tokenIdentifier,
    name: args.name,
    email: args.email,
    normalizedEmail,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  })
  await ensureUserSettings(ctx, userId, args.name, args.timezone)
  await ensureQualityDefaults(ctx, userId)
  return (await ctx.db.get(userId)) as Doc<"users">
}

async function ensureUserSettings(
  ctx: MutationCtx,
  userId: Id<"users">,
  displayName: string,
  timezone: string
) {
  const now = Date.now()
  const existing = await ctx.db
    .query("userSettings")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  if (existing) {
    await ctx.db.patch(existing._id, {
      displayName: existing.displayName ?? displayName,
      timezone: existing.timezone ?? timezone,
      theme: existing.theme ?? "dark",
      weekStartsOn: "monday",
      updatedAt: now,
    })
    return
  }

  await ctx.db.insert("userSettings", {
    userId,
    displayName,
    theme: "dark",
    timezone,
    weekStartsOn: "monday",
    createdAt: now,
    updatedAt: now,
  })
}

async function ensureQualityDefaults(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("qualityChecklistItems")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first()
  if (existing) {
    return
  }

  const now = Date.now()
  await Promise.all(
    DEFAULT_QUALITY_ITEMS.map((item, index) =>
      ctx.db.insert("qualityChecklistItems", {
        userId,
        key: item.key,
        label: item.label,
        description: item.description,
        source: "default",
        weight: item.weight,
        sortOrder: index,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })
    )
  )
}

async function qualitySnapshot(ctx: MutationCtx, userId: Id<"users">, checkedKeys: string[]) {
  const items = await ctx.db
    .query("qualityChecklistItems")
    .withIndex("by_userId_and_enabled", (q) => q.eq("userId", userId).eq("enabled", true))
    .collect()

  return items
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      key: item.key,
      itemId: item._id,
      label: item.label,
      checked: checkedKeys.includes(item.key),
      weight: item.weight,
      source: item.source,
      sortOrder: item.sortOrder,
      checkedAt: checkedKeys.includes(item.key) ? Date.parse("2026-05-20T12:00:00.000Z") : undefined,
    }))
}

async function resetUserData(ctx: MutationCtx, userId: Id<"users">) {
  for (const table of [
    "tasks",
    "applicationOffers",
    "applicationInterviews",
    "applicationContacts",
    "applicationResumeLinks",
    "applicationStageHistory",
    "activityEvents",
    "winLogEntries",
    "applications",
    "resumes",
    "weeklyGoals",
  ] as const) {
    const docs = await ctx.db
      .query(table)
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()
    await Promise.all(docs.map((doc) => ctx.db.delete(doc._id)))
  }
}

async function insertActivity(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">
    applicationId: Id<"applications">
    type: Doc<"activityEvents">["type"]
    title: string
    at: number
    source?: "auto" | "manual"
    relatedEntityType?: Doc<"activityEvents">["relatedEntityType"]
    relatedEntityId?: string
    metadata?: unknown
  }
) {
  return await ctx.db.insert("activityEvents", {
    userId: args.userId,
    applicationId: args.applicationId,
    type: args.type,
    title: args.title,
    source: args.source ?? "auto",
    actorType: args.source === "manual" ? "user" : "system",
    actorUserId: args.source === "manual" ? args.userId : undefined,
    eventAt: args.at,
    eventDate: dateKeyFromTimestamp(args.at),
    relatedEntityType: args.relatedEntityType,
    relatedEntityId: args.relatedEntityId,
    metadataJson: args.metadata === undefined ? undefined : JSON.stringify(args.metadata),
    createdAt: args.at,
  })
}

async function insertStage(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">
    applicationId: Id<"applications">
    stage: Doc<"applications">["stage"]
    enteredAt: number
    exitedAt?: number
    enteredFromStage?: Doc<"applications">["stage"]
    exitedToStage?: Doc<"applications">["stage"]
    activityEventId?: Id<"activityEvents">
  }
) {
  await ctx.db.insert("applicationStageHistory", {
    userId: args.userId,
    applicationId: args.applicationId,
    stage: args.stage,
    enteredAt: args.enteredAt,
    exitedAt: args.exitedAt,
    enteredFromStage: args.enteredFromStage,
    exitedToStage: args.exitedToStage,
    source: "user",
    activityEventId: args.activityEventId,
    createdAt: args.enteredAt,
    updatedAt: args.exitedAt ?? args.enteredAt,
  })
}

async function insertApplication(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">
    resume?: Doc<"resumes">
    companyName: string
    companyWebsite?: string
    roleTitle: string
    location?: string
    stage: Doc<"applications">["stage"]
    dateSavedDate?: string
    dateAppliedDate?: string
    applicationDeadlineDate?: string
    takeHomeDeadlineDate?: string
    offerResponseDeadlineDate?: string
    currentStageEnteredAt: number
    source?: Doc<"applications">["source"]
    referralStatus?: Doc<"applications">["referralStatus"]
    applicationType?: Doc<"applications">["applicationType"]
    workArrangement?: Doc<"applications">["workArrangement"]
    compensationMin?: number
    compensationMax?: number
    closedAt?: number
    closedDate?: string
    closedOutcome?: Doc<"applications">["closedOutcome"]
    rejectionStage?: Doc<"applications">["rejectionStage"]
    rejectionReason?: Doc<"applications">["rejectionReason"]
    rejectionLessons?: string
    notes?: string
    qualityChecks: Doc<"applications">["qualityChecks"]
  }
) {
  const now = Date.now()
  const applicationId = await ctx.db.insert("applications", {
    userId: args.userId,
    companyName: args.companyName,
    companyKey: normalizeKey(args.companyName),
    companyWebsite: args.companyWebsite,
    companyDomain: getDomain(args.companyWebsite),
    roleTitle: args.roleTitle,
    roleKey: normalizeKey(args.roleTitle),
    location: args.location,
    workArrangement: args.workArrangement,
    compensationMin: args.compensationMin,
    compensationMax: args.compensationMax,
    compensationCurrency: "USD",
    compensationPeriod: "year",
    source: args.source,
    sourceSystem: "manual",
    dateSavedDate: args.dateSavedDate,
    dateAppliedDate: args.dateAppliedDate,
    stage: args.stage,
    currentStageEnteredAt: args.currentStageEnteredAt,
    referralStatus: args.referralStatus ?? "not_checked",
    applicationType: args.applicationType,
    currentResumeId: args.resume?._id,
    qualityChecks: args.qualityChecks,
    applicationDeadlineDate: args.applicationDeadlineDate,
    takeHomeDeadlineDate: args.takeHomeDeadlineDate,
    offerResponseDeadlineDate: args.offerResponseDeadlineDate,
    closedAt: args.closedAt,
    closedDate: args.closedDate,
    closedOutcome: args.closedOutcome,
    rejectionStage: args.rejectionStage,
    rejectionReason: args.rejectionReason,
    rejectionLessons: args.rejectionLessons,
    notes: args.notes,
    archived: false,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: args.currentStageEnteredAt,
  })

  await insertActivity(ctx, {
    userId: args.userId,
    applicationId,
    type: "created",
    title: "Application created",
    at: now,
    relatedEntityType: "application",
    relatedEntityId: String(applicationId),
  })

  if (args.resume) {
    await ctx.db.insert("applicationResumeLinks", {
      userId: args.userId,
      applicationId,
      resumeId: args.resume._id,
      isCurrent: true,
      linkedAt: now,
      resumeSnapshot: buildResumeSnapshot(args.resume),
      createdAt: now,
      updatedAt: now,
    })
  }

  return applicationId
}

export const insertDemo = internalMutation({
  args: {
    reset: v.boolean(),
    authSubject: v.string(),
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.string(),
    timezone: v.string(),
    resumes: v.array(
      v.object({
        label: v.string(),
        fileName: v.string(),
        storageId: v.id("_storage"),
        sizeBytes: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ensureSeedUser(ctx, args)
    if (args.reset) {
      await resetUserData(ctx, user._id)
    }
    const now = Date.parse("2026-06-01T12:00:00.000Z")

    const [backendResumeId, productResumeId] = await Promise.all(
      args.resumes.map((resume, index) =>
        ctx.db.insert("resumes", {
          userId: user._id,
          label: resume.label,
          fileName: resume.fileName,
          storageId: resume.storageId,
          mimeType: "application/pdf",
          sizeBytes: resume.sizeBytes,
          notes: index === 0 ? "Seeded backend-focused resume." : "Seeded product-focused resume.",
          isDefault: index === 0,
          defaultedAt: index === 0 ? now : undefined,
          archived: false,
          createdAt: now,
          updatedAt: now,
        })
      )
    )
    const backendResume = (await ctx.db.get(backendResumeId)) as Doc<"resumes">
    const productResume = (await ctx.db.get(productResumeId)) as Doc<"resumes">

    const acmeId = await insertApplication(ctx, {
      userId: user._id,
      resume: backendResume,
      companyName: "Acme Cloud",
      companyWebsite: "https://www.acme.example/careers",
      roleTitle: "Senior Backend Engineer",
      location: "Remote",
      stage: "interview",
      dateSavedDate: "2026-05-18",
      dateAppliedDate: "2026-05-20",
      takeHomeDeadlineDate: "2026-06-04",
      currentStageEnteredAt: Date.parse("2026-05-29T14:00:00.000Z"),
      source: "referral",
      referralStatus: "referred",
      applicationType: "referral_backed",
      workArrangement: "remote",
      compensationMin: 155000,
      compensationMax: 185000,
      qualityChecks: await qualitySnapshot(ctx, user._id, [
        "role-fit",
        "tailored-resume",
        "skills-reflected",
        "referral-checked",
      ]),
      notes: "Take-home is due soon. Ask referrer about platform reliability scope.",
    })
    const acmeStageEvent = await insertActivity(ctx, {
      userId: user._id,
      applicationId: acmeId,
      type: "stage_changed",
      title: "Moved to interview",
      at: Date.parse("2026-05-29T14:00:00.000Z"),
      relatedEntityType: "application",
      relatedEntityId: String(acmeId),
      metadata: { fromStage: "phone_screen", toStage: "interview" },
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: acmeId,
      stage: "applied",
      enteredAt: Date.parse("2026-05-20T09:00:00.000Z"),
      exitedAt: Date.parse("2026-05-24T11:00:00.000Z"),
      exitedToStage: "phone_screen",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: acmeId,
      stage: "phone_screen",
      enteredAt: Date.parse("2026-05-24T11:00:00.000Z"),
      exitedAt: Date.parse("2026-05-29T14:00:00.000Z"),
      enteredFromStage: "applied",
      exitedToStage: "interview",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: acmeId,
      stage: "interview",
      enteredAt: Date.parse("2026-05-29T14:00:00.000Z"),
      enteredFromStage: "phone_screen",
      activityEventId: acmeStageEvent,
    })
    const acmeContactId = await ctx.db.insert("applicationContacts", {
      userId: user._id,
      applicationId: acmeId,
      name: "Maya Patel",
      normalizedName: normalizeKey("Maya Patel"),
      relationshipType: "recruiter",
      roleTitle: "Senior Technical Recruiter",
      email: "maya.patel@acme.example",
      normalizedEmail: normalizeEmail("maya.patel@acme.example"),
      linkedinUrl: canonicalizeUrl("https://www.linkedin.com/in/maya-patel-demo"),
      notes: "Prefers concise follow-ups after each interview round.",
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
    const acmeInterviewId = await ctx.db.insert("applicationInterviews", {
      userId: user._id,
      applicationId: acmeId,
      roundNumber: 2,
      roundLabel: "System design",
      interviewType: "system_design",
      format: "video",
      status: "scheduled",
      scheduledAt: Date.parse("2026-06-05T17:00:00.000Z"),
      scheduledDate: "2026-06-05",
      timezone: args.timezone,
      durationMinutes: 60,
      contactIds: [acmeContactId],
      prepNotes: "Review event-driven ingestion and backpressure tradeoffs.",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("tasks", {
      userId: user._id,
      applicationId: acmeId,
      relatedInterviewId: acmeInterviewId,
      kind: "interview_prep",
      title: "Prepare Acme system design stories",
      dueDate: "2026-06-04",
      timezone: args.timezone,
      status: "pending",
      source: "manual",
      createdAt: now,
      updatedAt: now,
    })

    const globexId = await insertApplication(ctx, {
      userId: user._id,
      resume: productResume,
      companyName: "Globex Analytics",
      companyWebsite: "https://globex.example/jobs",
      roleTitle: "Product Engineer",
      location: "New York, NY",
      stage: "offer",
      dateSavedDate: "2026-05-10",
      dateAppliedDate: "2026-05-11",
      offerResponseDeadlineDate: "2026-06-07",
      currentStageEnteredAt: Date.parse("2026-05-31T16:00:00.000Z"),
      source: "linkedin",
      referralStatus: "not_checked",
      applicationType: "tailored_apply",
      workArrangement: "hybrid",
      compensationMin: 170000,
      compensationMax: 205000,
      qualityChecks: await qualitySnapshot(ctx, user._id, [
        "role-fit",
        "tailored-resume",
        "skills-reflected",
        "materials-complete",
      ]),
      notes: "Compare equity refresh and on-call expectations before responding.",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: globexId,
      stage: "applied",
      enteredAt: Date.parse("2026-05-11T10:00:00.000Z"),
      exitedAt: Date.parse("2026-05-18T12:00:00.000Z"),
      exitedToStage: "phone_screen",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: globexId,
      stage: "phone_screen",
      enteredAt: Date.parse("2026-05-18T12:00:00.000Z"),
      exitedAt: Date.parse("2026-05-23T12:00:00.000Z"),
      enteredFromStage: "applied",
      exitedToStage: "interview",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: globexId,
      stage: "interview",
      enteredAt: Date.parse("2026-05-23T12:00:00.000Z"),
      exitedAt: Date.parse("2026-05-31T16:00:00.000Z"),
      enteredFromStage: "phone_screen",
      exitedToStage: "offer",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: globexId,
      stage: "offer",
      enteredAt: Date.parse("2026-05-31T16:00:00.000Z"),
      enteredFromStage: "interview",
    })
    const offerId = await ctx.db.insert("applicationOffers", {
      userId: user._id,
      applicationId: globexId,
      versionNumber: 1,
      isCurrent: true,
      offeredAt: Date.parse("2026-05-31T16:00:00.000Z"),
      offeredDate: "2026-05-31",
      responseDeadlineDate: "2026-06-07",
      baseAmount: 190000,
      bonusAmount: 20000,
      equitySummary: "20k RSUs over four years",
      currency: "USD",
      period: "year",
      compensationNotes: "Negotiating sign-on and first-year refresh.",
      decision: "negotiating",
      createdAt: now,
      updatedAt: now,
    })
    await insertActivity(ctx, {
      userId: user._id,
      applicationId: globexId,
      type: "offer_recorded",
      title: "Offer recorded",
      at: Date.parse("2026-05-31T16:00:00.000Z"),
      relatedEntityType: "offer",
      relatedEntityId: String(offerId),
    })
    await ctx.db.insert("tasks", {
      userId: user._id,
      applicationId: globexId,
      relatedOfferId: offerId,
      kind: "offer_response",
      title: "Respond to Globex offer",
      dueDate: "2026-06-07",
      timezone: args.timezone,
      status: "pending",
      source: "deadline",
      createdAt: now,
      updatedAt: now,
    })

    const umbrellaId = await insertApplication(ctx, {
      userId: user._id,
      companyName: "Umbrella Labs",
      companyWebsite: "https://umbrella.example",
      roleTitle: "Infrastructure Engineer",
      location: "Austin, TX",
      stage: "saved",
      dateSavedDate: "2026-06-01",
      applicationDeadlineDate: "2026-06-09",
      currentStageEnteredAt: now,
      source: "company_website",
      referralStatus: "need_referral",
      workArrangement: "onsite",
      qualityChecks: await qualitySnapshot(ctx, user._id, ["role-fit"]),
      notes: "Need referral check before applying.",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: umbrellaId,
      stage: "saved",
      enteredAt: now,
    })

    const closedId = await insertApplication(ctx, {
      userId: user._id,
      resume: backendResume,
      companyName: "Stark Systems",
      companyWebsite: "https://stark.example/careers",
      roleTitle: "Staff Backend Engineer",
      location: "Remote",
      stage: "closed",
      dateSavedDate: "2026-04-20",
      dateAppliedDate: "2026-04-22",
      currentStageEnteredAt: Date.parse("2026-05-16T10:00:00.000Z"),
      source: "recruiter",
      referralStatus: "not_checked",
      applicationType: "quick_apply",
      workArrangement: "remote",
      closedAt: Date.parse("2026-05-16T10:00:00.000Z"),
      closedDate: "2026-05-16",
      closedOutcome: "rejected",
      rejectionStage: "technical_screen",
      rejectionReason: "experience_gap",
      rejectionLessons: "Prepare deeper concurrency examples before senior platform screens.",
      qualityChecks: await qualitySnapshot(ctx, user._id, ["role-fit", "skills-reflected"]),
      notes: "Closed as a useful rejection-learning sample.",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: closedId,
      stage: "applied",
      enteredAt: Date.parse("2026-04-22T10:00:00.000Z"),
      exitedAt: Date.parse("2026-05-01T10:00:00.000Z"),
      exitedToStage: "phone_screen",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: closedId,
      stage: "phone_screen",
      enteredAt: Date.parse("2026-05-01T10:00:00.000Z"),
      exitedAt: Date.parse("2026-05-09T10:00:00.000Z"),
      enteredFromStage: "applied",
      exitedToStage: "interview",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: closedId,
      stage: "interview",
      enteredAt: Date.parse("2026-05-09T10:00:00.000Z"),
      exitedAt: Date.parse("2026-05-16T10:00:00.000Z"),
      enteredFromStage: "phone_screen",
      exitedToStage: "closed",
    })
    await insertStage(ctx, {
      userId: user._id,
      applicationId: closedId,
      stage: "closed",
      enteredAt: Date.parse("2026-05-16T10:00:00.000Z"),
      enteredFromStage: "interview",
    })

    await Promise.all([
      ctx.db.insert("winLogEntries", {
        userId: user._id,
        applicationId: acmeId,
        type: "interview_reached",
        title: "Reached Acme system design",
        occurredAt: Date.parse("2026-05-29T14:00:00.000Z"),
        occurredDate: "2026-05-29",
        source: "auto",
        relatedEntityType: "application",
        relatedEntityId: String(acmeId),
        dedupeKey: `${acmeId}:interview_reached`,
        createdAt: now,
      }),
      ctx.db.insert("winLogEntries", {
        userId: user._id,
        applicationId: globexId,
        type: "offer_received",
        title: "Offer from Globex Analytics",
        occurredAt: Date.parse("2026-05-31T16:00:00.000Z"),
        occurredDate: "2026-05-31",
        source: "auto",
        relatedEntityType: "offer",
        relatedEntityId: String(offerId),
        dedupeKey: `${globexId}:offer_received`,
        createdAt: now,
      }),
      ctx.db.insert("winLogEntries", {
        userId: user._id,
        type: "resume_improved",
        title: "Tightened platform reliability resume bullets",
        occurredAt: Date.parse("2026-06-01T09:00:00.000Z"),
        occurredDate: "2026-06-01",
        source: "manual",
        relatedEntityType: "resume",
        relatedEntityId: String(backendResumeId),
        createdAt: now,
      }),
      ctx.db.insert("weeklyGoals", {
        userId: user._id,
        weekStartDate: "2026-06-01",
        timezone: args.timezone,
        applicationsSentTarget: 8,
        followUpsSentTarget: 5,
        interviewsReachedTarget: 2,
        resumeImprovementsTarget: 1,
        manualResumeImprovements: 1,
        lessonsLearned: "Seeded sample: prioritize referrals before quick apply.",
        nextWeekFocus: "Convert saved roles into tailored applications.",
        createdAt: now,
        updatedAt: now,
      }),
    ])

    return {
      userId: user._id,
      applications: 4,
      resumes: 2,
      tasks: 2,
      contacts: 1,
      interviews: 1,
      offers: 1,
      reset: args.reset,
    }
  },
})

export const demo = action({
  args: {
    confirm: v.literal("seed-demo-data"),
    reset: v.optional(v.boolean()),
    authSubject: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SeedResult> => {
    const email = args.email ?? "seed-user@example.com"
    const storedResumes = await Promise.all(
      demoResumeFiles.map(async (file) => {
        const blob = new Blob([minimalPdf(file.body)], { type: "application/pdf" })
        return {
          label: file.label,
          fileName: file.fileName,
          storageId: await ctx.storage.store(blob),
          sizeBytes: blob.size,
        }
      })
    )

    return await ctx.runMutation(insertDemoReference, {
      reset: args.reset ?? false,
      authSubject: args.authSubject ?? `seed:${email}`,
      tokenIdentifier: args.tokenIdentifier ?? `seed:${email}`,
      email,
      name: args.name ?? "Seed User",
      timezone: args.timezone ?? "UTC",
      resumes: storedResumes,
    })
  },
})
