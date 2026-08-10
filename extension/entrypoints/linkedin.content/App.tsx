import * as React from "react"
import { browser } from "wxt/browser"

import { TrackerMark } from "../../components/TrackerMark"
import { extractLinkedInJob } from "../../lib/linkedin"
import { requestTracker } from "../../lib/messaging"
import { addDiagnostic, connectionStorage } from "../../lib/storage"
import type { ApiResult, CapturedJob } from "../../lib/types"

type CaptureAppProps = {
  registerOpen: (open: () => void) => void
}

function capturePayload(job: CapturedJob) {
  const capture: Partial<CapturedJob> = { ...job }
  delete capture.diagnostics
  return capture as Omit<CapturedJob, "diagnostics">
}

function InputField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  )
}

function applicationUrl(trackerUrl: string, applicationId: string) {
  return `${trackerUrl}/app/applications/${encodeURIComponent(applicationId)}`
}

function postingJobId(value: string) {
  try {
    const url = new URL(value)
    if (
      url.protocol !== "https:" ||
      (url.hostname !== "linkedin.com" && !url.hostname.endsWith(".linkedin.com"))
    ) {
      return undefined
    }
    return url.pathname.match(/\/jobs\/view\/(?:[^/?#]*-)?(\d{5,30})(?:[/?#]|$)/i)?.[1] ??
      url.searchParams.get("currentJobId") ??
      url.searchParams.get("jobId") ??
      undefined
  } catch {
    return undefined
  }
}

function canSubmit(job: CapturedJob) {
  return /^\d{5,30}$/.test(job.jobId.trim()) &&
    postingJobId(job.postingUrl) === job.jobId.trim() &&
    Boolean(job.companyName.trim()) &&
    Boolean(job.roleTitle.trim())
}

export function CaptureApp({ registerOpen }: CaptureAppProps) {
  const [open, setOpen] = React.useState(false)
  const [job, setJob] = React.useState(() => extractLinkedInJob(document))
  const [result, setResult] = React.useState<ApiResult | null>(null)
  const [error, setError] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)
  const [undoSeconds, setUndoSeconds] = React.useState(0)
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    registerOpen(() => {
      setJob(extractLinkedInJob(document))
      setResult(null)
      setError("")
      setOpen(true)
    })
  }, [registerOpen])

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  React.useEffect(() => {
    if (undoSeconds <= 0) return undefined
    const timer = window.setInterval(() => setUndoSeconds((seconds) => Math.max(0, seconds - 1)), 1_000)
    return () => window.clearInterval(timer)
  }, [undoSeconds])

  function update<K extends keyof CapturedJob>(key: K, value: CapturedJob[K]) {
    setJob((current) => ({ ...current, [key]: value }))
  }

  async function submit() {
    if (!canSubmit(job)) return
    setPending(true)
    setError("")
    try {
      await addDiagnostic({
        code: "capture:submitted",
        pageType: job.diagnostics.pageType,
        strategies: job.diagnostics.strategies,
      })
      const response = await requestTracker({ type: "create", capture: capturePayload(job) })
      setResult(response)
      if (response.status === "created") setUndoSeconds(10)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add this job.")
      await addDiagnostic({ code: "capture:failed", pageType: job.diagnostics.pageType })
    } finally {
      setPending(false)
    }
  }

  async function refresh(applicationId: string) {
    setPending(true)
    setError("")
    try {
      setResult(await requestTracker({
        type: "refresh",
        applicationId,
        capture: capturePayload(job),
      }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh this job.")
    } finally {
      setPending(false)
    }
  }

  async function undo(applicationId: string) {
    setPending(true)
    setError("")
    try {
      setResult(await requestTracker({ type: "undo", applicationId }))
      setUndoSeconds(0)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not undo this capture.")
    } finally {
      setPending(false)
    }
  }

  async function openApplication(applicationId: string) {
    const connection = await connectionStorage.getValue()
    if (!connection) {
      await browser.runtime.openOptionsPage()
      return
    }
    await browser.tabs.create({ url: applicationUrl(connection.trackerUrl, applicationId) })
  }

  async function copyDetails() {
    await navigator.clipboard.writeText(JSON.stringify(capturePayload(job), null, 2))
  }

  const application = result && "application" in result ? result.application : null
  const tracked = result?.status === "created" || result?.status === "exists" || result?.status === "refreshed"

  return (
    <>
      <button
        type="button"
        className={`capture-trigger ${tracked ? "is-tracked" : ""}`}
        onClick={() => {
          setJob(extractLinkedInJob(document))
          setOpen(true)
        }}
      >
        <TrackerMark />
        {tracked ? "In Tracker" : "Add to Tracker"}
      </button>

      <dialog
        ref={dialogRef}
        className="capture-dialog"
        aria-labelledby="way2more-capture-title"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        <div className="dialog-shell">
          <header>
            <div className="brand-lockup">
              <span className="mark"><TrackerMark /></span>
              <div>
                <p>Way2More</p>
                <h2 id="way2more-capture-title">
                  {application ? (result?.status === "exists" ? "Already in Tracker" : "Added to Tracker") : "Review LinkedIn job"}
                </h2>
              </div>
            </div>
            <button type="button" className="icon-button" aria-label="Close" onClick={() => setOpen(false)}>×</button>
          </header>

          {application ? (
            <main className="result-view" aria-live="polite">
              <span className={`result-icon ${result?.status === "archived" ? "muted" : ""}`}>
                {result?.status === "archived" ? "↩" : "✓"}
              </span>
              <div>
                <h3>{application.companyName}</h3>
                <p>{application.roleTitle}</p>
                <span className="stage-badge">{application.stage.replace("_", " ")}</span>
              </div>
              {result?.status === "archived" ? <p className="notice">Removed from your active tracker.</p> : null}
              {error ? <p role="alert" className="error">{error}</p> : null}
              <div className="actions">
                {result?.status !== "archived" ? (
                  <button type="button" className="primary" onClick={() => void openApplication(application.id)}>
                    Open application
                  </button>
                ) : null}
                {result?.status === "exists" ? (
                  <button type="button" className="secondary" disabled={pending} onClick={() => void refresh(application.id)}>
                    {pending ? "Refreshing…" : "Refresh job details"}
                  </button>
                ) : null}
                {result?.status === "created" && undoSeconds > 0 ? (
                  <button type="button" className="secondary" disabled={pending} onClick={() => void undo(application.id)}>
                    Undo ({undoSeconds}s)
                  </button>
                ) : null}
              </div>
            </main>
          ) : (
            <main>
              {job.diagnostics.missingFields.length > 0 ? (
                <p className="notice">
                  Some fields could not be extracted. Review the highlighted essentials before saving.
                </p>
              ) : null}

              <div className="form-grid">
                <InputField
                  label="Job ID"
                  required
                  value={job.jobId}
                  aria-invalid={!/^\d{5,30}$/.test(job.jobId.trim()) || postingJobId(job.postingUrl) !== job.jobId.trim()}
                  onChange={(event) => update("jobId", event.target.value)}
                />
                <InputField
                  label="Posting URL"
                  required
                  type="url"
                  value={job.postingUrl}
                  aria-invalid={postingJobId(job.postingUrl) !== job.jobId.trim()}
                  onChange={(event) => update("postingUrl", event.target.value)}
                />
                <InputField
                  label="Company"
                  required
                  value={job.companyName}
                  aria-invalid={!job.companyName.trim()}
                  onChange={(event) => update("companyName", event.target.value)}
                />
                <InputField
                  label="Role"
                  required
                  value={job.roleTitle}
                  aria-invalid={!job.roleTitle.trim()}
                  onChange={(event) => update("roleTitle", event.target.value)}
                />
                <InputField label="Location" value={job.location ?? ""} onChange={(event) => update("location", event.target.value || undefined)} />
                <label className="field">
                  <span>Stage</span>
                  <select value={job.stage} onChange={(event) => update("stage", event.target.value as CapturedJob["stage"])}>
                    <option value="saved">Saved</option>
                    <option value="applied">Already applied today</option>
                  </select>
                </label>
              </div>

              <button type="button" className="details-toggle" aria-expanded={showDetails} onClick={() => setShowDetails((current) => !current)}>
                {showDetails ? "Hide details" : "More details"}<span>{showDetails ? "−" : "+"}</span>
              </button>

              {showDetails ? (
                <div className="details-panel">
                  <label className="field">
                    <span>Work arrangement</span>
                    <select value={job.workArrangement ?? ""} onChange={(event) => update("workArrangement", (event.target.value || undefined) as CapturedJob["workArrangement"])}>
                      <option value="">Not specified</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite</option>
                    </select>
                  </label>
                  <InputField
                    label="Minimum compensation"
                    type="number"
                    min="0"
                    value={job.compensationMin ?? ""}
                    onChange={(event) => update("compensationMin", event.target.value === "" ? undefined : Number(event.target.value))}
                  />
                  <InputField
                    label="Maximum compensation"
                    type="number"
                    min="0"
                    value={job.compensationMax ?? ""}
                    onChange={(event) => update("compensationMax", event.target.value === "" ? undefined : Number(event.target.value))}
                  />
                  <InputField
                    label="Currency"
                    value={job.compensationCurrency ?? ""}
                    onChange={(event) => update("compensationCurrency", event.target.value.trim() || undefined)}
                  />
                  <label className="field">
                    <span>Compensation period</span>
                    <select value={job.compensationPeriod ?? ""} onChange={(event) => update("compensationPeriod", (event.target.value || undefined) as CapturedJob["compensationPeriod"])}>
                      <option value="">Not specified</option>
                      <option value="hour">Hourly</option>
                      <option value="day">Daily</option>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                      <option value="contract">Contract</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </label>
                  <InputField label="Compensation shown" value={job.compensationNotes ?? ""} onChange={(event) => update("compensationNotes", event.target.value || undefined)} />
                  <label className="field full">
                    <span>Job description</span>
                    <textarea value={job.jobDescriptionSnapshot ?? ""} onChange={(event) => update("jobDescriptionSnapshot", event.target.value || undefined)} rows={8} />
                  </label>
                  <label className="field full">
                    <span>Personal note</span>
                    <textarea value={job.notes ?? ""} onChange={(event) => update("notes", event.target.value || undefined)} rows={3} placeholder="Optional note for your tracker" />
                  </label>
                </div>
              ) : null}

              {error ? (
                <div role="alert" className="error-block">
                  <p>{error}</p>
                  <div>
                    <button type="button" className="text-button" onClick={() => void submit()}>Retry</button>
                    <button type="button" className="text-button" onClick={() => void copyDetails()}>Copy details</button>
                  </div>
                </div>
              ) : null}

              <div className="actions footer-actions">
                <button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="primary"
                  disabled={pending || !canSubmit(job)}
                  onClick={() => void submit()}
                >
                  {pending ? "Adding…" : "Add to Tracker"}
                </button>
              </div>
            </main>
          )}
        </div>
      </dialog>
    </>
  )
}
