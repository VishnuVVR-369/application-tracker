import { query } from "./_generated/server"
import { getCurrentUserDoc } from "./users"

export const all = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserDoc(ctx)
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

    return {
      exportedAt: new Date().toISOString(),
      user,
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
    }
  },
})
