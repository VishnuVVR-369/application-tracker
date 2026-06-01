import { query } from "./_generated/server"
import { getCurrentUserDoc } from "./users"

export const sourceData = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserDoc(ctx)
    const [applications, reminders, activityEvents] = await Promise.all([
      ctx.db
        .query("applications")
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
    ])

    return { applications, reminders, activityEvents }
  },
})

