import { ConvexError } from "convex/values"

/** Turns a failed Convex call into a sentence fit for a toast. */
export function errorMessage(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data
  return "Something went wrong. Please try again."
}
