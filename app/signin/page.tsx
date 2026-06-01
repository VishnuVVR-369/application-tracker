import Link from "next/link"
import { redirect } from "next/navigation"

import { SignInClient } from "@/components/application-tracker/signin-client"
import { hasConvexAuthEnv, isAuthenticated } from "@/lib/auth-server"

export default async function SignInPage() {
  if (hasConvexAuthEnv() && (await isAuthenticated())) {
    redirect("/app")
  }

  return (
    <main className="min-h-screen bg-surface-0 px-4 py-10 text-ink-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="micro-label mb-6">
          Application Tracker
        </Link>
        <section className="rounded-lg border border-line bg-surface-2 p-6 shadow-overlay">
          <p className="micro-label mb-2">OAuth</p>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-ink-300">
            Use GitHub or Google. Email/password is intentionally disabled for v1.
          </p>
          <div className="mt-6">
            <SignInClient />
          </div>
        </section>
      </div>
    </main>
  )
}

