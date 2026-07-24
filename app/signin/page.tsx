import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ShieldCheck } from "lucide-react"

import { ApplicationTrackerMark } from "@/components/application-tracker/application-tracker-mark"
import { SignInClient } from "@/components/application-tracker/signin-client"
import { FadeIn, MeshBackground } from "@/components/application-tracker/atmosphere"
import { hasConvexAuthEnv, isAuthenticated } from "@/lib/auth-server"

export default async function SignInPage() {
  if (hasConvexAuthEnv() && (await isAuthenticated())) {
    redirect("/app")
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-ink-100">
      <MeshBackground variant="hero" />

      <FadeIn className="w-full max-w-md" y={20}>
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-300 transition-colors hover:text-ink-100"
        >
          <ArrowLeft className="size-4" />
          Back home
        </Link>

        <div className="gradient-ring grain relative rounded-2xl">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 -z-10 rounded-full bg-brand/15 blur-3xl"
          />
          <section className="glass-strong rounded-2xl p-7 shadow-overlay">
            <span className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-brand-hover to-brand text-primary-foreground shadow-glow">
              <ApplicationTrackerMark className="size-5" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">
              Pick up your job search right where you left off.
            </p>

            <div className="mt-6">
              <SignInClient />
            </div>

            <p className="mt-6 flex items-center gap-2 border-t border-line/70 pt-5 text-xs text-ink-500">
              <ShieldCheck className="size-3.5 text-status-up" />
              Your search stays private to you
            </p>
          </section>
        </div>
      </FadeIn>
    </main>
  )
}
