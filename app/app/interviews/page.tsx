import { Suspense } from "react"

import { InterviewsPage } from "@/components/application-tracker/interviews-page"
import { PageSkeleton } from "@/components/application-tracker/skeletons"

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton action columns="1fr" panels={2} />}>
      <InterviewsPage />
    </Suspense>
  )
}
