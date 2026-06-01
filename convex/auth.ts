import { query } from "./_generated/server"
import { authComponent } from "./betterAuth/auth"

export const { getAuthUser } = authComponent.clientApi()

export const getCurrentIdentity = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.auth.getUserIdentity()
  },
})
