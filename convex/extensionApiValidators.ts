import { v } from "convex/values"

const extensionStage = v.union(v.literal("saved"), v.literal("applied"))
const extensionWorkArrangement = v.union(
  v.literal("remote"),
  v.literal("hybrid"),
  v.literal("onsite")
)
const extensionCompensationPeriod = v.union(
  v.literal("hour"),
  v.literal("day"),
  v.literal("month"),
  v.literal("year"),
  v.literal("contract"),
  v.literal("unknown")
)

const capture = v.object({
  jobId: v.string(),
  postingUrl: v.string(),
  companyName: v.string(),
  roleTitle: v.string(),
  stage: extensionStage,
  location: v.optional(v.string()),
  workArrangement: v.optional(extensionWorkArrangement),
  compensationMin: v.optional(v.number()),
  compensationMax: v.optional(v.number()),
  compensationCurrency: v.optional(v.string()),
  compensationPeriod: v.optional(extensionCompensationPeriod),
  compensationNotes: v.optional(v.string()),
  jobDescriptionSnapshot: v.optional(v.string()),
  notes: v.optional(v.string()),
})

export const extensionOperation = v.union(
  v.object({ type: v.literal("test") }),
  v.object({
    type: v.literal("lookup"),
    jobId: v.string(),
    postingUrl: v.string(),
  }),
  v.object({ type: v.literal("create"), capture }),
  v.object({
    type: v.literal("refresh"),
    applicationId: v.id("applications"),
    capture,
  }),
  v.object({
    type: v.literal("undo"),
    applicationId: v.id("applications"),
  })
)
