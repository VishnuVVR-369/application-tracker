import { query } from "./_generated/server"
import { authComponent } from "./betterAuth/auth"

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx)
    return user ? { name: user.name, email: user.email, image: user.image ?? null } : null
  },
})
