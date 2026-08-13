"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link2,
  Save,
  Share2,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  SOURCE_LABELS,
  SOURCES,
  WORK_ARRANGEMENT_LABELS,
  WORK_ARRANGEMENTS,
  type ApplicationSource,
  type WorkArrangement,
} from "@/lib/application-model"
import {
  MOBILE_CAPTURE_STORAGE_KEY,
  MOBILE_CAPTURE_TTL_MS,
  isFreshMobileCaptureDraft,
  type MobileCaptureDraft,
} from "@/lib/mobile-share"
import { cn } from "@/lib/utils"
import { EmptyState, PageHeader, Panel, StageBadge } from "./common"
import { Field, FormError, NativeSelect, SectionLabel } from "./form-kit"
import { PageSkeleton } from "./skeletons"
import { useAppData } from "./use-app-data"

type CaptureForm = {
  postingUrl: string
  companyName: string
  roleTitle: string
  stage: "saved" | "applied"
  location: string
  workArrangement: "" | WorkArrangement
  source: "" | ApplicationSource
  currentResumeId: string
  jobDescriptionSnapshot: string
  notes: string
}

const EMPTY_FORM: CaptureForm = {
  postingUrl: "",
  companyName: "",
  roleTitle: "",
  stage: "saved",
  location: "",
  workArrangement: "",
  source: "",
  currentResumeId: "",
  jobDescriptionSnapshot: "",
  notes: "",
}

const subscribeToHydration = () => () => undefined
const hydratedClientSnapshot = () => true
const serverSnapshot = () => false

function clearMobileCaptureDraft() {
  try {
    sessionStorage.removeItem(MOBILE_CAPTURE_STORAGE_KEY)
  } catch {
    return
  }
}

function readMobileCaptureDraft() {
  try {
    const raw = sessionStorage.getItem(MOBILE_CAPTURE_STORAGE_KEY)
    const value: unknown = raw ? JSON.parse(raw) : null
    if (isFreshMobileCaptureDraft(value)) return value
    if (raw) sessionStorage.removeItem(MOBILE_CAPTURE_STORAGE_KEY)
  } catch {
    // Storage can be disabled by browser policy. Start with a blank form.
  }
  return null
}

function validPostingUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password
  } catch {
    return false
  }
}

export function MobileCapturePage() {
  const hydrated = React.useSyncExternalStore(
    subscribeToHydration,
    hydratedClientSnapshot,
    serverSnapshot
  )
  if (!hydrated) return <PageSkeleton columns="1fr" panels={2} />
  return <MobileCaptureContent initialDraft={readMobileCaptureDraft()} />
}

function MobileCaptureContent({ initialDraft }: { initialDraft: MobileCaptureDraft | null }) {
  const { data, isLoading } = useAppData("mobile-capture")
  const createCapture = useMutation(api.mobileCapture.create)
  const prepareCanonicalUrls = useMutation(api.mobileCapture.prepareCanonicalUrls)
  const [form, setForm] = React.useState<CaptureForm>(() => ({
    ...EMPTY_FORM,
    postingUrl: initialDraft?.postingUrl ?? "",
    companyName: initialDraft?.companyName ?? "",
    roleTitle: initialDraft?.roleTitle ?? "",
  }))
  const [sharedDraft, setSharedDraft] = React.useState(initialDraft)
  const [showDetails, setShowDetails] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [formError, setFormError] = React.useState("")
  const [draftExpired, setDraftExpired] = React.useState(false)
  const [canonicalIndexReady, setCanonicalIndexReady] = React.useState(false)
  const [canonicalPreparationError, setCanonicalPreparationError] = React.useState("")
  const [canonicalPreparationAttempt, setCanonicalPreparationAttempt] = React.useState(0)
  const [saveResult, setSaveResult] = React.useState<{
    applicationId: Id<"applications">
    status: "created" | "exists"
    archived: boolean
  } | null>(null)
  const dataReady = Boolean(data)

  const expireDraft = React.useCallback(() => {
    clearMobileCaptureDraft()
    setSharedDraft(null)
    setForm(EMPTY_FORM)
    setDraftExpired(true)
    setFormError("This shared job expired. Share it again from Android to continue.")
  }, [])

  React.useEffect(() => {
    if (!dataReady) return
    let cancelled = false

    async function prepare() {
      try {
        let done = false
        while (!cancelled && !done) {
          const result = await prepareCanonicalUrls({})
          done = result.done
        }
        if (!cancelled) {
          setCanonicalIndexReady(true)
          setCanonicalPreparationError("")
        }
      } catch (error) {
        if (!cancelled) {
          setCanonicalPreparationError(
            error instanceof Error ? error.message : "Could not prepare application links"
          )
        }
      }
    }

    void prepare()
    return () => {
      cancelled = true
    }
  }, [canonicalPreparationAttempt, dataReady, prepareCanonicalUrls])

  React.useEffect(() => {
    if (!sharedDraft) return
    const expiresIn = sharedDraft.receivedAt + MOBILE_CAPTURE_TTL_MS - Date.now()
    const timeout = window.setTimeout(expireDraft, Math.max(0, expiresIn))
    return () => window.clearTimeout(timeout)
  }, [expireDraft, sharedDraft])

  const duplicate = useQuery(
    api.mobileCapture.findDuplicate,
    data && canonicalIndexReady && validPostingUrl(form.postingUrl)
      ? { postingUrl: form.postingUrl.trim() }
      : "skip"
  )

  function updateField<K extends keyof CaptureForm>(key: K, value: CaptureForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function retryCanonicalPreparation() {
    setCanonicalPreparationError("")
    setCanonicalPreparationAttempt((current) => current + 1)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")
    if (draftExpired || (sharedDraft && !isFreshMobileCaptureDraft(sharedDraft))) {
      expireDraft()
      return
    }
    if (!canonicalIndexReady) {
      setFormError("Application links are still being prepared. Try again shortly.")
      return
    }
    if (!validPostingUrl(form.postingUrl)) {
      setFormError("Enter a valid HTTP or HTTPS posting URL.")
      return
    }
    if (!form.companyName.trim() || !form.roleTitle.trim()) {
      setFormError("Company and role are required.")
      return
    }
    setPending(true)
    try {
      const result = await createCapture({
        postingUrl: form.postingUrl.trim(),
        companyName: form.companyName.trim(),
        roleTitle: form.roleTitle.trim(),
        stage: form.stage,
        location: form.location.trim() || undefined,
        workArrangement: form.workArrangement || undefined,
        source: form.source || undefined,
        currentResumeId: form.currentResumeId
          ? (form.currentResumeId as Id<"resumes">)
          : undefined,
        jobDescriptionSnapshot: form.jobDescriptionSnapshot.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      clearMobileCaptureDraft()
      setSharedDraft(null)
      setSaveResult({
        applicationId: result.application.applicationId,
        status: result.status,
        archived: result.application.archived,
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save application")
    } finally {
      setPending(false)
    }
  }

  if (isLoading) return <PageSkeleton columns="1fr" panels={2} />
  if (!data) {
    return <EmptyState title="Capture unavailable" description="Sign in to review this shared job." />
  }

  if (saveResult) {
    const created = saveResult.status === "created"
    return (
      <EmptyState
        icon={CheckCircle2}
        title={created ? "Application saved" : "Application already tracked"}
        description={
          created
            ? "The confirmed job is now in your application pipeline."
            : saveResult.archived
              ? "The matching application already exists in your archive."
              : "The matching application already exists in your pipeline."
        }
        href={`/app/applications/${saveResult.applicationId}`}
        actionLabel="Open application"
      />
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Android capture"
        title="Review application"
        description="Check the shared link, add the missing essentials, and choose whether you saved or applied."
      />

      <form onSubmit={onSubmit} className="mx-auto grid max-w-3xl gap-4">
        {canonicalPreparationError && (
          <div className="rounded-xl border border-status-warn/35 bg-status-warn/10 p-4">
            <p className="text-sm font-semibold">Application links need another try</p>
            <p className="mt-1 text-sm text-ink-300">{canonicalPreparationError}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={retryCanonicalPreparation}
            >
              Retry preparation
            </Button>
          </div>
        )}

        {duplicate && (
          <div className="rounded-xl border border-status-warn/35 bg-status-warn/10 p-4">
            <p className="text-sm font-semibold">Already in your tracker</p>
            <p className="mt-1 text-sm text-ink-300">
              {duplicate.roleTitle} at {duplicate.companyName}
              {duplicate.archived ? " is archived." : " already uses this posting link."}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <StageBadge stage={duplicate.stage} />
              <Button asChild type="button" variant="secondary" size="sm">
                <Link href={`/app/applications/${duplicate.applicationId}`}>
                  Open existing <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        <Panel title="Shared posting" icon={Share2}>
          <div className="grid gap-4">
            <Field label="Posting URL">
              <Input
                required
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                maxLength={2048}
                placeholder="https://company.com/jobs/…"
                value={form.postingUrl}
                onChange={(event) => updateField("postingUrl", event.target.value)}
              />
            </Field>
            {sharedDraft?.sharedText && (
              <details className="rounded-lg border border-line bg-surface-1/60 px-3 py-2 text-sm">
                <summary className="cursor-pointer text-ink-300">Show text shared by Android</summary>
                <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-500">
                  {sharedDraft.sharedText}
                </p>
              </details>
            )}
          </div>
        </Panel>

        <Panel title="Application essentials" icon={Link2}>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company">
                <Input
                  required
                  autoComplete="organization"
                  maxLength={300}
                  placeholder="Company name"
                  value={form.companyName}
                  onChange={(event) => updateField("companyName", event.target.value)}
                />
              </Field>
              <Field label="Role">
                <Input
                  required
                  maxLength={300}
                  placeholder="Role title"
                  value={form.roleTitle}
                  onChange={(event) => updateField("roleTitle", event.target.value)}
                />
              </Field>
            </div>

            <Field label="What did you do?">
              <div className="grid grid-cols-2 gap-2">
                {(["saved", "applied"] as const).map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    aria-pressed={form.stage === stage}
                    onClick={() => updateField("stage", stage)}
                    className={cn(
                      "min-h-12 rounded-xl border px-4 text-sm font-semibold transition-colors",
                      form.stage === stage
                        ? "border-brand/50 bg-brand-weak text-brand shadow-glow"
                        : "border-line bg-surface-1/60 text-ink-300 hover:border-line-strong"
                    )}
                  >
                    {stage === "saved" ? "Saved for later" : "Already applied"}
                  </button>
                ))}
              </div>
            </Field>

            <Button
              type="button"
              variant="secondary"
              aria-expanded={showDetails}
              aria-controls="mobile-capture-details"
              onClick={() => setShowDetails((current) => !current)}
              className="w-full justify-between"
            >
              {showDetails ? "Hide optional details" : "Add optional details"}
              {showDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>

            {showDetails && (
              <div id="mobile-capture-details" className="grid gap-4 border-t border-line/70 pt-4">
                <SectionLabel>Optional details</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Location">
                    <Input
                      placeholder="City, region, or Remote"
                      maxLength={300}
                      value={form.location}
                      onChange={(event) => updateField("location", event.target.value)}
                    />
                  </Field>
                  <Field label="Work arrangement">
                    <NativeSelect
                      value={form.workArrangement}
                      onChange={(value) => updateField("workArrangement", value as CaptureForm["workArrangement"])}
                      className="h-9"
                    >
                      <option value="">Not specified</option>
                      {WORK_ARRANGEMENTS.map((arrangement) => (
                        <option key={arrangement} value={arrangement}>
                          {WORK_ARRANGEMENT_LABELS[arrangement]}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="Source">
                    <NativeSelect
                      value={form.source}
                      onChange={(value) => updateField("source", value as CaptureForm["source"])}
                      className="h-9"
                    >
                      <option value="">Detect from URL</option>
                      {SOURCES.map((source) => (
                        <option key={source} value={source}>
                          {SOURCE_LABELS[source]}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="Resume">
                    <NativeSelect
                      value={form.currentResumeId}
                      onChange={(value) => updateField("currentResumeId", value)}
                      className="h-9"
                    >
                      <option value="">Use default resume</option>
                      {data.resumes.filter((resume) => !resume.archived).map((resume) => (
                        <option key={resume._id} value={resume._id}>{resume.label}</option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <Field label="Job description">
                  <Textarea
                    rows={5}
                    maxLength={50000}
                    placeholder="Paste the description if you want it saved with the application."
                    value={form.jobDescriptionSnapshot}
                    onChange={(event) => updateField("jobDescriptionSnapshot", event.target.value)}
                  />
                </Field>
                <Field label="Notes">
                  <Textarea
                    rows={3}
                    maxLength={10000}
                    placeholder="Follow-up, referral, or application notes"
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
        </Panel>

        <FormError message={formError} />
        <div className="sticky bottom-3 z-10 rounded-xl border border-line bg-surface-2/95 p-3 shadow-overlay backdrop-blur">
          <Button
            type="submit"
            size="lg"
            disabled={pending || draftExpired || !canonicalIndexReady || Boolean(duplicate)}
            className="h-12 w-full"
          >
            <Save className="size-4" />
            {pending
              ? "Saving…"
              : canonicalPreparationError
                ? "Retry preparation above"
                : !canonicalIndexReady
                  ? "Preparing application links…"
                  : form.stage === "applied"
                    ? "Add applied job"
                    : "Save application"}
          </Button>
        </div>
      </form>
    </>
  )
}
