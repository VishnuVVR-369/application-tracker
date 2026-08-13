"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Share2, ShieldCheck } from "lucide-react"

import { ApplicationTrackerMark } from "@/components/application-tracker/application-tracker-mark"
import { SignInClient } from "@/components/application-tracker/signin-client"
import { authClient } from "@/lib/auth-client"
import {
  MOBILE_CAPTURE_STORAGE_KEY,
  parseAndroidShare,
} from "@/lib/mobile-share"

export function CaptureIngress({
  share,
}: {
  share: { title?: string; text?: string; url?: string }
}) {
  const router = useRouter()
  const session = authClient.useSession()
  const [storageError, setStorageError] = React.useState(false)
  const { title, text, url } = share
  React.useEffect(() => {
    const draft = parseAndroidShare({ title, text, url })
    let stored = false
    try {
      sessionStorage.setItem(MOBILE_CAPTURE_STORAGE_KEY, JSON.stringify(draft))
      stored = true
    } catch {}
    // This state reflects a browser storage side effect that can only run after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorageError(!stored)
    if (stored && !session.isPending && session.data) {
      router.replace("/app/capture")
    }
  }, [router, session.data, session.isPending, text, title, url])

  const waiting = session.isPending || (Boolean(session.data) && !storageError)

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-ink-100">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface-2/95 p-7 shadow-overlay">
        <span className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-brand-hover to-brand text-primary-foreground shadow-glow">
          <ApplicationTrackerMark className="size-5" />
        </span>
        <p className="micro-label mt-5 flex items-center gap-1.5">
          <Share2 className="size-3.5" />
          Android share
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Review before saving</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          The shared job is held temporarily in this browser. Nothing is added to your tracker until you confirm it.
        </p>

        <div className="mt-6">
          {storageError ? (
            <div className="rounded-xl border border-status-warn/35 bg-status-warn/10 px-4 py-3 text-sm text-ink-300">
              This browser blocked temporary storage, so the shared job could not be held. Allow site storage and share the job again.
            </div>
          ) : waiting ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-1/60 px-4 py-3 text-sm text-ink-300">
              <LoaderCircle className="size-4 animate-spin text-brand" />
              Opening secure capture…
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm font-medium">Sign in to continue</p>
              <SignInClient callbackURL="/app/capture" />
            </>
          )}
        </div>

        <p className="mt-6 flex items-start gap-2 border-t border-line/70 pt-5 text-xs leading-relaxed text-ink-500">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-status-up" />
          The share link is kept in this tab only and expires after 30 minutes.
        </p>
      </div>
    </main>
  )
}
