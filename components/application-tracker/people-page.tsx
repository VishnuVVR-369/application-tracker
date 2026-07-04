"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import {
  ArrowUpRight,
  Copy,
  Link2,
  Mail,
  MoreHorizontal,
  Phone,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  CONTACT_RELATIONSHIP_LABELS,
  CONTACT_RELATIONSHIPS,
  contactInitials,
  groupContactsByCompany,
  type ContactRelationship,
} from "@/lib/contact-model"
import { cn } from "@/lib/utils"
import { ContactFormSheet } from "./contact-form-sheet"
import { Stagger, StaggerItem } from "./atmosphere"
import { EmptyState, PageHeader } from "./common"
import { PeopleSkeleton } from "./skeletons"
import { mapApplication, mapContact } from "./data-mappers"
import { useAppData } from "./use-app-data"

const relationshipTone: Record<ContactRelationship, string> = {
  hiring_manager: "text-stage-interview",
  recruiter: "text-stage-phone",
  referrer: "text-brand",
  interviewer: "text-stage-applied",
  employee: "text-ink-300",
  other: "text-ink-500",
}

export function PeoplePage() {
  const { data, isLoading } = useAppData()
  const removeContact = useMutation(api.contacts.remove)
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<ContactRelationship | "all">("all")
  const [adding, setAdding] = React.useState(false)
  const [editing, setEditing] = React.useState<Doc<"applicationContacts"> | null>(null)

  if (isLoading) return <PeopleSkeleton />
  if (!data) {
    return <EmptyState title="People unavailable" description="Sign in to load your contacts." />
  }

  const applications = data.applications.map(mapApplication)
  const docById = new Map(data.applicationContacts.map((doc) => [doc._id, doc]))
  const normalizedQuery = query.trim().toLowerCase()

  const mapped = data.applicationContacts
    .map(mapContact)
    .filter((contact) => !contact.archived)
    .filter((contact) => filter === "all" || contact.relationshipType === filter)
    .filter((contact) => {
      if (!normalizedQuery) return true
      const application = applications.find((item) => item.id === contact.applicationId)
      const haystack = `${contact.name} ${contact.roleTitle ?? ""} ${application?.companyName ?? ""}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })

  const groups = groupContactsByCompany(mapped, applications)
  const totalShown = mapped.length

  async function handleRemove(id: string, name: string) {
    await removeContact({ id: id as Id<"applicationContacts"> })
    toast.success("Contact removed", { description: name })
  }

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Your network"
        description="Recruiters, referrers, hiring managers, and interviewers — grouped by the company they belong to."
        action={
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="size-4" />
            Add contact
          </Button>
        }
      />

      {/* Controls */}
      <div className="glass mb-5 flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterChip>
          {CONTACT_RELATIONSHIPS.map((relationship) => (
            <FilterChip
              key={relationship}
              active={filter === relationship}
              onClick={() => setFilter(relationship)}
            >
              {CONTACT_RELATIONSHIP_LABELS[relationship]}
            </FilterChip>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people…"
            className="h-8 w-full sm:w-56"
          />
          <span className="hidden shrink-0 font-mono text-xs tabular text-ink-500 sm:inline">
            {totalShown} shown
          </span>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title={normalizedQuery || filter !== "all" ? "No matching people" : "No contacts yet"}
          description={
            normalizedQuery || filter !== "all"
              ? "Try clearing the filter or search."
              : "Add the recruiters, referrers, and interviewers you meet to build your search network."
          }
          action={
            <Button onClick={() => setAdding(true)}>
              <UserPlus className="size-4" />
              Add contact
            </Button>
          }
        />
      ) : (
        <Stagger className="grid gap-6">
          {groups.map((group) => (
            <StaggerItem key={group.applicationId}>
              <section>
                <div className="mb-3 flex items-center gap-2.5">
                  <h2 className="text-sm font-semibold tracking-tight">{group.companyName}</h2>
                  {group.roleTitle && <span className="text-xs text-ink-500">· {group.roleTitle}</span>}
                  <Badge variant="outline" className="font-mono tabular">
                    {group.contacts.length}
                  </Badge>
                  {group.application && (
                    <Link
                      href={`/app/applications/${group.application.id}`}
                      className="group ml-auto flex items-center gap-1 text-xs text-ink-500 transition-colors hover:text-brand"
                    >
                      Open application
                      <ArrowUpRight className="size-3 transition-colors group-hover:text-brand" />
                    </Link>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.contacts.map((contact) => {
                    const doc = docById.get(contact.id as Id<"applicationContacts">)
                    return (
                      <article
                        key={contact.id}
                        className="glow-hover group flex flex-col rounded-xl border border-line bg-surface-2/60 p-3.5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-hover to-brand text-sm font-semibold text-primary-foreground">
                            {contactInitials(contact.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold tracking-tight">{contact.name}</p>
                            <p className="truncate text-xs text-ink-500">{contact.roleTitle ?? "—"}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label="Contact actions">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onSelect={() => doc && setEditing(doc)}>
                                <Phone className="size-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => handleRemove(contact.id, contact.name)}
                              >
                                <Trash2 className="size-4" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-1/60 px-2 py-0.5 text-xs",
                              relationshipTone[contact.relationshipType as ContactRelationship]
                            )}
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {CONTACT_RELATIONSHIP_LABELS[contact.relationshipType as ContactRelationship]}
                          </span>
                        </div>

                        {contact.notes && (
                          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-300">
                            “{contact.notes}”
                          </p>
                        )}

                        <div className="mt-auto flex items-center gap-1.5 pt-3">
                          {contact.email && (
                            <>
                              <IconLink href={`mailto:${contact.email}`} label="Email">
                                <Mail className="size-3.5" />
                              </IconLink>
                              <IconButton
                                label="Copy email"
                                onClick={() => {
                                  void navigator.clipboard?.writeText(contact.email!)
                                  toast.success("Email copied")
                                }}
                              >
                                <Copy className="size-3.5" />
                              </IconButton>
                            </>
                          )}
                          {contact.phone && (
                            <IconLink href={`tel:${contact.phone}`} label="Call">
                              <Phone className="size-3.5" />
                            </IconLink>
                          )}
                          {contact.linkedinUrl && (
                            <IconLink href={contact.linkedinUrl} label="LinkedIn" external>
                              <Link2 className="size-3.5" />
                            </IconLink>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Add / edit sheets */}
      <ContactFormSheet applications={data.applications} open={adding} onOpenChange={setAdding} />
      {editing && (
        <ContactFormSheet
          applications={data.applications}
          contact={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand/40 bg-brand-weak text-brand"
          : "border-line bg-surface-1 text-ink-300 hover:border-line-strong hover:text-ink-100"
      )}
    >
      {children}
    </button>
  )
}

function IconLink({
  href,
  label,
  external,
  children,
}: {
  href: string
  label: string
  external?: boolean
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="flex size-7 items-center justify-center rounded-md border border-line bg-surface-1/60 text-ink-300 transition-colors hover:border-brand/40 hover:text-brand"
    >
      {children}
    </a>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md border border-line bg-surface-1/60 text-ink-300 transition-colors hover:border-brand/40 hover:text-brand"
    >
      {children}
    </button>
  )
}
