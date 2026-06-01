import { query } from "./_generated/server"
import { getCurrentUserDocOrNull } from "./users"

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserDocOrNull(ctx)
    if (!user) {
      return null
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
    ] = await Promise.all([
      ctx.db
        .query("userSettings")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique(),
      ctx.db
        .query("applications")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("resumes")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("applicationResumeLinks")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("tasks")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("activityEvents")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("applicationStageHistory")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("applicationContacts")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("applicationInterviews")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("applicationOffers")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("weeklyGoals")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("winLogEntries")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("qualityChecklistItems")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
    ])

    const resumeUsageEntries = await Promise.all(
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
    }
  },
})
