# Applications

A small job-application tracker: save postings, build an experience library, tailor base resumes with suggested edits, line up referrals, and move each application from Saved to Closed.

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
| `SITE_URL`, `BETTER_AUTH_URL` | App origin, `http://localhost:3000` in dev |
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
- `tests/resume-workflow.test.ts` exercises Convex functions, scheduling, storage, and schema validation with `convex-test`. Better Auth's identity lookup and OpenAI responses are mocked; tests cover library reuse, confirmation, ownership, evidence validation, stale inputs, retries, and cleanup without calling the provider.
