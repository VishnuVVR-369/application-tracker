import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, type MutationCtx } from "./_generated/server"
import { canonicalizeUrl, dateKeyFromTimestamp, normalizeEmail, normalizeKey, removeUndefined } from "./model"
import { contactRelationshipType } from "./schema"
import { getCurrentUserDoc } from "./users"

async function ensureApplication(
  ctx: MutationCtx,
  applicationId: Id<"applications">,
  userId: Id<"users">
) {
  const application = await ctx.db.get(applicationId)
  if (!application || application.userId !== userId) {
    throw new Error("Application not found")
  }
  return application
}

async function ensureContact(
  ctx: MutationCtx,
  contactId: Id<"applicationContacts">,
  userId: Id<"users">
) {
  const contact = await ctx.db.get(contactId)
  if (!contact || contact.userId !== userId) {
    throw new Error("Contact not found")
  }
  return contact
}

const optionalContactFields = {
  relationshipDetail: v.optional(v.string()),
  roleTitle: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  notes: v.optional(v.string()),
}

export const create = mutation({
  args: {
    applicationId: v.id("applications"),
    name: v.string(),
    relationshipType: contactRelationshipType,
    ...optionalContactFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ensureApplication(ctx, args.applicationId, user._id)

    const now = Date.now()
    const contactId = await ctx.db.insert("applicationContacts", {
      userId: user._id,
      applicationId: args.applicationId,
      name: args.name,
      normalizedName: normalizeKey(args.name),
      relationshipType: args.relationshipType,
      relationshipDetail: args.relationshipDetail,
      roleTitle: args.roleTitle,
      email: args.email,
      normalizedEmail: normalizeEmail(args.email),
      phone: args.phone,
      linkedinUrl: canonicalizeUrl(args.linkedinUrl),
      notes: args.notes,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert("activityEvents", {
      userId: user._id,
      applicationId: args.applicationId,
      type: "contact_added",
      title: `Added contact: ${args.name}`,
      description: args.roleTitle ? `${args.roleTitle} · ${application.companyName}` : undefined,
      source: "auto",
      actorType: "system",
      eventAt: now,
      eventDate: dateKeyFromTimestamp(now),
      relatedEntityType: "contact",
      relatedEntityId: String(contactId),
      createdAt: now,
    })

    await ctx.db.patch(args.applicationId, { lastActivityAt: now, updatedAt: now })
    return contactId
  },
})

export const update = mutation({
  args: {
    id: v.id("applicationContacts"),
    name: v.optional(v.string()),
    relationshipType: v.optional(contactRelationshipType),
    archived: v.optional(v.boolean()),
    ...optionalContactFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    await ensureContact(ctx, args.id, user._id)

    const now = Date.now()
    const patch = removeUndefined({
      name: args.name,
      normalizedName: args.name === undefined ? undefined : normalizeKey(args.name),
      relationshipType: args.relationshipType,
      relationshipDetail: args.relationshipDetail,
      roleTitle: args.roleTitle,
      email: args.email,
      normalizedEmail: args.email === undefined ? undefined : normalizeEmail(args.email),
      phone: args.phone,
      linkedinUrl: args.linkedinUrl === undefined ? undefined : canonicalizeUrl(args.linkedinUrl),
      notes: args.notes,
      archived: args.archived,
      archivedAt:
        args.archived === undefined ? undefined : args.archived ? now : undefined,
      updatedAt: now,
    }) as Partial<Doc<"applicationContacts">>

    await ctx.db.patch(args.id, patch)
  },
})

export const remove = mutation({
  args: { id: v.id("applicationContacts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const contact = await ensureContact(ctx, args.id, user._id)

    // Detach this contact from any interviews that reference it so we never
    // leave a dangling id behind.
    const interviews = await ctx.db
      .query("applicationInterviews")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", contact.applicationId))
      .collect()
    const now = Date.now()
    await Promise.all(
      interviews
        .filter((interview) => interview.contactIds.includes(args.id))
        .map((interview) =>
          ctx.db.patch(interview._id, {
            contactIds: interview.contactIds.filter((id) => id !== args.id),
            updatedAt: now,
          })
        )
    )

    await ctx.db.delete(args.id)
  },
})
