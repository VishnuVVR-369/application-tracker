import type { ApplicationContact, ApplicationRecord } from "@/lib/application-model"

export const CONTACT_RELATIONSHIPS = [
  "recruiter",
  "referrer",
  "hiring_manager",
  "interviewer",
  "employee",
  "other",
] as const
export type ContactRelationship = (typeof CONTACT_RELATIONSHIPS)[number]

export const CONTACT_RELATIONSHIP_LABELS: Record<ContactRelationship, string> = {
  recruiter: "Recruiter",
  referrer: "Referrer",
  hiring_manager: "Hiring manager",
  interviewer: "Interviewer",
  employee: "Employee",
  other: "Other",
}

const RELATIONSHIP_RANK: Record<ContactRelationship, number> = {
  hiring_manager: 0,
  recruiter: 1,
  referrer: 2,
  interviewer: 3,
  employee: 4,
  other: 5,
}

export function contactInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

export type ContactCompanyGroup = {
  applicationId: string
  companyName: string
  roleTitle: string
  application?: ApplicationRecord
  contacts: ApplicationContact[]
}

/** Groups contacts under their application/company, ordering people by role
 *  importance and companies by how many contacts they hold. */
export function groupContactsByCompany(
  contacts: ApplicationContact[],
  applications: ApplicationRecord[]
): ContactCompanyGroup[] {
  const byId = new Map(applications.map((application) => [application.id, application]))
  const groups = new Map<string, ContactCompanyGroup>()

  for (const contact of contacts) {
    const application = byId.get(contact.applicationId)
    const existing = groups.get(contact.applicationId)
    if (existing) {
      existing.contacts.push(contact)
    } else {
      groups.set(contact.applicationId, {
        applicationId: contact.applicationId,
        companyName: application?.companyName ?? "Unknown company",
        roleTitle: application?.roleTitle ?? "",
        application,
        contacts: [contact],
      })
    }
  }

  for (const group of groups.values()) {
    group.contacts.sort(
      (a, b) =>
        (RELATIONSHIP_RANK[a.relationshipType as ContactRelationship] ?? 9) -
          (RELATIONSHIP_RANK[b.relationshipType as ContactRelationship] ?? 9) ||
        a.name.localeCompare(b.name)
    )
  }

  return [...groups.values()].sort(
    (a, b) => b.contacts.length - a.contacts.length || a.companyName.localeCompare(b.companyName)
  )
}

export function countByRelationship(contacts: ApplicationContact[]) {
  return contacts.reduce(
    (counts, contact) => {
      const key = contact.relationshipType as ContactRelationship
      counts[key] = (counts[key] ?? 0) + 1
      return counts
    },
    {} as Record<ContactRelationship, number>
  )
}
