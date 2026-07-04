"use client"

import * as React from "react"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import type { AuthClient } from "@convex-dev/better-auth/react"
import { ConvexReactClient } from "convex/react"

import { authClient } from "@/lib/auth-client"

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210"
)

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: React.ReactNode
  initialToken?: string | null
}) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient as unknown as AuthClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  )
}
