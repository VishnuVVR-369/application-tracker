import type { Metadata } from "next"
import { Suspense } from "react"

import { InboxView } from "@/components/inbox/inbox-view"

export const metadata: Metadata = { title: "Inbox" }

export default function InboxPage() {
  return (
    // The inbox reads ?app= from the URL, which needs a Suspense boundary under Cache Components.
    <Suspense>
      <InboxView />
    </Suspense>
  )
}
