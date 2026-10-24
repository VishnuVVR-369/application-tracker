"use client"

import { Loader2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { LogoMark } from "@/components/logo-mark"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

function GitHubIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

export function SignIn() {
  const [pending, setPending] = useState(false)

  async function signIn() {
    setPending(true)
    const { error } = await authClient.signIn.social({ provider: "github", callbackURL: window.location.href })
    if (error) {
      setPending(false)
      toast.error(error.message ?? "Couldn't start GitHub sign-in.")
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <span className="mb-8 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <LogoMark className="size-5" />
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">Send more applications</h1>
        <p className="mt-3 text-sm text-balance text-muted-foreground">
          Set a weekly goal and watch it fill up. Save jobs, check your resume against each one, line up referrals, and
          track every application to the end.
        </p>
        <Button size="lg" className="mt-8 w-full" onClick={signIn} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <GitHubIcon />}
          Continue with GitHub
        </Button>
      </div>
    </div>
  )
}
