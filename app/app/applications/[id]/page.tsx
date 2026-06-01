import { ApplicationDetailPage } from "@/components/application-tracker/application-detail-page"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ApplicationDetailPage id={id} />
}
