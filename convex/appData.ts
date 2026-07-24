import { v } from "convex/values"

import { query } from "./_generated/server"
import { getCurrentUserDocOrNull } from "./users"

const appDataScope = v.union(
  v.literal("full"),
  v.literal("shell"),
  v.literal("command"),
  v.literal("today"),
  v.literal("pipeline"),
  v.literal("interviews"),
  v.literal("targets"),
  v.literal("prep"),
  v.literal("stories"),
  v.literal("people"),
  v.literal("documents"),
  v.literal("analytics"),
  v.literal("goals"),
  v.literal("failure"),
  v.literal("settings"),
  v.literal("workspace"),
  v.literal("application-detail")
)

type AppDataScope =
  | "full"
  | "shell"
  | "command"
  | "today"
  | "pipeline"
  | "interviews"
  | "targets"
  | "prep"
  | "stories"
  | "people"
  | "documents"
  | "analytics"
  | "goals"
  | "failure"
  | "settings"
  | "workspace"
  | "application-detail"

function includes(scope: AppDataScope, allowed: AppDataScope[]) {
  return scope === "full" || allowed.includes(scope)
}

/**
 * Page-scoped app data. Every response keeps the same normalized shape so
 * components can migrate one at a time, while each subscription only reads
 * the collections needed by its current surface.
 */
export const get = query({
  args: {
    scope: v.optional(appDataScope),
    applicationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDocOrNull(ctx)
    if (!user) {
      return null
    }

    const load = {
      applications: () =>
        ctx.db
          .query("applications")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      resumes: () =>
        ctx.db
          .query("resumes")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      applicationResumeLinks: () =>
        ctx.db
          .query("applicationResumeLinks")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      tasks: () =>
        ctx.db
          .query("tasks")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      activityEvents: () =>
        ctx.db
          .query("activityEvents")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      applicationStageHistory: () =>
        ctx.db
          .query("applicationStageHistory")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      applicationContacts: () =>
        ctx.db
          .query("applicationContacts")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      applicationInterviews: () =>
        ctx.db
          .query("applicationInterviews")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      applicationOffers: () =>
        ctx.db
          .query("applicationOffers")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      weeklyGoals: () =>
        ctx.db
          .query("weeklyGoals")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      winLogEntries: () =>
        ctx.db
          .query("winLogEntries")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      qualityChecklistItems: () =>
        ctx.db
          .query("qualityChecklistItems")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      targetCompanies: () =>
        ctx.db
          .query("targetCompanies")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      referralOutreach: () =>
        ctx.db
          .query("referralOutreach")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      interviewPrepPlans: () =>
        ctx.db
          .query("interviewPrepPlans")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      storyBankEntries: () =>
        ctx.db
          .query("storyBankEntries")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
      storyUsages: () =>
        ctx.db
          .query("storyUsages")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect(),
    }

    const scope = args.scope ?? "full"
    const normalizedApplicationId = args.applicationId
      ? ctx.db.normalizeId("applications", args.applicationId)
      : null
    const focusedApplication =
      (scope === "application-detail" || scope === "shell") && normalizedApplicationId
        ? await ctx.db.get(normalizedApplicationId)
        : null
    const ownedFocusedApplication =
      focusedApplication?.userId === user._id ? focusedApplication : null

    const wantsApplications = includes(scope, [
      "command",
      "today",
      "pipeline",
      "interviews",
      "targets",
      "prep",
      "stories",
      "people",
      "documents",
      "analytics",
      "goals",
      "failure",
    ])

    const [
      settings,
      applications,
      resumes,
      applicationResumeLinks,
      tasks,
      activityEvents,
      applicationStageHistory,
      applicationContacts,
      applicationInterviews,
      applicationOffers,
      weeklyGoals,
      winLogEntries,
      qualityChecklistItems,
      targetCompanies,
      referralOutreach,
      interviewPrepPlans,
      storyBankEntries,
      storyUsages,
    ] = await Promise.all([
      includes(scope, ["shell", "today", "goals", "settings"])
        ? ctx.db
            .query("userSettings")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .unique()
        : null,
      scope === "application-detail" || scope === "shell"
        ? Promise.resolve(ownedFocusedApplication ? [ownedFocusedApplication] : [])
        : wantsApplications
          ? load.applications()
          : Promise.resolve([]),
      includes(scope, ["command", "pipeline", "documents", "analytics", "workspace", "application-detail"])
        ? load.resumes()
        : Promise.resolve([]),
      scope === "full"
        ? load.applicationResumeLinks()
        : Promise.resolve([]),
      includes(scope, ["today", "goals"])
        ? load.tasks()
        : scope === "application-detail" && ownedFocusedApplication
          ? ctx.db
              .query("tasks")
              .withIndex("by_userId_and_applicationId", (q) =>
                q.eq("userId", user._id).eq("applicationId", ownedFocusedApplication._id)
              )
              .collect()
          : Promise.resolve([]),
      includes(scope, ["today", "analytics"])
        ? load.activityEvents()
        : scope === "application-detail" && ownedFocusedApplication
          ? ctx.db
              .query("activityEvents")
              .withIndex("by_userId_and_applicationId", (q) =>
                q.eq("userId", user._id).eq("applicationId", ownedFocusedApplication._id)
              )
              .collect()
          : Promise.resolve([]),
      scope === "analytics"
        ? load.applicationStageHistory()
        : scope === "application-detail" && ownedFocusedApplication
          ? ctx.db
              .query("applicationStageHistory")
              .withIndex("by_userId_and_applicationId", (q) =>
                q.eq("userId", user._id).eq("applicationId", ownedFocusedApplication._id)
              )
              .collect()
          : scope === "full"
            ? load.applicationStageHistory()
            : Promise.resolve([]),
      includes(scope, ["command", "pipeline", "interviews", "people", "workspace"])
        ? load.applicationContacts()
        : scope === "application-detail" && ownedFocusedApplication
          ? ctx.db
              .query("applicationContacts")
              .withIndex("by_userId_and_applicationId", (q) =>
                q.eq("userId", user._id).eq("applicationId", ownedFocusedApplication._id)
              )
              .collect()
          : Promise.resolve([]),
      includes(scope, ["today", "pipeline", "interviews", "stories", "failure"])
        ? load.applicationInterviews()
        : scope === "application-detail" && ownedFocusedApplication
          ? ctx.db
              .query("applicationInterviews")
              .withIndex("by_userId_and_applicationId", (q) =>
                q.eq("userId", user._id).eq("applicationId", ownedFocusedApplication._id)
              )
              .collect()
          : Promise.resolve([]),
      scope === "today"
        ? load.applicationOffers()
        : scope === "application-detail" && ownedFocusedApplication
          ? ctx.db
              .query("applicationOffers")
              .withIndex("by_userId_and_applicationId", (q) =>
                q.eq("userId", user._id).eq("applicationId", ownedFocusedApplication._id)
              )
              .collect()
          : scope === "full"
            ? load.applicationOffers()
            : Promise.resolve([]),
      includes(scope, ["today", "goals"])
        ? load.weeklyGoals()
        : Promise.resolve([]),
      includes(scope, ["today", "goals"])
        ? load.winLogEntries()
        : Promise.resolve([]),
      scope === "settings"
        ? load.qualityChecklistItems()
        : scope === "full"
          ? load.qualityChecklistItems()
          : Promise.resolve([]),
      includes(scope, ["targets", "prep", "workspace"])
        ? load.targetCompanies()
        : Promise.resolve([]),
      includes(scope, ["targets", "failure"])
        ? load.referralOutreach()
        : Promise.resolve([]),
      includes(scope, ["prep", "workspace", "failure"])
        ? load.interviewPrepPlans()
        : Promise.resolve([]),
      includes(scope, ["stories", "workspace", "failure"])
        ? load.storyBankEntries()
        : Promise.resolve([]),
      scope === "stories" || scope === "full"
        ? load.storyUsages()
        : Promise.resolve([]),
    ])

    const shouldResolveResumeUsage = scope === "documents" || scope === "full"
    const resumeUsageEntries = shouldResolveResumeUsage
      ? await Promise.all(
          resumes.map(async (resume) => {
            const usedIn = applications.filter(
              (application) => application.currentResumeId === resume._id
            )
            const url = await ctx.storage.getUrl(resume.storageId)
            return [
              resume._id,
              {
                count: usedIn.length,
                applicationIds: usedIn.map((application) => application._id),
                url,
              },
            ] as const
          })
        )
      : []

    return {
      user,
      settings,
      applications,
      resumes,
      resumeUsage: Object.fromEntries(resumeUsageEntries),
      applicationResumeLinks,
      tasks,
      activityEvents,
      applicationStageHistory,
      applicationContacts,
      applicationInterviews,
      applicationOffers,
      weeklyGoals,
      winLogEntries,
      qualityChecklistItems,
      targetCompanies,
      referralOutreach,
      interviewPrepPlans,
      storyBankEntries,
      storyUsages,
    }
  },
})
