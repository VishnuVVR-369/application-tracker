# Applications

A small job-application tracker: save postings, build an experience library, tailor base resumes with suggested edits, line up referrals, and move each application from Saved to Closed.
Jobs collected by open-bot's Job Scout land in an inbox, scored against every base resume, with suggested edits ready for the strong matches.

## Stack

- Next.js 16 (App Router, Cache Components) with shadcn/ui and Tailwind 4
- Convex for data, file storage, and the AI action
- Better Auth with GitHub sign-in (local install under `convex/betterAuth`)
- OpenAI for review extraction, evidence-backed resume suggestions, and resume match scoring
- bun as the package manager

## Running locally

```bash
bun install
bun run dev:convex   # syncs convex/ to the dev deployment
bun run dev          # http://localhost:3000
```

Convex environment variables (set with `bunx convex env set NAME value`):

| Name | Purpose |
| --- | --- |
| `SITE_URL`, `BETTER_AUTH_URL` | App origin, `http://localhost:3000` in dev. `SITE_URL` also builds the inbox links the MCP tools return |
| `BETTER_AUTH_SECRET` | Session signing secret |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth app; its callback URL must be `<SITE_URL>/api/auth/callback/github` |
| `OPENAI_API_KEY` | Review extraction, resume suggestions, and match analysis (configure on Convex, not only in `.env.local`) |
| `OPENAI_MODEL` | Optional, defaults to `gpt-5.5` |

## Checks

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## How it fits together

- `convex/schema.ts` defines the data: applications belong to a company, and people are saved per company so they can be asked again for other roles.
- Referral requests link a person to an application. Requests in "Asked" become due for a follow-up after the configured number of days, counted from the ask or the last follow-up. Closed applications stop asking for follow-ups.
- Base resume PDFs are read to text in `convex/resumesNode.ts`. `convex/analysesNode.ts` asks OpenAI for a score, a verdict, and matched and missing keywords. Results are cached per application and resume.
- Experience is a library shared across applications. Paste a review with its company, role, and period on `/experience`; extraction runs in the background. Each accomplishment starts as a draft with its supporting passage. Edit, confirm, dismiss, or move it back to review. Accomplishments needing clarification must be edited before confirmation.
- In an application's Resume tab, select a base PDF and choose **Suggest changes**. Only confirmed accomplishments and the base resume inform generation. Suggestions include current text, copyable plain-text wording or actions, reasons, and evidence snapshots. Update the resume in Overleaf yourself and attach the submitted PDF as before. The optional match check remains available.
- Suggestions are saved per application and base resume. Regeneration is explicit; previous successful results survive failures. Changing the job, base PDF, or confirmed library marks saved suggestions outdated. In-flight output is rejected if its inputs change. Deleting a review removes its accomplishments; saved suggestions retain their historical evidence and become outdated. Deleting an application or base resume removes its suggestions.
- **The inbox.** Collected jobs are applications with the status `discovered`, kept off the board until you **Shortlist** them (they become Saved) or **Dismiss** them. `jobPostings` records each portal listing, so a job seen on LinkedIn and Naukri is stored once, and a posting you deleted or dismissed is never collected again.
- **The MCP endpoint.** `POST <NEXT_PUBLIC_CONVEX_SITE_URL>/mcp` (`convex/mcp.ts`) serves stateless MCP for open-bot's Job Scout: `report_feed`, `save_postings`, `job_digest` and `list_jobs`. Requests need `Authorization: Bearer <token>`; create tokens in Settings, or for a headless client with `bunx convex run apiTokens:issue '{"userId": "...", "name": "Job Scout"}'`. Only token hashes are stored.
- **The pipeline.** `convex/jobsNode.ts` reads each posting's page text into a job; every line of the description must appear in the page. `convex/pipeline.ts` then scores the job against every base resume, picks the best (unless you picked one), and starts Suggest changes when the score reaches your fit threshold (Settings, default 70). Model work runs on the `jobsPool` workpool, three at a time, retrying rate limits and outages. New resumes, confirmed experience and threshold changes refresh the inbox; shortlisted jobs are left to you.
- `tests/jobs.test.ts` covers the MCP endpoint, collecting, duplicates, extraction checks, the pipeline and the inbox with a fake OpenAI and the workpool running in `convex-test`.
- `tests/resume-workflow.test.ts` exercises Convex functions, scheduling, storage, and schema validation with `convex-test`. Better Auth's identity lookup and OpenAI responses are mocked; tests cover library reuse, confirmation, ownership, evidence validation, stale inputs, retries, and cleanup without calling the provider.
