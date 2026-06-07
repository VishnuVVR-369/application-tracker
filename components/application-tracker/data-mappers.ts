import type { Doc } from "@/convex/_generated/dataModel"
import type {
  ActivityEvent,
  ApplicationContact,
  ApplicationInterview,
  ApplicationOffer,
  ApplicationRecord,
  ApplicationResumeLink,
  ApplicationStageHistory,
  InterviewPrepPlanRecord,
  QualityChecklistItem,
  ReferralOutreachRecord,
  ResumeRecord,
  StoryBankEntryRecord,
  StoryUsageRecord,
  TaskRecord,
  TargetCompanyRecord,
  WeeklyGoal,
  WinLogEntry,
} from "@/lib/application-model"

export function mapApplication(doc: Doc<"applications">): ApplicationRecord {
  return {
    id: doc._id,
    companyName: doc.companyName,
    companyKey: doc.companyKey,
    companyWebsite: doc.companyWebsite,
    companyDomain: doc.companyDomain,
    roleTitle: doc.roleTitle,
    roleKey: doc.roleKey,
    location: doc.location,
    workArrangement: doc.workArrangement,
    compensationMin: doc.compensationMin,
    compensationMax: doc.compensationMax,
    compensationCurrency: doc.compensationCurrency,
    compensationPeriod: doc.compensationPeriod,
    compensationNotes: doc.compensationNotes,
    postingUrl: doc.postingUrl,
    postingUrlCanonical: doc.postingUrlCanonical,
    postingTitleSnapshot: doc.postingTitleSnapshot,
    postingCompanySnapshot: doc.postingCompanySnapshot,
    postingCapturedAt: doc.postingCapturedAt,
    source: doc.source,
    sourceDetail: doc.sourceDetail,
    sourceSystem: doc.sourceSystem,
    sourceExternalId: doc.sourceExternalId,
    dateSavedDate: doc.dateSavedDate,
    dateAppliedDate: doc.dateAppliedDate,
    stage: doc.stage,
    currentStageEnteredAt: doc.currentStageEnteredAt,
    referralStatus: doc.referralStatus,
    applicationType: doc.applicationType,
    currentResumeId: doc.currentResumeId,
    qualityChecks: doc.qualityChecks,
    applicationDeadlineDate: doc.applicationDeadlineDate,
    takeHomeDeadlineDate: doc.takeHomeDeadlineDate,
    offerResponseDeadlineDate: doc.offerResponseDeadlineDate,
    jobDescriptionSnapshot: doc.jobDescriptionSnapshot,
    notes: doc.notes,
    closedAt: doc.closedAt,
    closedDate: doc.closedDate,
    closedOutcome: doc.closedOutcome,
    rejectionStage: doc.rejectionStage,
    rejectionStageDetail: doc.rejectionStageDetail,
    rejectionReason: doc.rejectionReason,
    rejectionReasonDetail: doc.rejectionReasonDetail,
    rejectionFeedback: doc.rejectionFeedback,
    rejectionLessons: doc.rejectionLessons,
    reapplyAfterDate: doc.reapplyAfterDate,
    archived: doc.archived,
    archivedAt: doc.archivedAt,
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
    fileHash: doc.fileHash,
    notes: doc.notes,
    isDefault: doc.isDefault,
    defaultedAt: doc.defaultedAt,
    archived: doc.archived,
    archivedAt: doc.archivedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapResumeLink(doc: Doc<"applicationResumeLinks">): ApplicationResumeLink {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    resumeId: doc.resumeId,
    isCurrent: doc.isCurrent,
    linkedAt: doc.linkedAt,
    unlinkedAt: doc.unlinkedAt,
    resumeSnapshot: doc.resumeSnapshot,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapTask(doc: Doc<"tasks">): TaskRecord {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    relatedInterviewId: doc.relatedInterviewId,
    relatedOfferId: doc.relatedOfferId,
    title: doc.title,
    description: doc.description,
    dueAt: doc.dueAt,
    dueDate: doc.dueDate,
    timezone: doc.timezone,
    status: doc.status,
    kind: doc.kind,
    kindDetail: doc.kindDetail,
    source: doc.source,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    completedAt: doc.completedAt,
    dismissedAt: doc.dismissedAt,
    canceledAt: doc.canceledAt,
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
    actorType: doc.actorType,
    actorUserId: doc.actorUserId,
    eventAt: doc.eventAt,
    eventDate: doc.eventDate,
    relatedEntityType: doc.relatedEntityType,
    relatedEntityId: doc.relatedEntityId,
    metadataJson: doc.metadataJson,
    dedupeKey: doc.dedupeKey,
    supersededAt: doc.supersededAt,
    createdAt: doc.createdAt,
  }
}

export function mapStageHistory(doc: Doc<"applicationStageHistory">): ApplicationStageHistory {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    stage: doc.stage,
    enteredAt: doc.enteredAt,
    exitedAt: doc.exitedAt,
    enteredFromStage: doc.enteredFromStage,
    exitedToStage: doc.exitedToStage,
    source: doc.source,
    activityEventId: doc.activityEventId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapContact(doc: Doc<"applicationContacts">): ApplicationContact {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    name: doc.name,
    normalizedName: doc.normalizedName,
    relationshipType: doc.relationshipType,
    relationshipDetail: doc.relationshipDetail,
    roleTitle: doc.roleTitle,
    email: doc.email,
    normalizedEmail: doc.normalizedEmail,
    phone: doc.phone,
    linkedinUrl: doc.linkedinUrl,
    notes: doc.notes,
    archived: doc.archived,
    archivedAt: doc.archivedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapInterview(doc: Doc<"applicationInterviews">): ApplicationInterview {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    roundNumber: doc.roundNumber,
    roundLabel: doc.roundLabel,
    interviewType: doc.interviewType,
    interviewTypeDetail: doc.interviewTypeDetail,
    format: doc.format,
    formatDetail: doc.formatDetail,
    status: doc.status,
    scheduledAt: doc.scheduledAt,
    scheduledDate: doc.scheduledDate,
    timezone: doc.timezone,
    durationMinutes: doc.durationMinutes,
    contactIds: doc.contactIds,
    prepNotes: doc.prepNotes,
    questions: doc.questions,
    feedback: doc.feedback,
    result: doc.result,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    completedAt: doc.completedAt,
    canceledAt: doc.canceledAt,
  }
}

export function mapOffer(doc: Doc<"applicationOffers">): ApplicationOffer {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    versionNumber: doc.versionNumber,
    isCurrent: doc.isCurrent,
    offeredAt: doc.offeredAt,
    offeredDate: doc.offeredDate,
    responseDeadlineDate: doc.responseDeadlineDate,
    baseAmount: doc.baseAmount,
    bonusAmount: doc.bonusAmount,
    equitySummary: doc.equitySummary,
    currency: doc.currency,
    period: doc.period,
    compensationNotes: doc.compensationNotes,
    decision: doc.decision,
    decidedAt: doc.decidedAt,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapGoal(doc: Doc<"weeklyGoals">): WeeklyGoal {
  return {
    id: doc._id,
    weekStartDate: doc.weekStartDate,
    timezone: doc.timezone,
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
    occurredDate: doc.occurredDate,
    source: doc.source,
    relatedEntityType: doc.relatedEntityType,
    relatedEntityId: doc.relatedEntityId,
    dedupeKey: doc.dedupeKey,
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

export function mapTargetCompany(doc: Doc<"targetCompanies">): TargetCompanyRecord {
  return {
    id: doc._id,
    companyName: doc.companyName,
    companyKey: doc.companyKey,
    website: doc.website,
    domain: doc.domain,
    tier: doc.tier,
    status: doc.status,
    targetRoles: doc.targetRoles,
    targetLevel: doc.targetLevel,
    locationPreference: doc.locationPreference,
    workArrangement: doc.workArrangement,
    priorityScore: doc.priorityScore,
    roleFitScore: doc.roleFitScore,
    referralGoal: doc.referralGoal,
    applicationWindowStartDate: doc.applicationWindowStartDate,
    applicationWindowEndDate: doc.applicationWindowEndDate,
    researchNotes: doc.researchNotes,
    hiringBarNotes: doc.hiringBarNotes,
    interviewProcessNotes: doc.interviewProcessNotes,
    compensationNotes: doc.compensationNotes,
    notes: doc.notes,
    archived: doc.archived,
    archivedAt: doc.archivedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapReferralOutreach(doc: Doc<"referralOutreach">): ReferralOutreachRecord {
  return {
    id: doc._id,
    targetCompanyId: doc.targetCompanyId,
    applicationId: doc.applicationId,
    contactName: doc.contactName,
    contactRole: doc.contactRole,
    source: doc.source,
    status: doc.status,
    linkedinUrl: doc.linkedinUrl,
    email: doc.email,
    normalizedEmail: doc.normalizedEmail,
    firstContactedDate: doc.firstContactedDate,
    lastContactedDate: doc.lastContactedDate,
    followUpDate: doc.followUpDate,
    messageTemplate: doc.messageTemplate,
    notes: doc.notes,
    archived: doc.archived,
    archivedAt: doc.archivedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapInterviewPrepPlan(doc: Doc<"interviewPrepPlans">): InterviewPrepPlanRecord {
  return {
    id: doc._id,
    applicationId: doc.applicationId,
    targetCompanyId: doc.targetCompanyId,
    title: doc.title,
    status: doc.status,
    focusAreas: doc.focusAreas,
    codingDrillsTarget: doc.codingDrillsTarget,
    codingDrillsDone: doc.codingDrillsDone,
    systemDesignDrillsTarget: doc.systemDesignDrillsTarget,
    systemDesignDrillsDone: doc.systemDesignDrillsDone,
    behavioralStoriesTarget: doc.behavioralStoriesTarget,
    behavioralStoriesReady: doc.behavioralStoriesReady,
    mockInterviewsTarget: doc.mockInterviewsTarget,
    mockInterviewsDone: doc.mockInterviewsDone,
    companyResearchDone: doc.companyResearchDone,
    resumeDeepDiveDone: doc.resumeDeepDiveDone,
    weaknessTags: doc.weaknessTags,
    nextAction: doc.nextAction,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapStory(doc: Doc<"storyBankEntries">): StoryBankEntryRecord {
  return {
    id: doc._id,
    title: doc.title,
    project: doc.project,
    situation: doc.situation,
    task: doc.task,
    action: doc.action,
    result: doc.result,
    impactMetrics: doc.impactMetrics,
    technologies: doc.technologies,
    competencies: doc.competencies,
    senioritySignal: doc.senioritySignal,
    notes: doc.notes,
    archived: doc.archived,
    archivedAt: doc.archivedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function mapStoryUsage(doc: Doc<"storyUsages">): StoryUsageRecord {
  return {
    id: doc._id,
    storyId: doc.storyId,
    applicationId: doc.applicationId,
    interviewId: doc.interviewId,
    usedAtDate: doc.usedAtDate,
    confidence: doc.confidence,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}
