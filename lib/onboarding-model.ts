export type OnboardingStatus = "active" | "completed" | "dismissed"

export function shouldShowOnboarding({
  status,
}: {
  status?: OnboardingStatus
}) {
  return status === "active"
}
