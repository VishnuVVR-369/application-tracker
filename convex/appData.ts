import { v, type Infer } from "convex/values"

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

export type AppDataScope = Infer<typeof appDataScope>

function includes(scope: AppDataScope, allowed: AppDataScope[]) {
  return scope === "full" || allowed.includes(scope)
}

/**
 * Collections that fall back to an applicationId-scoped read (instead of an
 * empty array) when the scope is "application-detail". Every other scope is
 * governed purely by the declarative full-collection scope lists below.
 */
type DetailScopedTable =
  | "tasks"
  | "activityEvents"
  | "applicationStageHistory"
  | "applicationContacts"
  | "applicationInterviews"
  | "applicationOffers"

/** Scopes that receive the full (all-rows) load for each collection. */
const FULL_COLLECTION_SCOPES: Record<DetailScopedTable, AppDataScope[]> & {
  resumes: AppDataScope[]
  applicationResumeLinks: AppDataScope[]
  weeklyGoals: AppDataScope[]
  winLogEntries: AppDataScope[]
  qualityChecklistItems: AppDataScope[]
  targetCompanies: AppDataScope[]
  referralOutreach: AppDataScope[]
  interviewPrepPlans: AppDataScope[]
  storyBankEntries: AppDataScope[]
  storyUsages: AppDataScope[]
} = {
  tasks: ["today", "goals"],
  activityEvents: ["today", "analytics"],
  applicationStageHistory: ["analytics"],
  applicationContacts: ["command", "pipeline", "interviews", "people", "workspace"],
  applicationInterviews: ["today", "pipeline", "interviews", "stories", "failure"],
  applicationOffers: ["today"],
  resumes: ["command", "pipeline", "documents", "analytics", "workspace", "application-detail"],
  applicationResumeLinks: [],
  weeklyGoals: ["today", "goals"],
  winLogEntries: ["today", "goals"],
  qualityChecklistItems: ["settings"],
  targetCompanies: ["targets", "prep", "workspace"],
  referralOutreach: ["targets", "failure"],
  interviewPrepPlans: ["prep", "workspace", "failure"],
  storyBankEntries: ["stories", "workspace", "failure"],
  storyUsages: ["stories"],
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

    const resolveFullOnly = <T>(scopes: AppDataScope[], loader: () => Promise<T[]>): Promise<T[]> =>
      includes(scope, scopes) ? loader() : Promise.resolve([])

    const resolveDetailScoped = <T>(
      table: DetailScopedTable,
      loader: () => Promise<T[]>
    ): Promise<T[]> => {
      if (includes(scope, FULL_COLLECTION_SCOPES[table])) {
        return loader()
      }
      if (scope === "application-detail" && ownedFocusedApplication) {
        return ctx.db
          .query(table)
          .withIndex("by_userId_and_applicationId", (q) =>
            q.eq("userId", user._id).eq("applicationId", ownedFocusedApplication._id)
          )
          .collect() as Promise<T[]>
      }
      return Promise.resolve([])
    }

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
      resolveFullOnly(FULL_COLLECTION_SCOPES.resumes, load.resumes),
      resolveFullOnly(FULL_COLLECTION_SCOPES.applicationResumeLinks, load.applicationResumeLinks),
      resolveDetailScoped("tasks", load.tasks),
      resolveDetailScoped("activityEvents", load.activityEvents),
      resolveDetailScoped("applicationStageHistory", load.applicationStageHistory),
      resolveDetailScoped("applicationContacts", load.applicationContacts),
      resolveDetailScoped("applicationInterviews", load.applicationInterviews),
      resolveDetailScoped("applicationOffers", load.applicationOffers),
      resolveFullOnly(FULL_COLLECTION_SCOPES.weeklyGoals, load.weeklyGoals),
      resolveFullOnly(FULL_COLLECTION_SCOPES.winLogEntries, load.winLogEntries),
      resolveFullOnly(FULL_COLLECTION_SCOPES.qualityChecklistItems, load.qualityChecklistItems),
      resolveFullOnly(FULL_COLLECTION_SCOPES.targetCompanies, load.targetCompanies),
      resolveFullOnly(FULL_COLLECTION_SCOPES.referralOutreach, load.referralOutreach),
      resolveFullOnly(FULL_COLLECTION_SCOPES.interviewPrepPlans, load.interviewPrepPlans),
      resolveFullOnly(FULL_COLLECTION_SCOPES.storyBankEntries, load.storyBankEntries),
      resolveFullOnly(FULL_COLLECTION_SCOPES.storyUsages, load.storyUsages),
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
