import { z } from "zod"

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).optional()

export const extensionCaptureSchema = z.object({
  jobId: z.string().trim().max(40),
  postingUrl: z.url().max(2_000),
  companyName: z.string().trim().min(1).max(300),
  roleTitle: z.string().trim().min(1).max(300),
  stage: z.enum(["saved", "applied"]),
  location: optionalTrimmedString(300),
  workArrangement: z.enum(["remote", "hybrid", "onsite"]).optional(),
  compensationMin: z.number().finite().nonnegative().optional(),
  compensationMax: z.number().finite().nonnegative().optional(),
  compensationCurrency: optionalTrimmedString(12),
  compensationPeriod: z
    .enum(["hour", "day", "month", "year", "contract", "unknown"])
    .optional(),
  compensationNotes: optionalTrimmedString(2_000),
  jobDescriptionSnapshot: optionalTrimmedString(100_000),
  notes: optionalTrimmedString(10_000),
})

export const extensionOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("test") }),
  z.object({
    type: z.literal("lookup"),
    jobId: z.string().trim().max(40),
    postingUrl: z.url().max(2_000),
  }),
  z.object({ type: z.literal("create"), capture: extensionCaptureSchema }),
  z.object({
    type: z.literal("refresh"),
    applicationId: z.string().min(1).max(100),
    capture: extensionCaptureSchema,
  }),
  z.object({
    type: z.literal("undo"),
    applicationId: z.string().min(1).max(100),
  }),
])

export const extensionRequestSchema = z.object({
  operation: extensionOperationSchema,
})

export type ExtensionCaptureInput = z.infer<typeof extensionCaptureSchema>
export type ExtensionOperation = z.infer<typeof extensionOperationSchema>
