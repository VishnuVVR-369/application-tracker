import { Workpool } from "@convex-dev/workpool"

import { components } from "./_generated/api"

/**
 * Model work for collected jobs. Three at a time keeps a batch of postings within OpenAI's rate limits;
 * actions that throw a RetryableWritingError are retried with backoff.
 */
export const jobsPool = new Workpool(components.jobsPool, {
  maxParallelism: 3,
  retryActionsByDefault: false,
  defaultRetryBehavior: { maxAttempts: 4, initialBackoffMs: 5_000, base: 3 },
  logLevel: "WARN",
})
