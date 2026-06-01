import { v } from "convex/values"

import { query } from "./_generated/server"
import { getCurrentUserDoc } from "./users"

export const sourceData = query({
  args: {
    includeArchived: v.boolean(),
    includeClosed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx)
    const [applications, activityEvents, resumes, stageHistory] = await Promise.all([
      ctx.db
        .query("applications")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("activityEvents")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("resumes")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("applicationStageHistory")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
    ])

    return {
      applications: applications.filter((application) => {
        if (!args.includeArchived && application.archived) return false
        if (!args.includeClosed && application.stage === "closed") return false
        return true
      }),
      allApplications: applications,
      activityEvents,
      resumes,
      stageHistory,
    }
  },
})
