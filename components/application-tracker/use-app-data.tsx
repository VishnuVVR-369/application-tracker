"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"

export function useAppData() {
  const session = authClient.useSession()
  const ensureCurrent = useMutation(api.users.ensureCurrent)
  const data = useQuery(api.appData.get)
  const [ensured, setEnsured] = React.useState(false)

  React.useEffect(() => {
    if (ensured || data !== null || !session.data?.user) {
      return
    }

    void ensureCurrent()
      .then(() => setEnsured(true))
      .catch(() => setEnsured(true))
  }, [data, ensureCurrent, ensured, session.data?.user])

  return {
    data,
    session: session.data,
    isAuthPending: session.isPending,
    isLoading: data === undefined || session.isPending,
  }
}

