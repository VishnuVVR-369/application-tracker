"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarClock,
  CornerDownLeft,
  FileText,
  Flag,
  Gauge,
  Plus,
  Search,
  Settings,
  Target,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ApplicationFormSheet } from "./application-form-sheet"
import { ContactFormSheet } from "./contact-form-sheet"
import { InterviewFormSheet } from "./interview-form-sheet"
import { TaskFormSheet } from "./task-form-sheet"
import { useAppData } from "./use-app-data"

type SheetKind = "application" | "interview" | "contact" | "task"

type CommandItem = {
  id: string
  group: string
  label: string
  sublabel?: string
  icon: React.ComponentType<{ className?: string }>
  keywords?: string
  run: () => void
}

const NAV_DESTINATIONS = [
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

function PaletteKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-line bg-surface-1 px-1 font-mono text-[10px] leading-none text-ink-500">
      {children}
    </kbd>
  )
}

function matches(item: CommandItem, query: string) {
  if (!query) return true
  const haystack = `${item.label} ${item.sublabel ?? ""} ${item.keywords ?? ""}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((token) => haystack.includes(token))
}

export function QuickActions({ variant = "full" }: { variant?: "full" | "compact" }) {
  const router = useRouter()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [activeSheet, setActiveSheet] = React.useState<SheetKind | null>(null)
  const activeItemRef = React.useRef<HTMLButtonElement>(null)
  const needsCommandData = paletteOpen || activeSheet !== null
  const { data } = useAppData("command", undefined, needsCommandData)

  // Reset the query/selection whenever the palette closes so it reopens fresh.
  const onPaletteOpenChange = React.useCallback((open: boolean) => {
    setPaletteOpen(open)
    if (!open) {
      setQuery("")
      setActiveIndex(0)
    }
  }, [])

  const applications = React.useMemo(() => data?.applications ?? [], [data])
  const resumes = data?.resumes ?? []
  const contacts = React.useMemo(() => data?.applicationContacts ?? [], [data])

  // Global ⌘K / Ctrl+K opens the palette from anywhere.
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const openSheet = React.useCallback((kind: SheetKind) => {
    setPaletteOpen(false)
    // Defer so the dialog's close animation doesn't fight the sheet open.
    requestAnimationFrame(() => setActiveSheet(kind))
  }, [])

  const items = React.useMemo<CommandItem[]>(() => {
    const create: CommandItem[] = [
      { id: "new-application", group: "Create", label: "New application", icon: Plus, keywords: "add job role company", run: () => openSheet("application") },
      { id: "schedule-interview", group: "Create", label: "Schedule interview", icon: CalendarClock, keywords: "round prep", run: () => openSheet("interview") },
      { id: "add-contact", group: "Create", label: "Add contact", icon: UserPlus, keywords: "recruiter referrer person", run: () => openSheet("contact") },
      { id: "log-task", group: "Create", label: "Log task or follow-up", icon: Flag, keywords: "reminder deadline todo", run: () => openSheet("task") },
    ]
    const nav: CommandItem[] = NAV_DESTINATIONS.map((destination) => ({
      id: `nav-${destination.href}`,
      group: "Go to",
      label: destination.label,
      icon: destination.icon,
      keywords: "navigate open page",
      run: () => {
        setPaletteOpen(false)
        router.push(destination.href)
      },
    }))
    const jump: CommandItem[] = applications
      .filter((application) => !application.archived)
      .slice(0, 40)
      .map((application) => ({
        id: `app-${application._id}`,
        group: "Jump to application",
        label: application.companyName,
        sublabel: application.roleTitle,
        icon: BriefcaseBusiness,
        keywords: `${application.companyName} ${application.roleTitle}`,
        run: () => {
          setPaletteOpen(false)
          router.push(`/app/applications/${application._id}`)
        },
      }))
    const people: CommandItem[] = contacts
      .filter((contact) => !contact.archived)
      .slice(0, 20)
      .map((contact) => {
        const company = applications.find(
          (application) => application._id === contact.applicationId
        )?.companyName
        return {
          id: `contact-${contact._id}`,
          group: "Jump to person",
          label: contact.name,
          sublabel: contact.roleTitle ?? company,
          icon: Users,
          keywords: `${contact.name} ${contact.roleTitle ?? ""} ${company ?? ""}`,
          run: () => {
            setPaletteOpen(false)
            router.push("/app/people")
          },
        }
      })
    return [...create, ...nav, ...jump, ...people]
  }, [applications, contacts, openSheet, router])

  const filtered = React.useMemo(() => items.filter((item) => matches(item, query)), [items, query])

  // Clamp in render instead of resetting via an effect (house rule: no
  // setState inside effects).
  const safeIndex = filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1)

  // Keep the highlighted row visible as the user arrows past the fold. This is
  // a DOM side effect (not setState), so it's fine inside an effect.
  React.useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" })
  }, [safeIndex, query])

  function onPaletteKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex(Math.min(safeIndex + 1, filtered.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex(Math.max(safeIndex - 1, 0))
    } else if (event.key === "Enter") {
      event.preventDefault()
      filtered[safeIndex]?.run()
    }
  }

  // Group the filtered items in stable order for rendering.
  const groups = React.useMemo(() => {
    const order: string[] = []
    const map = new Map<string, CommandItem[]>()
    for (const item of filtered) {
      if (!map.has(item.group)) {
        map.set(item.group, [])
        order.push(item.group)
      }
      map.get(item.group)!.push(item)
    }
    return order.map((group) => ({ group, items: map.get(group)! }))
  }, [filtered])

  let runningIndex = -1

  return (
    <>
      {/* Header controls */}
      <div className="flex items-center gap-2">
        {variant === "full" && (
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-8 items-center gap-2 rounded-lg border border-line bg-surface-1/70 px-2.5 text-sm text-ink-500 transition-colors hover:border-line-strong hover:text-ink-300 md:inline-flex"
          >
            <Search className="size-3.5" />
            <span>Search…</span>
            <kbd className="ml-2 rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] leading-none text-ink-500">
              ⌘K
            </kbd>
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size={variant === "compact" ? "icon" : "default"} aria-label="Quick add">
              <Plus className="size-4" />
              {variant === "full" && <span className="hidden sm:inline">New</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => openSheet("application")}>
              <Plus className="size-4 text-brand" /> New application
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openSheet("interview")}>
              <CalendarClock className="size-4 text-stage-interview" /> Schedule interview
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openSheet("contact")}>
              <UserPlus className="size-4 text-stage-phone" /> Add contact
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openSheet("task")}>
              <Flag className="size-4 text-status-warn" /> Log task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Command palette */}
      <Dialog open={paletteOpen} onOpenChange={onPaletteOpenChange}>
        <DialogContent
          showCloseButton={false}
          onKeyDown={onPaletteKeyDown}
          className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <div className="flex items-center gap-2.5 border-b border-line/70 px-3.5">
            <Search className="size-4 shrink-0 text-ink-500" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              placeholder="Search or jump to…"
              className="h-12 w-full bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
            />
            <kbd className="hidden rounded border border-line bg-surface-1 px-1.5 py-0.5 font-mono text-[10px] text-ink-500 sm:block">
              esc
            </kbd>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-ink-500">No matches for “{query}”.</p>
            ) : (
              groups.map(({ group, items: groupItems }) => (
                <div key={group} className="mb-1 last:mb-0">
                  <p className="micro-label px-2.5 py-1.5">{group}</p>
                  {groupItems.map((item) => {
                    runningIndex += 1
                    const index = runningIndex
                    const active = index === safeIndex
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        ref={active ? activeItemRef : undefined}
                        type="button"
                        onMouseMove={() => setActiveIndex(index)}
                        onClick={() => item.run()}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                          active ? "bg-surface-3 text-ink-100" : "text-ink-300"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                            active
                              ? "border-brand/40 bg-brand-weak text-brand"
                              : "border-line bg-surface-1 text-ink-500"
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                          {item.sublabel && (
                            <span className="ml-2 text-xs text-ink-500">{item.sublabel}</span>
                          )}
                        </span>
                        {active && (
                          <CornerDownLeft className="size-3.5 shrink-0 text-ink-500" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line/70 px-3.5 py-2 text-[11px] text-ink-500">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <PaletteKey>↑</PaletteKey>
                <PaletteKey>↓</PaletteKey>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <PaletteKey>↵</PaletteKey>
                open
              </span>
            </span>
            <span className="font-mono tabular">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Controlled create sheets */}
      <ApplicationFormSheet
        resumes={resumes}
        open={activeSheet === "application"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />
      <InterviewFormSheet
        applications={applications}
        contacts={contacts}
        open={activeSheet === "interview"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />
      <ContactFormSheet
        applications={applications}
        open={activeSheet === "contact"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />
      <TaskFormSheet
        applications={applications}
        open={activeSheet === "task"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      />
    </>
  )
}
