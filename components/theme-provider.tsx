"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Dark-first theme provider (docs/design.md §3, §6).
 *
 * Writes the resolved theme to the `data-theme` attribute on <html>, which is
 * what `globals.css` keys its light override off of (`:root[data-theme="light"]`).
 * Dark is the default so the first paint — and SSR, before this mounts — is dark.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
