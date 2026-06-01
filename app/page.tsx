import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, BarChart3, CheckCircle2, FileText, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import { hasConvexAuthEnv, isAuthenticated } from "@/lib/auth-server"

export default async function Home() {
  if (hasConvexAuthEnv() && (await isAuthenticated())) {
    redirect("/app")
  }

  return (
    <main className="min-h-screen bg-surface-0 text-ink-100">
      <section className="border-b border-line px-4 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="font-semibold">
            Application Tracker
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signin">
                Start tracking
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="micro-label mb-4">personal job search operations</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Application Tracker
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
              Track every application from saved to closed, keep resumes and deadlines attached,
              understand what is working, and hold a steady weekly cadence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signin">
                  Start with OAuth
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/signin">View sign in</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface-2 p-4 shadow-overlay">
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-md border border-line bg-surface-1 p-3">
                <span className="micro-label">Dashboard</span>
                <span className="rounded-md bg-brand-weak px-2 py-1 text-xs text-brand">live</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Applied 12", "Interview 4", "Offer 1"].map((item) => (
                  <div key={item} className="rounded-md border border-line bg-surface-1 p-4">
                    <p className="font-mono text-2xl tabular">{item.split(" ")[1]}</p>
                    <p className="text-xs text-ink-500">{item.split(" ")[0]}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {["saved", "applied", "interview"].map((stage) => (
                  <div key={stage} className="min-h-40 rounded-md border border-line bg-surface-1 p-3">
                    <p className="micro-label">{stage}</p>
                    <div className="mt-4 grid gap-2">
                      <div className="rounded-md bg-surface-3 p-3">
                        <p className="text-xs text-ink-500">ACME</p>
                        <p className="text-sm font-medium">Frontend Engineer</p>
                      </div>
                      <div className="rounded-md bg-surface-3 p-3">
                        <p className="text-xs text-ink-500">Globex</p>
                        <p className="text-sm font-medium">Product Engineer</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface-1 px-4 py-14">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-4">
          {[
            ["Track every stage", CheckCircle2],
            ["Attach resumes and deadlines", FileText],
            ["Analyze funnel patterns", BarChart3],
            ["Keep weekly goals", Target],
          ].map(([label, Icon]) => (
            <div key={String(label)} className="rounded-lg border border-line bg-surface-2 p-5">
              <Icon className="size-5 text-brand" />
              <h2 className="mt-4 text-sm font-semibold">{String(label)}</h2>
              <p className="mt-2 text-sm text-ink-300">
                Built around the application record so supporting data stays attributable.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {[
            "Keep every application, timeline event, reminder, offer, and outcome in one place.",
            "Measure conversion by source, referral status, work arrangement, quality, and resume version.",
            "Review wins, lessons, and next-week focus without turning the search into a noisy CRM.",
          ].map((copy, index) => (
            <div key={copy}>
              <p className="micro-label mb-3">0{index + 1}</p>
              <p className="text-lg leading-8 text-ink-300">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Application Tracker</p>
          <Link href="/signin" className="text-brand">
            Sign in with GitHub or Google
          </Link>
        </div>
      </footer>
    </main>
  )
}
