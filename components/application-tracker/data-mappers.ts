import type { Doc } from "@/convex/_generated/dataModel"
import type {
  ActivityEvent,
  ApplicationRecord,
  QualityChecklistItem,
  ReminderRecord,
  ResumeRecord,
  WeeklyGoal,
  WinLogEntry,
} from "@/lib/application-model"

export function mapApplication(doc: Doc<"applications">): ApplicationRecord {
  return {
    id: doc._id,
    companyName: doc.companyName,
    roleTitle: doc.roleTitle,
    location: doc.location,
    workArrangement: doc.workArrangement,
    salaryMin: doc.salaryMin,
    salaryMax: doc.salaryMax,
    currency: doc.currency,
    postingUrl: doc.postingUrl,
    source: doc.source,
    dateApplied: doc.dateApplied,
    stage: doc.stage,
    referralStatus: doc.referralStatus,
    applicationType: doc.applicationType,
    resumeId: doc.resumeId,
    qualityChecks: doc.qualityChecks,
    applicationDeadlineAt: doc.applicationDeadlineAt,
    takeHomeDeadlineAt: doc.takeHomeDeadlineAt,
    offerResponseDeadlineAt: doc.offerResponseDeadlineAt,
    offerComp: doc.offerComp,
    offerDecision: doc.offerDecision,
    jobDescriptionSnapshot: doc.jobDescriptionSnapshot,
    notes: doc.notes,
    closedAt: doc.closedAt,
    closedOutcome: doc.closedOutcome,
    rejectionStage: doc.rejectionStage,
    rejectionReason: doc.rejectionReason,
    rejectionFeedback: doc.rejectionFeedback,
    rejectionLessons: doc.rejectionLessons,
    reapplyAfter: doc.reapplyAfter,
    archived: doc.archived,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastActivityAt: doc.lastActivityAt,
  }
}

export function mapResume(doc: Doc<"resumes">): ResumeRecord {
  return {
    id: doc._id,
    label: doc.label,
    fileName: doc.fileName,
    storageId: doc.storageId,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    notes: doc.notes,
    isDefault: doc.isDefault,
    archived: doc.archived,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapReminder(doc: Doc<"reminders">): ReminderRecord {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    title: doc.title,
    description: doc.description,
    dueAt: doc.dueAt,
    status: doc.status,
    reminderType: doc.reminderType,
    createdAt: doc.createdAt,
    completedAt: doc.completedAt,
    dismissedAt: doc.dismissedAt,
  }
}

export function mapActivity(doc: Doc<"activityEvents">): ActivityEvent {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    type: doc.type,
    title: doc.title,
    description: doc.description,
    source: doc.source,
    eventDate: doc.eventDate,
    createdAt: doc.createdAt,
    fromStage: doc.fromStage,
    toStage: doc.toStage,
  }
}

export function mapGoal(doc: Doc<"weeklyGoals">): WeeklyGoal {
  return {
    id: doc._id,
    weekStart: doc.weekStart,
    applicationsSentTarget: doc.applicationsSentTarget,
    followUpsSentTarget: doc.followUpsSentTarget,
    interviewsReachedTarget: doc.interviewsReachedTarget,
    resumeImprovementsTarget: doc.resumeImprovementsTarget,
    manualResumeImprovements: doc.manualResumeImprovements,
    lessonsLearned: doc.lessonsLearned,
    nextWeekFocus: doc.nextWeekFocus,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapWin(doc: Doc<"winLogEntries">): WinLogEntry {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    type: doc.type,
    title: doc.title,
    notes: doc.notes,
    occurredAt: doc.occurredAt,
    source: doc.source,
    createdAt: doc.createdAt,
  }
}

export function mapQualityItem(doc: Doc<"qualityChecklistItems">): QualityChecklistItem {
  return {
    id: doc._id,
    key: doc.key,
    label: doc.label,
    description: doc.description,
    source: doc.source,
    weight: doc.weight,
    sortOrder: doc.sortOrder,
    enabled: doc.enabled,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}
