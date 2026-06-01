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
      reminders,
      activityEvents,
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
        .query("reminders")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("activityEvents")
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
        const usedIn = await ctx.db
          .query("applications")
          .withIndex("by_userId_and_resumeId", (q) =>
            q.eq("userId", user._id).eq("resumeId", resume._id)
          )
          .collect()
        const url = await ctx.storage.getUrl(resume.storageId)
        return [resume._id, { count: usedIn.length, applicationIds: usedIn.map((app) => app._id), url }] as const
      })
    )

    return {
      user,
      settings,
      applications,
      resumes,
      resumeUsage: Object.fromEntries(resumeUsageEntries),
      reminders,
      activityEvents,
      weeklyGoals,
      winLogEntries,
      qualityChecklistItems,
    }
  },
})
