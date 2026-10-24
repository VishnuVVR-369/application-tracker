/** Uploads a file to Convex storage through a one-time upload URL and returns its storage id. */
export async function uploadToConvex(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  })
  if (!response.ok) throw new Error("Upload failed")
  const { storageId } = (await response.json()) as { storageId: string }
  return storageId
}

export const MAX_PDF_BYTES = 10 * 1024 * 1024

export function pdfProblem(file: File) {
  if (file.type !== "application/pdf") return "Choose a PDF file."
  if (file.size > MAX_PDF_BYTES) return "That PDF is over 10 MB."
  return null
}
