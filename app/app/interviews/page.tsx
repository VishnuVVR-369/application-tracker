import { Suspense } from "react"

import { InterviewsPage } from "@/components/application-tracker/interviews-page"
import { LoadingPanels } from "@/components/application-tracker/common"

export default function Page() {
  return (
    <Suspense fallback={<LoadingPanels />}>
      <InterviewsPage />
    </Suspense>
  )
}
