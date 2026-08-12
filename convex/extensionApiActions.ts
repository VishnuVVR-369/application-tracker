"use node"

import { createHash } from "node:crypto"

import { v } from "convex/values"

import { internal } from "./_generated/api"
import { action } from "./_generated/server"
import type { ExtensionApiResult } from "./extensionApiTypes"
import { extensionOperation } from "./extensionApiValidators"

export const execute = action({
  args: {
    token: v.string(),
    operation: extensionOperation,
  },
  handler: async (ctx, args): Promise<ExtensionApiResult> => {
    const tokenHash = createHash("sha256").update(args.token).digest("hex")
    return await ctx.runMutation(internal.extensionApi.executeInternal, {
      tokenHash,
      operation: args.operation,
    }) as ExtensionApiResult
  },
})
