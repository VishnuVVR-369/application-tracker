import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileText,
  GitBranch,
  LineChart,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  FadeIn,
  MeshBackground,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/application-tracker/atmosphere"
import { hasConvexAuthEnv, isAuthenticated } from "@/lib/auth-server"

const PILLARS = [
  {
    icon: CheckCircle2,
    title: "Track every stage",
    body: "Move applications from saved to closed on a board that logs every transition automatically.",
  },
  {
    icon: FileText,
    title: "Attach what matters",
    body: "Resumes, deadlines, reminders, and outcomes stay pinned to the application they belong to.",
  },
  {
    icon: BarChart3,
    title: "See what's working",
    body: "Funnel conversion, timing, and rejection patterns — by source, referral, and resume version.",
  },
  {
    icon: Target,
    title: "Hold a cadence",
    body: "Weekly goals, a win log, and a short review keep momentum without turning into a noisy CRM.",
  },
] as const

const STAGES = [
  { label: "Saved", count: 4, cls: "text-stage-saved bg-stage-saved/15 border-stage-saved/30" },
  { label: "Applied", count: 12, cls: "text-stage-applied bg-stage-applied/15 border-stage-applied/30" },
  { label: "Phone", count: 3, cls: "text-stage-phone bg-stage-phone/15 border-stage-phone/30" },
  { label: "Interview", count: 2, cls: "text-stage-interview bg-stage-interview/15 border-stage-interview/30" },
  { label: "Offer", count: 1, cls: "text-stage-offer bg-stage-offer/15 border-stage-offer/30" },
  { label: "Closed", count: 9, cls: "text-stage-closed bg-stage-closed/15 border-stage-closed/30" },
] as const

export default async function Home() {
  if (hasConvexAuthEnv() && (await isAuthenticated())) {
    redirect("/app")
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-ink-100">
      <MeshBackground variant="hero" />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30">
        <div className="glass border-b border-line/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <span className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-brand-hover to-brand text-primary-foreground shadow-glow">
                <Sparkles className="size-4" />
              </span>
              Application Tracker
            </Link>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signin">
                  Start tracking
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative px-4 pb-20 pt-16 sm:pt-24 lg:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <FadeIn delay={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-weak px-3 py-1 text-xs font-medium text-brand">
                <span className="size-1.5 rounded-full bg-brand shadow-glow" />
                Personal job-search operations
              </span>
            </FadeIn>
            <FadeIn delay={0.08}>
              <h1 className="mt-5 text-balance text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">
                Run your job search
                <br />
                like a <span className="text-gradient">product.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
                Track every application from saved to closed, keep resumes and deadlines
                attached, understand what&apos;s converting, and hold a steady weekly cadence —
                all in one calm, dark-first dashboard.
              </p>
            </FadeIn>
            <FadeIn delay={0.24}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-11 px-5 text-sm">
                  <Link href="/signin">
                    Start with OAuth
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="h-11 px-5 text-sm">
                  <Link href="/signin">
                    <GitBranch className="size-4" />
                    GitHub &amp; Google
                  </Link>
                </Button>
              </div>
            </FadeIn>
            <FadeIn delay={0.32}>
              <p className="mt-5 font-mono text-xs tracking-wide text-ink-500">
                No email/password · Six stages · Built around the application
              </p>
            </FadeIn>
          </div>

          {/* Product mockup */}
          <FadeIn delay={0.2} y={28}>
            <div className="gradient-ring grain relative rounded-2xl">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-brand/15 blur-3xl"
              />
              <div className="glass-strong rounded-2xl p-3 shadow-overlay sm:p-4">
                {/* mock top bar */}
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-1/80 px-3 py-2">
                  <span className="micro-label">Dashboard</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-status-up/30 bg-status-up/10 px-2 py-0.5 text-[10px] font-medium text-status-up">
                    <span className="size-1.5 rounded-full bg-status-up" />
                    live
                  </span>
                </div>

                {/* KPIs */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    ["18", "Active"],
                    ["6.4d", "First response"],
                    ["1", "Offer"],
                  ].map(([v, l]) => (
                    <div key={l} className="rounded-xl border border-line bg-surface-1/80 p-3">
                      <p className="font-mono text-2xl font-semibold tabular text-ink-100">{v}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">{l}</p>
                    </div>
                  ))}
                </div>

                {/* mini board */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { stage: "Applied", cls: "text-stage-applied", items: ["ACME · FE Eng", "Globex · BE"] },
                    { stage: "Interview", cls: "text-stage-interview", items: ["Hooli · FE", "Initech · FS"] },
                    { stage: "Offer", cls: "text-stage-offer", items: ["Piedmont · Lead"] },
                  ].map((col) => (
                    <div key={col.stage} className="rounded-xl border border-line bg-surface-1/60 p-2.5">
                      <p className={`micro-label ${col.cls}`}>{col.stage}</p>
                      <div className="mt-2 grid gap-2">
                        {col.items.map((it) => (
                          <div
                            key={it}
                            className="rounded-lg border border-line bg-surface-2/80 p-2.5"
                          >
                            <p className="text-[10px] text-ink-500">{it.split(" · ")[0]}</p>
                            <p className="text-xs font-medium">{it.split(" · ")[1]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* mini funnel */}
                <div className="mt-3 rounded-xl border border-line bg-surface-1/80 p-3">
                  <p className="micro-label mb-2.5">Funnel</p>
                  <div className="grid gap-1.5">
                    {[
                      ["Applied", 100, "42"],
                      ["Response", 43, "18"],
                      ["Interview", 21, "9"],
                      ["Offer", 7, "3"],
                    ].map(([label, w, n]) => (
                      <div key={String(label)} className="flex items-center gap-2">
                        <span className="w-16 text-[10px] text-ink-500">{label}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <span
                            className="block h-full rounded-full bg-linear-to-r from-brand to-status-info"
                            style={{ width: `${w}%` }}
                          />
                        </span>
                        <span className="w-6 text-right font-mono text-[10px] tabular text-ink-300">
                          {n}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Stage strip ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-8 lg:px-6">
        <Reveal className="mx-auto max-w-6xl">
          <div className="glass flex flex-wrap items-center justify-center gap-2 rounded-2xl px-4 py-4 sm:gap-3">
            {STAGES.map((s, i) => (
              <span key={s.label} className="flex items-center gap-2 sm:gap-3">
                {i > 0 && <ArrowRight className="size-3.5 text-ink-500" />}
                <span
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${s.cls}`}
                >
                  {s.label}
                  <span className="font-mono text-xs tabular opacity-80">{s.count}</span>
                </span>
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Pillars ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="micro-label mb-3 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-brand shadow-glow" />
              Everything attaches to the application
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              One record. Every signal you need to make the next move.
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => {
              const Icon = p.icon
              return (
                <StaggerItem key={p.title}>
                  <div className="glow-hover group h-full rounded-2xl border border-line bg-surface-2/70 p-5">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-brand/30 bg-brand-weak text-brand shadow-glow transition-transform group-hover:scale-110">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 text-base font-semibold tracking-tight">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-300">{p.body}</p>
                  </div>
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>
      </section>

      {/* ── Value rows ──────────────────────────────────────────────────── */}
      <section className="border-y border-line/60 bg-surface-1/40 px-4 py-20 lg:px-6">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-3">
          {[
            {
              icon: CalendarClock,
              n: "01",
              title: "Nothing slips",
              body: "Deadlines and follow-up reminders surface on the dashboard and on each application, due and overdue.",
            },
            {
              icon: LineChart,
              n: "02",
              title: "Honest analytics",
              body: "Conversion by source, referral status, work arrangement, application quality, and resume version — no vanity metrics.",
            },
            {
              icon: TrendingUp,
              n: "03",
              title: "Steady momentum",
              body: "Weekly targets auto-track from your activity. Log wins, capture lessons, set next-week focus.",
            },
          ].map((row) => {
            const Icon = row.icon
            return (
              <Reveal key={row.n}>
                <span className="micro-label">{row.n}</span>
                <Icon className="mt-3 size-6 text-brand" />
                <h3 className="mt-4 text-xl font-semibold tracking-tight">{row.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{row.body}</p>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="relative px-4 py-24 lg:px-6">
        <Reveal className="mx-auto max-w-4xl">
          <div className="gradient-ring grain relative overflow-hidden rounded-3xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-20 mx-auto size-72 rounded-full bg-brand/20 blur-3xl"
            />
            <div className="glass-strong relative rounded-3xl px-6 py-14 text-center sm:px-12">
              <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Stop tracking your search in a <span className="text-gradient">spreadsheet.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-300">
                Sign in with GitHub or Google and start with your first application in under a
                minute.
              </p>
              <div className="mt-8 flex justify-center">
                <Button asChild size="lg" className="h-11 px-6 text-sm">
                  <Link href="/signin">
                    Start tracking
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-line/60 px-4 py-8 lg:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded bg-linear-to-br from-brand-hover to-brand text-primary-foreground">
              <Sparkles className="size-3" />
            </span>
            Application Tracker
          </p>
          <Link href="/signin" className="text-brand transition-colors hover:text-brand-hover">
            Sign in with GitHub or Google →
          </Link>
        </div>
      </footer>
    </main>
  )
}
