import { describe, expect, it } from "vitest"

import manifest from "./manifest"

describe("PWA manifest", () => {
  it("registers an Android web share target and installable icons", () => {
    const value = manifest()
    expect(value).toMatchObject({
      id: "/",
      start_url: "/app",
      display: "standalone",
      share_target: {
        action: "/capture",
        method: "GET",
        params: { title: "title", text: "text", url: "url" },
      },
    })
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "192x192", purpose: "maskable" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ])
    )
    expect(value.shortcuts?.[0]?.url).toBe("/capture?source=shortcut")
  })
})
