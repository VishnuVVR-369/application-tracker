import type { ResumeRecord } from "@/lib/application-model"

export const MAX_RESUME_BYTES = 10 * 1024 * 1024

export type ResumeFileLike = {
  name: string
  type: string
  size: number
}

export function validateResumeFile(file: ResumeFileLike) {
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf")
  const hasPdfMime = file.type === "application/pdf" || file.type === ""

  if (!hasPdfExtension || !hasPdfMime) {
    return {
      ok: false as const,
      message: "Upload a PDF file. The extension and MIME type must both be PDF.",
    }
  }

  if (file.size > MAX_RESUME_BYTES) {
    return {
      ok: false as const,
      message: "Resume PDFs must be 10 MB or smaller.",
    }
  }

  return { ok: true as const }
}

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
}

export function ensureSingleDefaultResume(resumes: ResumeRecord[], defaultId: string) {
  return resumes.map((resume) => ({
    ...resume,
    isDefault: resume.id === defaultId,
  }))
}

export function getDefaultResume(resumes: ResumeRecord[]) {
  return resumes.find((resume) => resume.isDefault && !resume.archived)
}

export function getResumeUsage(resumes: ResumeRecord[], resumeIds: Array<string | undefined>) {
  return resumes.reduce(
    (usage, resume) => {
      usage[resume.id] = resumeIds.filter((id) => id === resume.id).length
      return usage
    },
    {} as Record<string, number>
  )
}

