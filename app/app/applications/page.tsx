import { Suspense } from "react"

import { ApplicationsPage } from "@/components/application-tracker/applications-page"
import { LoadingPanels } from "@/components/application-tracker/common"

export default function Page() {
  return (
    <Suspense fallback={<LoadingPanels />}>
      <ApplicationsPage />
    </Suspense>
  )
}
