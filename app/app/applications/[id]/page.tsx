import { Suspense } from "react"

import { ApplicationDetailPage } from "@/components/application-tracker/application-detail-page"
import { LoadingPanels } from "@/components/application-tracker/common"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<LoadingPanels />}>
      <ApplicationDetailPage id={id} />
    </Suspense>
  )
}
