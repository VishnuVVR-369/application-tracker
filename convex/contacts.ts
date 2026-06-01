import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { dateKeyFromTimestamp, normalizeEmail, normalizeKey, removeUndefined } from "./model"
import { contactRelationshipType } from "./schema"
import { getCurrentUserDoc } from "./users"

export const listForApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application || application.userId !== user._id) {
      return []
    }

    return await ctx.db
      .query("applicationContacts")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .collect()
  },
})

export const create = mutation({
  args: {
    applicationId: v.id("applications"),
    name: v.string(),
    relationshipType: contactRelationshipType,
    relationshipDetail: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const application = await ctx.db.get(args.applicationId)
    if (!application || application.userId !== user._id) {
      throw new Error("Application not found")
    }

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
      linkedinUrl: args.linkedinUrl,
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
      source: "auto",
      actorType: "system",
      eventAt: now,
      eventDate: dateKeyFromTimestamp(now),
      relatedEntityType: "contact",
      relatedEntityId: String(contactId),
      createdAt: now,
    })

    return contactId
  },
})

export const update = mutation({
  args: {
    id: v.id("applicationContacts"),
    name: v.optional(v.string()),
    relationshipType: v.optional(contactRelationshipType),
    relationshipDetail: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const contact = await ctx.db.get(args.id)
    if (!contact || contact.userId !== user._id) {
      throw new Error("Contact not found")
    }
    const now = Date.now()
    await ctx.db.patch(
      args.id,
      removeUndefined({
        name: args.name,
        normalizedName: args.name ? normalizeKey(args.name) : undefined,
        relationshipType: args.relationshipType,
        relationshipDetail: args.relationshipDetail,
        roleTitle: args.roleTitle,
        email: args.email,
        normalizedEmail: args.email ? normalizeEmail(args.email) : undefined,
        phone: args.phone,
        linkedinUrl: args.linkedinUrl,
        notes: args.notes,
        archived: args.archived,
        archivedAt:
          args.archived === undefined
            ? undefined
            : args.archived
              ? contact.archivedAt ?? now
              : undefined,
        updatedAt: now,
      })
    )
  },
})
