import type { Id } from "./_generated/dataModel"

export type ExtensionApplicationSummary = {
  id: Id<"applications">
  companyName: string
  roleTitle: string
  stage: "saved" | "applied" | "phone_screen" | "interview" | "offer" | "closed"
  dateSavedDate?: string
  dateAppliedDate?: string
  archived: boolean
}

export type ExtensionApiResult =
  | { status: "connected"; tokenName: string }
  | { status: "missing" }
  | {
      status: "exists" | "created" | "refreshed" | "archived"
      application: ExtensionApplicationSummary
    }
