"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { normalizeAppData } from "@/lib/app-data-model"
import { authClient } from "@/lib/auth-client"

export function useAppData() {
  const session = authClient.useSession()
  const ensureCurrent = useMutation(api.users.ensureCurrent)
  const rawData = useQuery(api.appData.get)
  const data = React.useMemo(() => normalizeAppData(rawData), [rawData])
  const [ensured, setEnsured] = React.useState(false)

  React.useEffect(() => {
    if (ensured || rawData !== null || !session.data?.user) {
      return
    }

    void ensureCurrent({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
      .then(() => setEnsured(true))
      .catch(() => setEnsured(true))
  }, [rawData, ensureCurrent, ensured, session.data?.user])

  return {
    data,
    session: session.data,
    isAuthPending: session.isPending,
    isLoading: rawData === undefined || session.isPending,
  }
}
