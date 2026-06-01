"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  Gauge,
  LogOut,
  Settings,
  Target,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { MeshBackground } from "./atmosphere"
import { useAppData } from "./use-app-data"

const navItems = [
  { href: "/app", label: "Dashboard", icon: Gauge },
  { href: "/app/applications", label: "Applications", icon: BriefcaseBusiness },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/goals", label: "Goals", icon: Target },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const

function crumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean)
  return parts.length ? parts : ["app"]
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data, isLoading } = useAppData()

  const displayName =
    data?.settings?.displayName || data?.user.name || data?.user.email || "Signed in"

  async function signOut() {
    await authClient.signOut()
    router.push("/")
  }

  return (
    <div className="relative min-h-screen text-ink-100 lg:grid lg:grid-cols-[264px_1fr]">
      <MeshBackground variant="app" />

      <aside className="glass-strong sticky top-0 z-20 border-b border-line lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-6 p-4">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-3/60"
          >
            <span className="relative flex size-9 items-center justify-center rounded-lg bg-linear-to-br from-brand-hover to-brand text-primary-foreground shadow-glow">
              <BriefcaseBusiness className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">
                Application Tracker
              </span>
              <span className="micro-label">live database</span>
            </span>
          </Link>

          <nav
            aria-label="Application navigation"
            className="flex gap-1 overflow-x-auto lg:flex-col"
          >
            {navItems.map((item) => {
              const active =
                item.href === "/app"
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative inline-flex min-h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "text-ink-100"
                      : "text-ink-300 hover:bg-surface-3/60 hover:text-ink-100"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-lg border border-brand/30 bg-brand-weak shadow-glow"
                    />
                  )}
                  {active && (
                    <span className="absolute inset-y-2 left-0 z-10 hidden w-0.5 rounded-full bg-brand lg:block" />
                  )}
                  <Icon
                    className={cn(
                      "relative z-10 size-4 transition-colors",
                      active && "text-brand"
                    )}
                  />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto hidden lg:block">
            <div className="rounded-xl border border-line bg-surface-2/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-hover to-brand text-xs font-semibold text-primary-foreground">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    {isLoading ? (
                      <Skeleton className="h-3.5 w-24" />
                    ) : (
                      <p className="truncate text-sm font-medium">{displayName}</p>
                    )}
                    <p className="truncate text-xs text-ink-500">{data?.user.email}</p>
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-ink-300"
                onClick={signOut}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="glass sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line px-4 lg:px-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
            {crumbs(pathname).map((part, i, arr) => (
              <span key={`${part}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-ink-500">/</span>}
                <span
                  className={cn(
                    "font-mono text-xs tracking-wide",
                    i === arr.length - 1 ? "text-ink-100" : "text-ink-500"
                  )}
                >
                  {part}
                </span>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-status-up/30 bg-status-up/10 px-2.5 py-1 text-xs font-medium text-status-up sm:inline-flex">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-up opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-status-up" />
              </span>
              live
            </span>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
