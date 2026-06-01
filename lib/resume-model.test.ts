import { describe, expect, it } from "vitest"

import { formatFileSize, validateResumeFile } from "@/lib/resume-model"

describe("resume-model", () => {
  it("accepts only PDF files up to 10 MB", () => {
    expect(validateResumeFile({ name: "resume.pdf", type: "application/pdf", size: 1024 }).ok).toBe(true)
    expect(validateResumeFile({ name: "resume.docx", type: "application/pdf", size: 1024 }).ok).toBe(false)
    expect(validateResumeFile({ name: "resume.pdf", type: "text/plain", size: 1024 }).ok).toBe(false)
    expect(validateResumeFile({ name: "resume.pdf", type: "application/pdf", size: 11 * 1024 * 1024 }).ok).toBe(false)
  })

  it("formats file sizes", () => {
    expect(formatFileSize(1024)).toBe("1 KB")
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB")
  })
})

