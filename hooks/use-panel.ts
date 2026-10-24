import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import type { Id } from "@/convex/_generated/dataModel"

/** The open application lives in the URL (?app=<id>) so it survives reloads and Back closes it. */
export function usePanel() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const openId = (searchParams.get("app") as Id<"applications"> | null) ?? null

  const open = useCallback(
    (id: Id<"applications">) => router.push(`${pathname}?app=${id}`, { scroll: false }),
    [router, pathname],
  )
  const close = useCallback(() => router.push(pathname, { scroll: false }), [router, pathname])

  return { openId, open, close }
}
