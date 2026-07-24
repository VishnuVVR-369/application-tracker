import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Radar,
  ScanLine,
  ShieldCheck,
  Trophy,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  FadeIn,
  MeshBackground,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/application-tracker/atmosphere"
import { ApplicationTrackerMark } from "@/components/application-tracker/application-tracker-mark"
import { hasConvexAuthEnv, isAuthenticated } from "@/lib/auth-server"

/* The three-step story, told the way a job seeker actually experiences it. */
const STEPS = [
  {
    n: "01",
    title: "Add the roles you're chasing",
    body: "Drop in a company and a link. Your resume, notes, contacts, and deadlines all live on that one card.",
  },
  {
    n: "02",
    title: "Track every move, get a nudge before it goes cold",
    body: "Slide an application from applied to offer. When a company goes quiet, you'll know before the trail runs out.",
  },
  {
    n: "03",
    title: "Do more of what lands interviews",
    body: "See where you convert and where you stall, then spend your energy on the roles actually moving forward.",
  },
] as const

/* Real capabilities, framed as what they do for you - not feature names. */
const FEATURES = [
  {
    icon: BriefcaseBusiness,
    title: "One pipeline for the whole search",
    body: "Saved, applied, phone screen, interview, offer, closed. Every card carries its resume, deadlines, and history so nothing lives in your head.",
  },
  {
    icon: BarChart3,
    title: "See what's actually working",
    body: "An honest funnel, real response times, and where you drop off - by source, referral, and resume version. No vanity metrics.",
  },
  {
    icon: ScanLine,
    title: "Match your resume to the role",
    body: "Line your resume up against a job description and get a clear read on where it fits and what's missing before you hit send.",
  },
  {
    icon: BookOpenCheck,
    title: "Walk into interviews ready",
    body: "Keep prep notes and a library of proof-you-did-it stories, ready to pull up the moment a recruiter reaches out.",
  },
  {
    icon: Trophy,
    title: "Keep momentum every week",
    body: "Set a weekly cadence, watch it fill from your activity, and log the wins so a long search never feels like a black hole.",
  },
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
                <ApplicationTrackerMark className="size-4" />
              </span>
              Application Tracker
            </Link>
            <nav className="hidden items-center gap-7 text-sm text-ink-300 md:flex">
              <a href="#features" className="transition-colors hover:text-ink-100">
                Features
              </a>
              <a href="#how" className="transition-colors hover:text-ink-100">
                How it works
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signin">
                  Get started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative px-4 pb-16 pt-16 sm:pt-24 lg:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <FadeIn delay={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-weak px-3 py-1 text-xs font-medium text-brand">
                <span className="size-1.5 rounded-full bg-brand shadow-glow" />
                Your job-search command center
              </span>
            </FadeIn>
            <FadeIn delay={0.08}>
              <h1 className="mt-5 text-balance text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">
                Your whole job search,
                <br />
                finally <span className="text-gradient">under control.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
                Every application, deadline, and interview in one calm place - so
                you always know what needs your attention next, catch a company
                going quiet before it ghosts you, and see which moves are actually
                landing interviews.
              </p>
            </FadeIn>
            <FadeIn delay={0.24}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-11 px-5 text-sm">
                  <Link href="/signin">
                    Get started - it&apos;s free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="h-11 px-5 text-sm">
                  <a href="#how">See how it works</a>
                </Button>
              </div>
            </FadeIn>
            <FadeIn delay={0.32}>
              <p className="mt-5 flex items-center gap-2 text-sm text-ink-500">
                <ShieldCheck className="size-4 text-status-up" />
                Sign in with Google or GitHub. Your search stays private to you.
              </p>
            </FadeIn>
          </div>

          {/* Product preview */}
          <FadeIn delay={0.2} y={28}>
            <div className="gradient-ring grain relative rounded-2xl">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-brand/15 blur-3xl"
              />
              <div className="glass-strong rounded-2xl p-3 shadow-overlay sm:p-4">
                {/* mock top bar */}
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-1/80 px-3 py-2">
                  <span className="micro-label">Today</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-status-up/30 bg-status-up/10 px-2 py-0.5 text-[10px] font-medium text-status-up">
                    <span className="size-1.5 rounded-full bg-status-up" />
                    live
                  </span>
                </div>

                {/* KPIs */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    ["18", "Active"],
                    ["6.4d", "First reply"],
                    ["1", "Offer"],
                  ].map(([v, l]) => (
                    <div key={l} className="rounded-xl border border-line bg-surface-1/80 p-3">
                      <p className="font-mono text-2xl font-semibold tabular text-ink-100">{v}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">{l}</p>
                    </div>
                  ))}
                </div>

                {/* ghosting radar alert — the differentiator, on-screen */}
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-status-warn/30 bg-status-warn/10 p-3">
                  <Radar className="mt-0.5 size-4 shrink-0 text-status-warn" />
                  <div>
                    <p className="text-xs font-medium text-ink-100">
                      3 applications going quiet
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-300">
                      No reply from Globex in 11 days. Nudge them or let it go.
                    </p>
                  </div>
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
                  <p className="micro-label mb-2.5">What&apos;s converting</p>
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

      {/* ── Quick value chips ───────────────────────────────────────────── */}
      <section className="px-4 pb-6 lg:px-6">
        <Reveal className="mx-auto max-w-6xl">
          <div className="glass flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl px-4 py-4 text-sm text-ink-300 sm:gap-x-6">
            {[
              "One pipeline, every stage",
              "Ghosting radar",
              "Resume ↔ job match",
              "Honest analytics",
              "Weekly cadence",
            ].map((label, i) => (
              <span key={label} className="flex items-center gap-3 sm:gap-6">
                {i > 0 && <span aria-hidden className="size-1 rounded-full bg-ink-500/60" />}
                <span className="font-medium text-ink-100">{label}</span>
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how" className="scroll-mt-20 px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="micro-label mb-3 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-brand shadow-glow" />
              How it works
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              From scattered tabs to a search you can steer.
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <StaggerItem key={step.n}>
                <div className="glow-hover group h-full rounded-2xl border border-line bg-surface-2/70 p-6">
                  <span className="font-mono text-sm font-semibold tracking-widest text-brand">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">{step.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Features (command-center bento) ──────────────────────────────── */}
      <section
        id="features"
        className="scroll-mt-20 border-y border-line/60 bg-surface-1/40 px-4 py-20 lg:px-6"
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="micro-label mb-3 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-brand shadow-glow" />
              Everything the search needs
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              A command center built for the way a job hunt really goes.
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              // First card spans two columns on large screens for a bento rhythm.
              const wide = i === 0 ? "lg:col-span-2" : ""
              return (
                <StaggerItem key={f.title} className={wide}>
                  <div className="glow-hover group flex h-full flex-col rounded-2xl border border-line bg-surface-2/70 p-6">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-brand/30 bg-brand-weak text-brand shadow-glow transition-transform group-hover:scale-110">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-300">{f.body}</p>
                  </div>
                </StaggerItem>
              )
            })}
            {/* Ghosting radar gets its own accent cell to close the grid. */}
            <StaggerItem>
              <div className="gradient-ring glow-hover group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-brand/25 bg-brand-weak p-6">
                <div>
                  <span className="flex size-10 items-center justify-center rounded-xl border border-brand/40 bg-surface-2/70 text-brand shadow-glow transition-transform group-hover:scale-110">
                    <Radar className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">
                    Never wonder if you&apos;ve been ghosted
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">
                    The tracker watches for silence and flags applications going
                    cold, so you can follow up on time or move on with a clear head.
                  </p>
                </div>
              </div>
            </StaggerItem>
          </Stagger>
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
                Stop running your search from a <span className="text-gradient">spreadsheet.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-300">
                Bring every application into one place and add your first role in
                under a minute.
              </p>
              <div className="mt-8 flex justify-center">
                <Button asChild size="lg" className="h-11 px-6 text-sm">
                  <Link href="/signin">
                    Get started - it&apos;s free
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
              <ApplicationTrackerMark className="size-3" />
            </span>
            Application Tracker
          </p>
          <Link href="/signin" className="text-brand transition-colors hover:text-brand-hover">
            Get started →
          </Link>
        </div>
      </footer>
    </main>
  )
}
