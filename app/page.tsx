import { Suspense } from "react"

import { BoardView } from "@/components/board/board-view"

export default function BoardPage() {
  return (
    // The board reads ?app= from the URL, which needs a Suspense boundary under Cache Components.
    <Suspense>
      <BoardView />
    </Suspense>
  )
}
