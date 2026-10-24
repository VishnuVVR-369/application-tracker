"use client"

import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react"
import { ConvexReactClient } from "convex/react"
import { ThemeProvider } from "next-themes"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { authClient } from "@/lib/auth-client"

// Expected validation failures (ConvexError) are already shown to the user as toasts, so log them as warnings
// rather than errors. Real crashes still log as errors.
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  logger: {
    log: (...args: unknown[]) => console.log(...args),
    logVerbose: () => {},
    warn: (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) =>
      args.some((arg) => typeof arg === "string" && arg.includes("Uncaught ConvexError"))
        ? console.warn(...args)
        : console.error(...args),
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient as unknown as AuthClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </ThemeProvider>
    </ConvexBetterAuthProvider>
  )
}
