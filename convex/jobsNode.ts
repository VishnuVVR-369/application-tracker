"use node"

import { v } from "convex/values"
import { z } from "zod"

import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"
import { generateWriting, RetryableWritingError, writingError } from "./writingAi"

const postingSchema = z.strictObject({
  isJobPosting: z.boolean(),
  acceptingApplications: z.boolean(),
  company: z.string().max(200),
  role: z.string().max(300),
  location: z.string().max(300),
  workMode: z.enum(["onsite", "hybrid", "remote", "unknown"]),
  salaryText: z.string().max(300),
  postedText: z.string().max(200),
  description: z.string().max(60_000),
})

const instructions = `You read the text of one job posting page from a job portal (LinkedIn or Naukri) and pull out the job's details.
The page text includes navigation, ads, other recommended jobs and the portal's own prompts. Use only the main posting.

Return:
- isJobPosting: false when the page is not a single job posting (a login page, a search page, an error page). Then leave the other text fields empty.
- acceptingApplications: false when the page says the posting is closed or no longer accepting applications.
- company: the hiring company's name as written. Not the portal, not a staffing agency's tagline.
- role: the job title as written.
- location: the location as written, for example "Bengaluru, Karnataka, India". Empty if not stated.
- workMode: onsite, hybrid or remote when the page says so, otherwise unknown.
- salaryText: the pay as written, for example "₹25-35 Lacs P.A.". Empty when not disclosed.
- postedText: when it was posted, as written, for example "3 days ago". Empty if not shown.
- description: the job description section copied exactly, line by line, with the same words in the same order. Keep its headings and bullet lines; drop list markers if you like, but never reword, summarize, merge or reorder lines. Leave out portal text such as "Show more", "Apply", company follower counts, recruiter cards and similar jobs.`

/** Reads one posting's page text into a job. Runs on the jobs pool, which retries passing failures. */
export const extractPosting = internalAction({
  args: { id: v.id("jobPostings"), pageTextHash: v.string() },
  handler: async (ctx, args) => {
    const posting = await ctx.runQuery(internal.jobs.getForExtraction, args)
    if (!posting) return
    try {
      const { data } = await generateWriting("job_posting", postingSchema, instructions, posting)
      await ctx.runMutation(internal.jobs.finishExtraction, { ...args, fields: data })
    } catch (error) {
      if (error instanceof RetryableWritingError) throw error
      await ctx.runMutation(internal.jobs.failExtraction, { ...args, error: writingError(error) })
    }
  },
})
