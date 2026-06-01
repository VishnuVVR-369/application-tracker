#!/usr/bin/env node

import { spawnSync } from "node:child_process"

const reset = process.argv.includes("--reset")
const email = process.env.SEED_USER_EMAIL ?? "seed-user@example.com"
const args = {
  confirm: "seed-demo-data",
  reset,
  email,
  name: process.env.SEED_USER_NAME ?? "Seed User",
  timezone: process.env.SEED_USER_TIMEZONE ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  authSubject: process.env.SEED_AUTH_SUBJECT ?? `seed:${email}`,
  tokenIdentifier: process.env.SEED_TOKEN_IDENTIFIER ?? `seed:${email}`,
}

const result = spawnSync(
  "pnpm",
  ["exec", "convex", "run", "seed:demo", JSON.stringify(args), "--push"],
  { stdio: "inherit" }
)

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 0)
