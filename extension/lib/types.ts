export type ApplicationStage = "saved" | "applied"
export type WorkArrangement = "remote" | "hybrid" | "onsite"
export type CompensationPeriod = "hour" | "day" | "month" | "year" | "contract" | "unknown"

export type TrackerConnection = {
  trackerUrl: string
  token: string
}

export type CaptureDiagnostics = {
  pageType: "direct" | "search" | "unknown"
  strategies: string[]
  missingFields: string[]
}

export type CapturedJob = {
  jobId: string
  postingUrl: string
  companyName: string
  roleTitle: string
  stage: ApplicationStage
  location?: string
  workArrangement?: WorkArrangement
  compensationMin?: number
  compensationMax?: number
  compensationCurrency?: string
  compensationPeriod?: CompensationPeriod
  compensationNotes?: string
  jobDescriptionSnapshot?: string
  notes?: string
  diagnostics: CaptureDiagnostics
}

export type ApiOperation =
  | { type: "test" }
  | { type: "lookup"; jobId: string; postingUrl: string }
  | { type: "create"; capture: Omit<CapturedJob, "diagnostics"> }
  | { type: "refresh"; applicationId: string; capture: Omit<CapturedJob, "diagnostics"> }
  | { type: "undo"; applicationId: string }

export type ApplicationSummary = {
  id: string
  companyName: string
  roleTitle: string
  stage: string
  dateSavedDate?: string
  dateAppliedDate?: string
  archived: boolean
}

export type ApiResult =
  | { status: "connected"; tokenName: string }
  | { status: "missing" }
  | { status: "exists" | "created" | "refreshed" | "archived"; application: ApplicationSummary }

export type ApiError = {
  error: string
  message: string
  status?: number
}

export type DiagnosticEvent = {
  at: number
  code: string
  pageType?: CaptureDiagnostics["pageType"]
  strategies?: string[]
}

export type BackgroundMessage =
  | { type: "api-request"; operation: ApiOperation; connection?: TrackerConnection }
  | { type: "disconnect" }

export type ContentMessage = { type: "open-capture" }
