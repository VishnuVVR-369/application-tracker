"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { Building2, MailPlus, Target, UserRoundPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  REFERRAL_OUTREACH_SOURCE_LABELS,
  REFERRAL_OUTREACH_SOURCES,
  REFERRAL_OUTREACH_STATUS_LABELS,
  REFERRAL_OUTREACH_STATUSES,
  TARGET_COMPANY_STATUS_LABELS,
  TARGET_COMPANY_STATUSES,
  TARGET_COMPANY_TIER_LABELS,
  TARGET_COMPANY_TIERS,
  type ReferralOutreachSource,
  type ReferralOutreachStatus,
  type TargetCompanyStatus,
  type TargetCompanyTier,
} from "@/lib/application-model"
import { buildReferralModel } from "@/lib/referral-model"
import { buildTargetCompanyModel } from "@/lib/target-company-model"
import { cn } from "@/lib/utils"
import { EmptyState, LoadingPanels, PageHeader, Panel, ProgressBar } from "./common"
import { Field, NativeSelect } from "./form-kit"
import { mapApplication, mapReferralOutreach, mapTargetCompany } from "./data-mappers"
import { useAppData } from "./use-app-data"

export function TargetCompaniesPage() {
  const { data, isLoading } = useAppData()
  const createCompany = useMutation(api.targets.createCompany)
  const updateCompany = useMutation(api.targets.updateCompany)
  const createOutreach = useMutation(api.targets.createOutreach)
  const updateOutreach = useMutation(api.targets.updateOutreach)
  const [companyForm, setCompanyForm] = React.useState({
    companyName: "",
    tier: "dream" as TargetCompanyTier,
    status: "researching" as TargetCompanyStatus,
    targetRoles: "",
    priorityScore: "80",
    roleFitScore: "70",
    referralGoal: "2",
    researchNotes: "",
  })
  const [outreachForm, setOutreachForm] = React.useState({
    targetCompanyId: "",
    contactName: "",
    contactRole: "",
    source: "linkedin" as ReferralOutreachSource,
    status: "not_contacted" as ReferralOutreachStatus,
    followUpDate: "",
    notes: "",
  })

  if (isLoading) return <LoadingPanels />
  if (!data) {
    return <EmptyState title="Targets unavailable" description="Sign in to load target companies." />
  }

  const targets = data.targetCompanies.map(mapTargetCompany)
  const outreach = data.referralOutreach.map(mapReferralOutreach)
  const applications = data.applications.map(mapApplication)
  const targetModel = buildTargetCompanyModel({ targets, outreach, applications })
  const referralModel = buildReferralModel(outreach, new Date().toISOString().slice(0, 10))

  async function submitCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyForm.companyName.trim()) return
    await createCompany({
      companyName: companyForm.companyName.trim(),
      tier: companyForm.tier,
      status: companyForm.status,
      targetRoles: companyForm.targetRoles.split(",").map((role) => role.trim()).filter(Boolean),
      priorityScore: Number(companyForm.priorityScore) || 50,
      roleFitScore: Number(companyForm.roleFitScore) || 50,
      referralGoal: Number(companyForm.referralGoal) || 1,
      researchNotes: companyForm.researchNotes.trim() || undefined,
    })
    setCompanyForm((form) => ({ ...form, companyName: "", targetRoles: "", researchNotes: "" }))
    toast.success("Target company added")
  }

  async function submitOutreach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!outreachForm.contactName.trim()) return
    await createOutreach({
      targetCompanyId: outreachForm.targetCompanyId
        ? (outreachForm.targetCompanyId as Id<"targetCompanies">)
        : undefined,
      contactName: outreachForm.contactName.trim(),
      contactRole: outreachForm.contactRole.trim() || undefined,
      source: outreachForm.source,
      status: outreachForm.status,
      followUpDate: outreachForm.followUpDate || undefined,
      notes: outreachForm.notes.trim() || undefined,
    })
    setOutreachForm((form) => ({ ...form, contactName: "", contactRole: "", notes: "" }))
    toast.success("Referral lead added")
  }

  return (
    <>
      <PageHeader
        eyebrow="Targets"
        title="Target company pipeline"
        description="Manage dream/strong/backup companies before applying, warm referrals, and decide where your next high-leverage effort goes."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Targets" value={targetModel.summary.total} />
        <Stat label="Dream" value={targetModel.summary.dream} />
        <Stat label="Ready" value={targetModel.summary.ready} />
        <Stat label="Referral gaps" value={targetModel.summary.referralGaps} warn />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="grid gap-4">
          {targetModel.rows.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No target companies yet"
              description="Add your FAANG/product targets first, then warm referrals before applying."
            />
          ) : (
            targetModel.rows.map((row) => (
              <Panel
                key={row.target.id}
                title={row.target.companyName}
                label={`${TARGET_COMPANY_TIER_LABELS[row.target.tier]} · ${TARGET_COMPANY_STATUS_LABELS[row.target.status]}`}
                icon={Building2}
                action={
                  <NativeSelect
                    value={row.target.status}
                    onChange={(status) =>
                      void updateCompany({
                        id: row.target.id as Id<"targetCompanies">,
                        status: status as TargetCompanyStatus,
                      })
                    }
                  >
                    {TARGET_COMPANY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {TARGET_COMPANY_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </NativeSelect>
                }
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_12rem]">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {row.target.targetRoles.map((role) => (
                        <span key={role} className="rounded-md border border-line bg-surface-1 px-2 py-1 text-xs text-ink-300">
                          {role}
                        </span>
                      ))}
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-ink-300">
                      {row.target.researchNotes || row.target.notes || "Add research notes, hiring-bar details, and interview process notes."}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <MiniMetric label="Priority" value={row.target.priorityScore} />
                      <MiniMetric label="Role fit" value={row.target.roleFitScore} />
                      <MiniMetric label="Warm leads" value={row.referralProgress.warm} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-1/60 p-3">
                    <p className="micro-label">Readiness</p>
                    <p className="mt-2 font-mono text-3xl font-semibold tabular">{row.readiness}%</p>
                    <ProgressBar value={row.readiness} className="mt-3" />
                    <p className="mt-3 text-xs text-ink-500">
                      Referral goal {row.referralProgress.warm}/{row.referralProgress.goal}
                    </p>
                  </div>
                </div>
              </Panel>
            ))
          )}
        </div>

        <div className="grid content-start gap-4">
          <Panel title="Add target company" icon={Target}>
            <form className="grid gap-3" onSubmit={submitCompany}>
              <Field label="Company">
                <Input value={companyForm.companyName} onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tier">
                  <NativeSelect value={companyForm.tier} onChange={(tier) => setCompanyForm({ ...companyForm, tier: tier as TargetCompanyTier })}>
                    {TARGET_COMPANY_TIERS.map((tier) => <option key={tier} value={tier}>{TARGET_COMPANY_TIER_LABELS[tier]}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Status">
                  <NativeSelect value={companyForm.status} onChange={(status) => setCompanyForm({ ...companyForm, status: status as TargetCompanyStatus })}>
                    {TARGET_COMPANY_STATUSES.map((status) => <option key={status} value={status}>{TARGET_COMPANY_STATUS_LABELS[status]}</option>)}
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Target roles" hint="comma-separated">
                <Input value={companyForm.targetRoles} onChange={(e) => setCompanyForm({ ...companyForm, targetRoles: e.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Priority"><Input type="number" min="0" max="100" value={companyForm.priorityScore} onChange={(e) => setCompanyForm({ ...companyForm, priorityScore: e.target.value })} /></Field>
                <Field label="Fit"><Input type="number" min="0" max="100" value={companyForm.roleFitScore} onChange={(e) => setCompanyForm({ ...companyForm, roleFitScore: e.target.value })} /></Field>
                <Field label="Referrals"><Input type="number" min="1" value={companyForm.referralGoal} onChange={(e) => setCompanyForm({ ...companyForm, referralGoal: e.target.value })} /></Field>
              </div>
              <Field label="Research notes">
                <Textarea value={companyForm.researchNotes} onChange={(e) => setCompanyForm({ ...companyForm, researchNotes: e.target.value })} />
              </Field>
              <Button type="submit"><Building2 className="size-4" /> Add target</Button>
            </form>
          </Panel>

          <Panel
            title="Referral engine"
            label={`${referralModel.metrics.replyRate}% reply · ${referralModel.metrics.referralRate}% referral`}
            icon={UserRoundPlus}
          >
            <form className="grid gap-3" onSubmit={submitOutreach}>
              <Field label="Target company">
                <NativeSelect value={outreachForm.targetCompanyId} onChange={(targetCompanyId) => setOutreachForm({ ...outreachForm, targetCompanyId })}>
                  <option value="">Unassigned</option>
                  {targets.filter((target) => !target.archived).map((target) => (
                    <option key={target.id} value={target.id}>{target.companyName}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Contact name"><Input value={outreachForm.contactName} onChange={(e) => setOutreachForm({ ...outreachForm, contactName: e.target.value })} /></Field>
              <Field label="Role"><Input value={outreachForm.contactRole} onChange={(e) => setOutreachForm({ ...outreachForm, contactRole: e.target.value })} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Source">
                  <NativeSelect value={outreachForm.source} onChange={(source) => setOutreachForm({ ...outreachForm, source: source as ReferralOutreachSource })}>
                    {REFERRAL_OUTREACH_SOURCES.map((source) => <option key={source} value={source}>{REFERRAL_OUTREACH_SOURCE_LABELS[source]}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Status">
                  <NativeSelect value={outreachForm.status} onChange={(status) => setOutreachForm({ ...outreachForm, status: status as ReferralOutreachStatus })}>
                    {REFERRAL_OUTREACH_STATUSES.map((status) => <option key={status} value={status}>{REFERRAL_OUTREACH_STATUS_LABELS[status]}</option>)}
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Follow-up date"><Input type="date" value={outreachForm.followUpDate} onChange={(e) => setOutreachForm({ ...outreachForm, followUpDate: e.target.value })} /></Field>
              <Field label="Notes"><Textarea value={outreachForm.notes} onChange={(e) => setOutreachForm({ ...outreachForm, notes: e.target.value })} /></Field>
              <Button type="submit"><MailPlus className="size-4" /> Add referral lead</Button>
            </form>

            {referralModel.dueFollowUps.length > 0 && (
              <div className="mt-4 grid gap-2 border-t border-line pt-4">
                <p className="micro-label">Due follow-ups</p>
                {referralModel.dueFollowUps.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-line bg-surface-1 p-2 text-left text-sm hover:border-brand/40"
                    onClick={() => void updateOutreach({ id: item.id as Id<"referralOutreach">, status: "messaged" })}
                  >
                    <span>{item.contactName}</span>
                    <span className="text-xs text-ink-500">{item.followUpDate}</span>
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="micro-label">{label}</p>
      <p className={cn("mt-2 font-mono text-2xl font-semibold tabular", warn && value > 0 && "text-status-warn")}>{value}</p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface-1/60 px-3 py-2">
      <p className="micro-label">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular">{value}</p>
    </div>
  )
}
