"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { normalizeAppData } from "@/lib/app-data-model"
import { authClient } from "@/lib/auth-client"

type EnsureState = {
  userKey: string | null
  status: "idle" | "pending" | "done" | "failed"
}

export function useAppData() {
  const session = authClient.useSession()
  const ensureCurrent = useMutation(api.users.ensureCurrent)
  const rawData = useQuery(api.appData.get)
  const data = React.useMemo(() => normalizeAppData(rawData), [rawData])
  const userKey = session.data?.user.id ?? session.data?.user.email ?? null
  const ensureAttemptRef = React.useRef<EnsureState>({
    userKey: null,
    status: "idle",
  })
  const [ensureFailedFor, setEnsureFailedFor] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!userKey) {
      ensureAttemptRef.current = { userKey: null, status: "idle" }
      return
    }

    if (rawData !== null) {
      ensureAttemptRef.current = { userKey, status: "done" }
      return
    }

    const current = ensureAttemptRef.current
    if (
      current.userKey === userKey &&
      (current.status === "pending" ||
        current.status === "done" ||
        current.status === "failed")
    ) {
      return
    }

    let canceled = false
    ensureAttemptRef.current = { userKey, status: "pending" }
    void ensureCurrent({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
      .then(() => {
        if (!canceled) {
          ensureAttemptRef.current = { userKey, status: "done" }
        }
      })
      .catch(() => {
        if (!canceled) {
          ensureAttemptRef.current = { userKey, status: "failed" }
          setEnsureFailedFor(userKey)
        }
      })

    return () => {
      canceled = true
    }
  }, [ensureCurrent, rawData, userKey])

  const isEnsuringProfile = Boolean(
    userKey && rawData === null && ensureFailedFor !== userKey
  )

  return {
    data,
    session: session.data,
    isAuthPending: session.isPending,
    isLoading: rawData === undefined || session.isPending || isEnsuringProfile,
  }
}
