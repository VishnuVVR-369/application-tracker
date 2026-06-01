"use client"

import { GitBranch } from "lucide-react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function SignInClient() {
  return (
    <div className="grid gap-3">
      <Button
        onClick={() =>
          void authClient.signIn.social({
            provider: "github",
            callbackURL: "/app",
          })
        }
      >
        <GitBranch className="size-4" />
        Continue with GitHub
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          void authClient.signIn.social({
            provider: "google",
            callbackURL: "/app",
          })
        }
      >
        <span className="font-semibold">G</span>
        Continue with Google
      </Button>
    </div>
  )
}
