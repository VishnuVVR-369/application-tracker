import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react"

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
              <Sparkles className="size-5" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">
              Sign in to your tracker. We use OAuth only — email and password are
              intentionally disabled for v1.
            </p>

            <div className="mt-6">
              <SignInClient />
            </div>

            <p className="mt-6 flex items-center gap-2 border-t border-line/70 pt-5 text-xs text-ink-500">
              <ShieldCheck className="size-3.5 text-status-up" />
              Single-user account · your data stays yours
            </p>
          </section>
        </div>
      </FadeIn>
    </main>
  )
}
