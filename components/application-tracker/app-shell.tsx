"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
import { useAppData } from "./use-app-data"

const navItems = [
  { href: "/app", label: "Dashboard", icon: Gauge },
  { href: "/app/applications", label: "Applications", icon: BriefcaseBusiness },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/goals", label: "Goals", icon: Target },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const

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
    <div className="min-h-screen bg-surface-0 text-ink-100 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-20 border-b border-line bg-surface-1/95 backdrop-blur lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-5 p-4">
          <Link href="/" className="flex items-center gap-3 rounded-md px-2 py-1.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-brand text-primary-foreground shadow-glow">
              <BriefcaseBusiness className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Application Tracker</span>
              <span className="micro-label">live database</span>
            </span>
          </Link>

          <nav aria-label="Application navigation" className="flex gap-1 overflow-x-auto lg:flex-col">
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
                  className={cn(
                    "relative inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink-300 outline-none transition-colors hover:bg-surface-3 hover:text-ink-100 focus-visible:ring-3 focus-visible:ring-ring/50",
                    active && "bg-brand-weak text-ink-100 shadow-glow"
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-brand lg:block" />
                  )}
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto hidden border-t border-line pt-4 lg:block">
            <div className="mb-3 flex items-center justify-between">
              <div className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-4 w-28" />
                ) : (
                  <p className="truncate text-sm font-medium">{displayName}</p>
                )}
                <p className="truncate text-xs text-ink-500">{data?.user.email}</p>
              </div>
              <ThemeToggle />
            </div>
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface-0/90 px-4 backdrop-blur lg:px-6">
          <div>
            <p className="micro-label">app</p>
            <p className="text-sm text-ink-300">{pathname.replaceAll("/", " / ")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-md border border-line bg-surface-1 px-2 py-1 text-xs text-ink-300 sm:inline-flex">
              <span className="size-2 rounded-full bg-brand" />
              live
            </span>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
