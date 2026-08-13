import { CaptureIngress } from "@/components/application-tracker/capture-ingress"

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return (
    <CaptureIngress
      share={{
        title: first(params.title),
        text: first(params.text),
        url: first(params.url),
      }}
    />
  )
}
