"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import {
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  FileText,
  Gauge,
  LogOut,
  Menu,
  Settings,
  Target,
  Trophy,
  Users,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { MeshBackground } from "./atmosphere"
import { QuickActions } from "./command-palette"
import { useAppData } from "./use-app-data"

const navItems = [
  { href: "/app", label: "Today", icon: Gauge },
  { href: "/app/targets", label: "Targets", icon: Target },
  { href: "/app/applications", label: "Pipeline", icon: BriefcaseBusiness },
  { href: "/app/interviews", label: "Interviews", icon: CalendarClock },
  { href: "/app/prep", label: "Prep", icon: BookOpenCheck },
  { href: "/app/stories", label: "Stories", icon: Trophy },
  { href: "/app/people", label: "People", icon: Users },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/insights", label: "Insights", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const

const EASE = [0.22, 1, 0.36, 1] as const

/* ────────────────────────────────────────────────────────────────────────
   Persisted collapse state — a tiny external store so the rail remembers its
   width across reloads and tabs without a setState-in-effect (per house rule)
   and without a hydration mismatch (SSR + first paint always read `false`).
   ──────────────────────────────────────────────────────────────────────── */
const COLLAPSE_KEY = "at:sidebar-collapsed"
const collapseListeners = new Set<() => void>()

function emitCollapse() {
  collapseListeners.forEach((l) => l())
}
function readCollapsed() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(COLLAPSE_KEY) === "1"
}
function writeCollapsed(value: boolean) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0")
  }
  emitCollapse()
}
function subscribeCollapsed(cb: () => void) {
  collapseListeners.add(cb)
  const onStorage = (e: StorageEvent) => {
    if (e.key === COLLAPSE_KEY) emitCollapse()
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage)
  }
  return () => {
    collapseListeners.delete(cb)
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage)
    }
  }
}
function useCollapsed() {
  return React.useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false)
}

/* ────────────────────────────────────────────────────────────────────────
   AppShell — collapsible left rail (desktop) + slide-out drawer (mobile).
   ──────────────────────────────────────────────────────────────────────── */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data, isLoading } = useAppData()
  const collapsed = useCollapsed()
  const reduce = useReducedMotion()

  // Transitions stay off until the first deliberate toggle, so the post-hydration
  // restore of a collapsed rail snaps into place instead of animating on load.
  const [interacted, setInteracted] = React.useState(false)
  const animate = interacted && !reduce

  const [mobileOpen, setMobileOpen] = React.useState(false)

  const displayName =
    data?.settings?.displayName || data?.user.name || data?.user.email || "Signed in"
  const email = data?.user.email

  const toggle = React.useCallback(() => {
    setInteracted(true)
    writeCollapsed(!readCollapsed())
  }, [])

  // "[" toggles the rail — a small power-user affordance. Ignored while typing.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      )
        return
      e.preventDefault()
      toggle()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggle])

  async function signOut() {
    await authClient.signOut()
    router.push("/")
  }

  return (
    <div className="relative min-h-screen text-ink-100 lg:flex">
      <MeshBackground variant="app" />

      {/* ── Desktop rail ─────────────────────────────────────────────── */}
      <aside
        data-collapsed={collapsed ? "" : undefined}
        data-animate={animate ? "" : undefined}
        className={cn(
          "group/rail sticky top-0 z-20 hidden h-screen shrink-0 lg:block",
          "w-[268px] data-[collapsed]:w-[76px]",
          "data-[animate]:transition-[width] data-[animate]:duration-300 data-[animate]:ease-[cubic-bezier(0.22,1,0.36,1)]"
        )}
      >
        <div className="glass-strong relative flex h-full flex-col gap-5 overflow-hidden border-r border-line p-3">
          <Brand />

          <div className="flex items-center justify-between px-1">
            <span className="micro-label transition-opacity duration-150 group-data-[collapsed]/rail:pointer-events-none group-data-[collapsed]/rail:opacity-0">
              Menu
            </span>
          </div>

          <nav
            aria-label="Application navigation"
            className="-mt-2 flex flex-col gap-1"
          >
            <NavLinks
              pathname={pathname}
              layoutId="rail-active"
              collapsed={collapsed}
              reduce={!!reduce}
            />
          </nav>

          <RailFooter
            displayName={displayName}
            email={email}
            isLoading={isLoading}
            onSignOut={signOut}
          />
        </div>

        {/* Edge handle — straddles the border, flips direction on collapse */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "absolute top-[4.5rem] right-0 z-30 flex size-6 translate-x-1/2 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-ink-300 shadow-overlay",
                "opacity-0 transition-all duration-200 hover:scale-110 hover:border-brand/50 hover:text-brand",
                "group-hover/rail:opacity-100 group-focus-within/rail:opacity-100 group-data-[collapsed]/rail:opacity-100",
                "focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              )}
            >
              <ChevronLeft
                className={cn(
                  "size-3.5",
                  "group-data-[collapsed]/rail:rotate-180",
                  "group-data-[animate]/rail:transition-transform group-data-[animate]/rail:duration-300"
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            <kbd
              data-slot="kbd"
              className="ml-1 border border-line bg-surface-1 px-1 py-0.5 font-mono text-[10px] leading-none text-ink-300"
            >
              [
            </kbd>
          </TooltipContent>
        </Tooltip>
      </aside>

      {/* ── Main column ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b border-line px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNav
              open={mobileOpen}
              onOpenChange={setMobileOpen}
              pathname={pathname}
              displayName={displayName}
              email={email}
              isLoading={isLoading}
              onSignOut={signOut}
              reduce={!!reduce}
            />
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-1.5 text-sm"
            >
              {crumbs(pathname).map((part, i, arr) => (
                <span key={`${part}-${i}`} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-ink-500">/</span>}
                  <span
                    className={cn(
                      "truncate font-mono text-xs tracking-wide",
                      i === arr.length - 1 ? "text-ink-100" : "text-ink-500"
                    )}
                  >
                    {part}
                  </span>
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <QuickActions />
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
          <motion.div
            key={pathname}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

/* ── Brand mark — wordmark fades out as the rail collapses ──────────────── */
function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="group/brand flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-3/50 group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:px-0"
    >
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-hover to-brand text-primary-foreground shadow-glow transition-transform duration-300 group-hover/brand:scale-105">
        <BriefcaseBusiness className="size-[18px]" />
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15" />
      </span>
      <span className="flex min-w-0 flex-col overflow-hidden whitespace-nowrap opacity-100 transition-opacity duration-200 group-data-[collapsed]/rail:w-0 group-data-[collapsed]/rail:opacity-0">
        <span className="text-sm font-semibold tracking-tight">
          Application Tracker
        </span>
        <span className="text-[11px] text-ink-500">Job search HQ</span>
      </span>
    </Link>
  )
}

/* ── Nav list — shared by the rail and the mobile drawer ────────────────── */
function NavLinks({
  pathname,
  layoutId,
  collapsed,
  reduce,
  onNavigate,
}: {
  pathname: string
  layoutId: string
  collapsed: boolean
  reduce: boolean
  onNavigate?: () => void
}) {
  return (
    <>
      {navItems.map((item, i) => {
        const active =
          item.href === "/app"
            ? pathname === item.href
            : pathname.startsWith(item.href)
        const Icon = item.icon

        const link = (
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group/item relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              "group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:gap-0 group-data-[collapsed]/rail:px-0",
              active
                ? "text-ink-100"
                : "text-ink-300 hover:bg-surface-3/60 hover:text-ink-100"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-xl border border-brand/30 bg-brand-weak shadow-glow"
              />
            )}
            {active && (
              <span className="absolute inset-y-2 left-0 z-10 w-0.5 rounded-full bg-brand group-data-[collapsed]/rail:hidden" />
            )}
            <Icon
              className={cn(
                "relative z-10 size-[18px] shrink-0 transition-transform duration-200 group-hover/item:scale-110",
                active && "text-brand"
              )}
            />
            <span
              className={cn(
                "relative z-10 overflow-hidden whitespace-nowrap opacity-100",
                "group-data-[collapsed]/rail:w-0 group-data-[collapsed]/rail:opacity-0",
                "group-data-[animate]/rail:transition-[opacity] group-data-[animate]/rail:duration-150"
              )}
            >
              {item.label}
            </span>
          </Link>
        )

        return (
          <motion.div
            key={item.href}
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + i * 0.045, duration: 0.4, ease: EASE }}
          >
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            )}
          </motion.div>
        )
      })}
    </>
  )
}

/* ── Rail footer — full user card expanded, icon stack when collapsed ───── */
function RailFooter({
  displayName,
  email,
  isLoading,
  onSignOut,
}: {
  displayName: string
  email?: string
  isLoading: boolean
  onSignOut: () => void
}) {
  const initial = displayName.slice(0, 1).toUpperCase()

  return (
    <div className="mt-auto">
      {/* Expanded card */}
      <div className="rounded-xl border border-line bg-surface-2/60 p-3 group-data-[collapsed]/rail:hidden">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar initial={initial} />
            <div className="min-w-0">
              {isLoading ? (
                <Skeleton className="h-3.5 w-24" />
              ) : (
                <p className="truncate text-sm font-medium">{displayName}</p>
              )}
              <p className="truncate text-xs text-ink-500">{email}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-ink-300"
          onClick={onSignOut}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>

      {/* Collapsed icon stack */}
      <div className="hidden flex-col items-center gap-1.5 group-data-[collapsed]/rail:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Avatar initial={initial} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span className="flex flex-col">
              <span className="font-medium text-foreground">{displayName}</span>
              {email && <span className="text-ink-300">{email}</span>}
            </span>
          </TooltipContent>
        </Tooltip>
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

function Avatar({ initial }: { initial: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-hover to-brand text-xs font-semibold text-primary-foreground">
      {initial}
    </span>
  )
}

/* ── Mobile drawer — hamburger in the header opens a left Sheet ─────────── */
function MobileNav({
  open,
  onOpenChange,
  pathname,
  displayName,
  email,
  isLoading,
  onSignOut,
  reduce,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
  displayName: string
  email?: string
  isLoading: boolean
  onSignOut: () => void
  reduce: boolean
}) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          className="lg:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="glass-strong w-[280px] gap-0 border-line p-3"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Application tracker navigation menu
        </SheetDescription>

        <Brand onNavigate={close} />

        <nav
          aria-label="Application navigation"
          className="mt-5 flex flex-col gap-1"
        >
          <NavLinks
            pathname={pathname}
            layoutId="mobile-active"
            collapsed={false}
            reduce={reduce}
            onNavigate={close}
          />
        </nav>

        <div className="mt-auto rounded-xl border border-line bg-surface-2/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar initial={displayName.slice(0, 1).toUpperCase()} />
              <div className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-3.5 w-24" />
                ) : (
                  <p className="truncate text-sm font-medium">{displayName}</p>
                )}
                <p className="truncate text-xs text-ink-500">{email}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-ink-300"
            onClick={() => {
              close()
              onSignOut()
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function crumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean)
  return parts.length ? parts : ["app"]
}
