"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  BookOpenCheck,
  FileText,
  Target,
  Trophy,
  Users,
} from "lucide-react"

import { PageHeader } from "./common"
import { PageSkeleton } from "./skeletons"
import { useAppData } from "./use-app-data"

const tools = [
  {
    href: "/app/targets",
    title: "Target companies",
    description: "Prioritize companies and keep referral outreach moving.",
    icon: Target,
    countKey: "targetCompanies",
    countLabel: "companies",
  },
  {
    href: "/app/people",
    title: "People",
    description: "Keep recruiters, referrers, and interviewers connected to the search.",
    icon: Users,
    countKey: "applicationContacts",
    countLabel: "people",
  },
  {
    href: "/app/documents",
    title: "Documents",
    description: "Manage resume versions and see where each one is being used.",
    icon: FileText,
    countKey: "resumes",
    countLabel: "resumes",
  },
  {
    href: "/app/prep",
    title: "Interview prep",
    description: "Track focused preparation for active interview loops.",
    icon: BookOpenCheck,
    countKey: "interviewPrepPlans",
    countLabel: "plans",
  },
  {
    href: "/app/stories",
    title: "Story bank",
    description: "Prepare reusable behavioral evidence without crowding the daily workflow.",
    icon: Trophy,
    countKey: "storyBankEntries",
    countLabel: "stories",
  },
] as const

export function WorkspacePage() {
  const { data, isLoading } = useAppData("workspace")

  if (isLoading) {
    return <PageSkeleton columns="1fr 1fr" panels={5} />
  }

  const counts = {
    targetCompanies: data?.targetCompanies.filter((item) => !item.archived).length ?? 0,
    applicationContacts: data?.applicationContacts.filter((item) => !item.archived).length ?? 0,
    resumes: data?.resumes.filter((item) => !item.archived).length ?? 0,
    interviewPrepPlans: data?.interviewPrepPlans.length ?? 0,
    storyBankEntries: data?.storyBankEntries.filter((item) => !item.archived).length ?? 0,
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Tools for the moments that need more depth"
        description="Your daily navigation stays focused. Open these workspaces when you are researching, preparing, or organizing supporting material."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {tools.map(({ href, title, description, icon: Icon, countKey, countLabel }) => (
          <Link
            key={href}
            href={href}
            className="glass glow-hover group flex min-h-40 flex-col rounded-xl p-5 transition-colors hover:border-brand/35"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl border border-brand/25 bg-brand-weak text-brand shadow-glow">
                <Icon className="size-5" />
              </span>
              <ArrowUpRight className="size-4 text-ink-500 transition-colors group-hover:text-brand" />
            </div>
            <h2 className="mt-5 text-base font-semibold tracking-tight">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{description}</p>
            <p className="mt-auto pt-4 font-mono text-xs tabular text-ink-500">
              {counts[countKey]} {countLabel}
            </p>
          </Link>
        ))}
      </div>
    </>
  )
}
