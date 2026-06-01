import { redirect } from "next/navigation"

import { AppShell } from "@/components/application-tracker/app-shell"
import { hasConvexAuthEnv, isAuthenticated } from "@/lib/auth-server"

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (hasConvexAuthEnv() && !(await isAuthenticated())) {
    redirect("/signin")
  }

  return <AppShell>{children}</AppShell>
}
