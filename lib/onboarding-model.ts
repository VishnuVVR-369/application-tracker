export type OnboardingStatus = "active" | "completed" | "dismissed"

export function shouldShowOnboarding({
  applicationCount,
  status,
}: {
  applicationCount: number
  status?: OnboardingStatus
}) {
  if (status === "completed" || status === "dismissed") {
    return false
  }

  return status === "active" || applicationCount === 0
}
