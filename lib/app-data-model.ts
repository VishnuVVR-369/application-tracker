import type { FunctionReturnType } from "convex/server"

import { api } from "@/convex/_generated/api"

export type RawAppData = FunctionReturnType<typeof api.appData.get>
export type AppData = NonNullable<RawAppData>

export function normalizeAppData(data: RawAppData | undefined): RawAppData | undefined {
  if (!data) {
    return data
  }

  const partial = data as Partial<AppData>
  return {
    ...data,
    applications: partial.applications ?? [],
    resumes: partial.resumes ?? [],
    resumeUsage: partial.resumeUsage ?? {},
    applicationResumeLinks: partial.applicationResumeLinks ?? [],
    tasks: partial.tasks ?? [],
    activityEvents: partial.activityEvents ?? [],
    applicationStageHistory: partial.applicationStageHistory ?? [],
    applicationContacts: partial.applicationContacts ?? [],
    applicationInterviews: partial.applicationInterviews ?? [],
    applicationOffers: partial.applicationOffers ?? [],
    weeklyGoals: partial.weeklyGoals ?? [],
    winLogEntries: partial.winLogEntries ?? [],
    qualityChecklistItems: partial.qualityChecklistItems ?? [],
    targetCompanies: partial.targetCompanies ?? [],
    referralOutreach: partial.referralOutreach ?? [],
    interviewPrepPlans: partial.interviewPrepPlans ?? [],
    storyBankEntries: partial.storyBankEntries ?? [],
    storyUsages: partial.storyUsages ?? [],
  } as AppData
}
