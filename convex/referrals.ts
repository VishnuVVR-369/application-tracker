import { ConvexError, v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type QueryCtx } from "./_generated/server"
import { cleanOptional, getOwned, getUserId, requireText, requireUserId } from "./helpers"
import { referralChannel, referralStatus } from "./schema"

/** Every request a person has received, newest first, labeled with the application it was for. */
async function historyFor(ctx: QueryCtx, personId: Id<"people">) {
  const requests = await ctx.db
    .query("referralRequests")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect()
  const history = await Promise.all(
    requests.map(async (request) => {
      const application = await ctx.db.get(request.applicationId)
      return {
        requestId: request._id,
        applicationId: request.applicationId,
        role: application?.role ?? "Deleted application",
        status: request.status,
        askedAt: request.askedAt,
        respondedAt: request.respondedAt,
      }
    }),
  )
  return history.sort((a, b) => (b.askedAt ?? 0) - (a.askedAt ?? 0))
}

/** Referral requests on one application plus the people at that company who could still be asked. */
export const forApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const application = await ctx.db.get(applicationId)
    if (!application || application.userId !== userId) return null

    const [requests, people] = await Promise.all([
      ctx.db
        .query("referralRequests")
        .withIndex("by_application", (q) => q.eq("applicationId", applicationId))
        .collect(),
      ctx.db
        .query("people")
        .withIndex("by_company", (q) => q.eq("companyId", application.companyId))
        .collect(),
    ])
    const peopleById = new Map(people.map((person) => [person._id, person]))

    const rows = await Promise.all(
      requests.map(async (request) => {
        const person = peopleById.get(request.personId)!
        const history = (await historyFor(ctx, person._id)).filter((entry) => entry.requestId !== request._id)
        return { ...request, person, history }
      }),
    )
    rows.sort((a, b) => a._creationTime - b._creationTime)

    const askedIds = new Set(requests.map((request) => request.personId))
    const candidates = await Promise.all(
      people
        .filter((person) => !askedIds.has(person._id))
        .map(async (person) => ({ ...person, history: await historyFor(ctx, person._id) })),
    )
    candidates.sort((a, b) => a.name.localeCompare(b.name))

    return { requests: rows, candidates }
  },
})

/**
 * Requests awaiting a reply on applications that are still open. The client decides which are past due.
 * Closed applications drop out: there's no point chasing a referral for a job that's over.
 */
export const awaitingReply = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const requests = await ctx.db
      .query("referralRequests")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "asked"))
      .collect()
    const rows = await Promise.all(
      requests.map(async (request) => {
        const application = await ctx.db.get(request.applicationId)
        if (!application || application.status === "closed") return null
        const [person, company] = await Promise.all([
          ctx.db.get(request.personId),
          ctx.db.get(application.companyId),
        ])
        return {
          ...request,
          personName: person?.name ?? "Unknown",
          personTitle: person?.title,
          profileUrl: person?.profileUrl,
          role: application.role,
          company: company?.name ?? "Unknown company",
        }
      }),
    )
    return rows.filter((row) => row !== null)
  },
})

const personFields = {
  name: v.string(),
  title: v.optional(v.string()),
  profileUrl: v.optional(v.string()),
}

function timestampsFor(
  status: Doc<"referralRequests">["status"],
  current: Pick<Doc<"referralRequests">, "askedAt" | "respondedAt"> | null,
  now: number,
) {
  switch (status) {
    case "to_ask":
      return { askedAt: undefined, respondedAt: undefined }
    case "asked":
      return { askedAt: current?.askedAt ?? now, respondedAt: undefined }
    case "referred":
    case "declined":
    case "no_reply":
      return { askedAt: current?.askedAt ?? now, respondedAt: current?.respondedAt ?? now }
  }
}

export const add = mutation({
  args: {
    applicationId: v.id("applications"),
    personId: v.optional(v.id("people")),
    newPerson: v.optional(v.object(personFields)),
    status: referralStatus,
    channel: v.optional(referralChannel),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const application = await getOwned(ctx, userId, args.applicationId)

    let personId: Id<"people">
    if (args.personId) {
      const person = await getOwned(ctx, userId, args.personId)
      if (person.companyId !== application.companyId) throw new ConvexError("That person works at a different company.")
      personId = person._id
    } else if (args.newPerson) {
      personId = await ctx.db.insert("people", {
        userId,
        companyId: application.companyId,
        name: requireText(args.newPerson.name, "Name"),
        title: cleanOptional(args.newPerson.title),
        profileUrl: cleanOptional(args.newPerson.profileUrl),
      })
    } else {
      throw new ConvexError("Pick a person or add a new one.")
    }

    const duplicate = await ctx.db
      .query("referralRequests")
      .withIndex("by_application", (q) => q.eq("applicationId", application._id))
      .filter((q) => q.eq(q.field("personId"), personId))
      .first()
    if (duplicate) throw new ConvexError("This person is already on the referral list.")

    return await ctx.db.insert("referralRequests", {
      userId,
      applicationId: application._id,
      personId,
      status: args.status,
      channel: args.channel,
      ...timestampsFor(args.status, null, Date.now()),
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("referralRequests"),
    status: v.optional(referralStatus),
    channel: v.optional(v.union(referralChannel, v.null())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, channel, notes }) => {
    const userId = await requireUserId(ctx)
    const request = await getOwned(ctx, userId, id)
    const patch: Partial<Doc<"referralRequests">> = {}
    if (status && status !== request.status) {
      Object.assign(patch, timestampsFor(status, request, Date.now()), { status })
      if (status === "to_ask") patch.followedUpAt = undefined
    }
    if (channel !== undefined) patch.channel = channel ?? undefined
    if (notes !== undefined) patch.notes = cleanOptional(notes)
    await ctx.db.patch(id, patch)
  },
})

export const markFollowedUp = mutation({
  args: { id: v.id("referralRequests") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const request = await getOwned(ctx, userId, id)
    if (request.status !== "asked") throw new ConvexError("Only requests awaiting a reply can be followed up.")
    await ctx.db.patch(id, { followedUpAt: Date.now() })
  },
})

export const remove = mutation({
  args: { id: v.id("referralRequests") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await ctx.db.delete(id)
  },
})

export const updatePerson = mutation({
  args: { id: v.id("people"), ...personFields },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await ctx.db.patch(id, {
      name: requireText(fields.name, "Name"),
      title: cleanOptional(fields.title),
      profileUrl: cleanOptional(fields.profileUrl),
    })
  },
})

/** Deletes a person only when no request references them, so referral history is never lost silently. */
export const removePerson = mutation({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    const request = await ctx.db
      .query("referralRequests")
      .withIndex("by_person", (q) => q.eq("personId", id))
      .first()
    if (request) throw new ConvexError("Remove this person's referral requests first.")
    await ctx.db.delete(id)
  },
})
