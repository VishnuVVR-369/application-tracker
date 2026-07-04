import { Suspense } from "react"

import { ApplicationsPage } from "@/components/application-tracker/applications-page"
import { BoardSkeleton } from "@/components/application-tracker/skeletons"

export default function Page() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <ApplicationsPage />
    </Suspense>
  )
}
