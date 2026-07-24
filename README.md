# Application Tracker

A job-search command center, not just a spreadsheet replacement. Track applications through every stage, surface interviews and contacts that would otherwise go stale, and get AI-assisted signal on where to focus effort.

## Features

- **Applications** — pipeline from saved → applied → phone screen → interview → offer/closed, with source, referral status, and compensation tracking.
- **Targets** — a ranked list of target companies (dream/strong/backup) with referral outreach tracking.
- **Interviews & Prep** — schedule interviews and prep story-bank material (behavioral stories, talking points) ahead of them.
- **People** — contacts and referral relationships tied back to applications and companies.
- **Documents** — resume storage with AI-powered resume/job-description match analysis.
- **Ghosting assistant** — flags applications that have gone quiet and suggests follow-ups without changing their stage automatically.
- **Insights & Analytics** — funnel conversion, effort-to-outcome (ROI), and other stats across your search.
- **Goals** — weekly/period targets for applications, outreach, and interviews.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Convex](https://www.convex.dev) for the backend, database, and real-time sync
- [Better Auth](https://www.better-auth.com) for authentication (email + OAuth)
- Tailwind CSS, Radix UI / shadcn, and Motion for the interface
- OpenAI API (optional) for resume/job-description match analysis

## Getting started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values you need (Convex deployment URL, Better Auth secret, OAuth client credentials, and optionally an `OPENAI_API_KEY` for match analysis).

3. Start Convex in one terminal:

   ```bash
   npx convex dev
   ```

4. Start the Next.js dev server in another:

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` — start the Next.js dev server
- `pnpm build` / `pnpm start` — production build and start
- `pnpm lint` — run ESLint
- `pnpm typecheck` — run the TypeScript compiler with no emit
- `pnpm test` — run the Vitest suite
- `pnpm seed:test-data` — seed a local Convex deployment with sample data (see `.env.example` for `SEED_*` overrides)
