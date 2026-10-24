"use client"

import { useConvexAuth, useQuery } from "convex/react"
import { BellIcon, BookOpenIcon, FileTextIcon, LayoutGridIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { LogoMark } from "@/components/logo-mark"
import { SignIn } from "@/components/sign-in"
import { UserMenu } from "@/components/user-menu"
import { useNow } from "@/hooks/use-now"
import { isFollowUpDue } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { api } from "@/convex/_generated/api"

const NAV = [
  { href: "/", label: "Board", icon: LayoutGridIcon },
  { href: "/follow-ups", label: "Follow-ups", icon: BellIcon },
  { href: "/resumes", label: "Resumes", icon: FileTextIcon },
  { href: "/experience", label: "Experience", icon: BookOpenIcon },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()

  // Render the chrome and page while auth resolves (pages show their own skeletons) so the route prerenders
  // into a static shell; only swap to sign-in once we know there is no session.
  if (!isLoading && !isAuthenticated) return <SignIn />

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 rounded-md font-display text-[15px] font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LogoMark className="size-3.5" />
            </span>
            <span className="hidden sm:inline">Applications</span>
          </Link>
          <Nav />
          <div className="ml-auto">
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}

function Nav() {
  const pathname = usePathname()
  const dueCount = useFollowUpDueCount()
  return (
    <nav className="flex items-center gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
            {href === "/follow-ups" && dueCount > 0 && (
              <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white tabular-nums dark:text-amber-950">
                {dueCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function useFollowUpDueCount() {
  const requests = useQuery(api.referrals.awaitingReply)
  const settings = useQuery(api.settings.get)
  const now = useNow()
  if (!requests || !settings) return 0
  return requests.filter((request) => isFollowUpDue(request, settings.followUpDays, now)).length
}
