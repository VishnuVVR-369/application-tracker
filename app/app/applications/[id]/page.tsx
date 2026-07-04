import { Suspense } from "react"

import { ApplicationDetailPage } from "@/components/application-tracker/application-detail-page"
import { DetailSkeleton } from "@/components/application-tracker/skeletons"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ApplicationDetailPage id={id} />
    </Suspense>
  )
}
