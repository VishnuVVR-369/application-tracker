import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"

const crons = cronJobs()

crons.daily(
  "auto-close ghosted applications",
  { hourUTC: 6, minuteUTC: 30 },
  internal.ghosting.autoCloseGhosted,
  {}
)

export default crons
