import { useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"

/** setStatus with an optimistic board update, so a dropped card lands instantly instead of snapping back. */
export function useSetStatus() {
  return useMutation(api.applications.setStatus).withOptimisticUpdate((store, { id, status, outcome }) => {
    const board = store.getQuery(api.applications.board, {})
    if (board) {
      store.setQuery(api.applications.board, {}, {
        ...board,
        cards: board.cards.map((card) =>
          card._id === id
            ? {
                ...card,
                status,
                outcome: status === "closed" ? outcome : undefined,
                statusChangedAt: card.status === status ? card.statusChangedAt : Date.now(),
                // Mirrors the server: leaving Saved stamps appliedAt once; returning to Saved clears it.
                appliedAt: status === "saved" ? undefined : (card.appliedAt ?? Date.now()),
              }
            : card,
        ),
      })
    }
    const application = store.getQuery(api.applications.get, { id })
    if (application) {
      store.setQuery(api.applications.get, { id }, {
        ...application,
        status,
        outcome: status === "closed" ? outcome : undefined,
      })
    }
  })
}
