# Application Tracker — Plan

> Status: **Planning**. This document is the canonical product + engineering spec.
> See `design.md` for the visual/UX spec.

---

## 1. Overview

Application Tracker is a personal job-search tool. It helps one person track every job
application from the moment they save a posting through to a final outcome, keep their resume
versions organized, stay on top of deadlines and follow-ups, measure what's working, and hold a
steady weekly cadence without burning out.

**The application is the center of everything.** Every other piece of data — resumes, reminders,
deadlines, timeline events, goal progress, analytics — is attached to or derived from
applications. There are no free-standing CRMs for companies, contacts, or interviews; those
concepts, where they matter, live as fields and sections on the application itself.

The product is six pages plus a public landing page and authentication:

**Dashboard · Applications · Documents · Analytics · Goals · Settings**

---

## 2. Pages at a glance

| Page | Purpose |
|---|---|
| **Dashboard** | A calm overview: stage counts, what's due this week, what needs attention, recent activity, and a quick "add application" entry point. |
| **Applications** | The hub. A kanban board and a sortable/filterable list, plus a rich per-application detail view. |
| **Documents** | A resume library: upload, version, mark a default, and see which applications each resume was used for. |
| **Analytics** | Funnel & conversion rates, timing metrics, segment breakdowns, and rejection analysis. |
| **Goals** | Weekly targets with auto-tracked progress, a win log, and a weekly reflection. |
| **Settings** | Display name, theme, and data export. |

---

## 3. Product decisions

These are the settled rules the implementation must honor.

**Platform**
- Stack: Next.js (App Router) + Convex (backend & storage) + Better Auth + Tailwind CSS + Radix
  primitives, with pure `src/lib/*-model.ts` domain logic unit-tested with Vitest.
- Design: modern, **dark-first dashboard** with an **emerald** accent and a light/dark toggle.
- Charts: **Recharts**.
- A **public landing/marketing page**; the app lives behind authentication.
- Auth: **Google + GitHub OAuth** via Better Auth on Convex. No email/password.
- Single user per account; no collaboration/sharing in v1.

**Application entity (the core)**
- Six pipeline stages: `saved → applied → phone_screen → interview → offer → closed`.
- Tracks: **referral status**, **application quality** (with a quality checklist + 0–100 score),
  and **rejection detail**.
- **Deadlines** (application / take-home / offer-response) plus a **reminder system**.
- A **timeline** with **both** automatically-logged events and manually-added entries.
- `closed` captures a **full outcome** (`rejected` / `withdrew` / `accepted_elsewhere` /
  `ghosted`) plus rejection detail (stage, reason, feedback, lessons, optional reapply-after).
- `offer` stage captures **comp + response deadline + decision** (`accepted` / `declined` /
  `negotiating`).
- **One resume per application** (clean attribution for "which resume performs best").

**Documents (resumes)**
- A resume library: upload to Convex storage, mark a **default** resume, link **one** resume per
  application, track usage ("used in N applications"), per-resume notes, and archive.

**Reminders**
- Reminders can be **attached to an application or stand alone**. Types: `follow_up`,
  `deadline`, `general`.

**Dashboard**
- A plain overview (no computed score): stage counts, upcoming deadlines, reminders due, a
  lightweight "needs attention" list, recent activity, and quick-add.

**Analytics** (four modules)
- Funnel & conversion rates · timing metrics · segment breakdowns · rejection analysis.

**Goals**
- Four weekly metrics: applications sent, follow-ups sent, interviews reached, resume
  improvements. Plus a **win log** and a **weekly review** (lessons learned + next-week focus).

**Settings**
- Edit display name · light/dark/system theme · export my data (JSON).

---

## 4. Architecture

A layered design with thin backend functions and well-tested pure logic.

```
Public landing + auth ──▶ Next.js App Router (app/* behind auth)
        │
   React client components ──uses──▶ useAuthedQuery / Convex react hooks
        │
   Convex functions (convex/*.ts)  ── thin wrappers: auth + db access only
        │
   Pure domain logic (src/lib/*-model.ts) ── unit-tested with Vitest
        │
   Convex schema (convex/schema.ts) + _storage for resume files
```

**Principles**
- **Thin Convex functions, fat models.** Business logic (analytics, goal progress, quality
  score, dashboard rollups) lives in pure functions under `src/lib/*-model.ts` and is unit-tested
  independently of the backend. Convex queries/mutations only fetch, authorize, and delegate.
- **Read `convex/_generated/ai/guidelines.md` before writing Convex code** (per AGENTS.md).
- **Read the relevant `node_modules/next/dist/docs/` guide before writing Next.js code** — this
  repo runs a customized Next.js whose APIs may differ from defaults.
- One Convex module per domain noun; shared validators defined in `schema.ts`.

### Directory layout

```
convex/
  schema.ts            # data model (see §5)
  auth.ts, auth.config.ts, convex.config.ts, http.ts   # Better Auth integration
  users.ts             # current-user doc + settings
  applications.ts      # CRUD, stage moves, rejection/outcome, offer fields, resume link
  resumes.ts           # upload url, create, update, archive, list, usage
  reminders.ts         # app-linked + standalone
  activity.ts          # timeline: auto + manual events
  goals.ts             # weekly goal upsert, progress, win log, review
  analytics.ts         # delegates to analytics-model
  dashboard.ts         # delegates to dashboard-model

src/lib/
  application-model.ts      (+ .test.ts)   # types, stage labels, transitions
  resume-model.ts           (+ .test.ts)   # file validation, formatting, default logic
  reminder-model.ts         (+ .test.ts)   # due/overdue grouping
  activity-model.ts         (+ .test.ts)   # event builders/labels
  quality-model.ts          (+ .test.ts)   # checklist + 0–100 score
  rejection-model.ts        (+ .test.ts)   # outcome + reason/stage labels
  analytics-model.ts        (+ .test.ts)   # funnel, timing, breakdowns, rejection
  goals-model.ts            (+ .test.ts)   # targets, progress, week math, win types
  dashboard-model.ts        (+ .test.ts)   # overview rollups, attention list
  convex-mappers.ts         (+ .test.ts)   # Doc → record mappers
  use-authed-query.ts, auth-client.ts, auth-server.ts, auth.ts, utils.ts

src/app/
  page.tsx                       # public landing
  signin/page.tsx                # auth
  app/layout.tsx                 # authed shell (sidebar + theme)
  app/page.tsx                   # Dashboard
  app/applications/page.tsx      # board + list
  app/applications/[id]/page.tsx # detail
  app/documents/page.tsx         # resumes
  app/analytics/page.tsx
  app/goals/page.tsx
  app/settings/page.tsx
  api/auth/[...all]/route.ts     # Better Auth handler

src/components/
  app-shell.tsx, theme-provider/toggle, applications board+list+detail,
  application-form, resume library, analytics charts, goals, settings, landing/*, ui/*
```

---

## 5. Data model

Convex schema. Resume files live in `_storage`.

### `users`
`authUserId, tokenIdentifier, name?, email?, imageUrl?, createdAt, updatedAt`
Indexes: `by_authUserId`, `by_tokenIdentifier`.

### `userSettings`
`userId, displayName?, theme: "dark"|"light"|"system", createdAt, updatedAt`
Index: `by_userId`. (Powers the display-name override and theme.)

### `applications` (core)
```
userId
companyName: string          # plain text
roleTitle: string
location?, workArrangement?  # remote|hybrid|onsite
salaryMin?, salaryMax?, currency?
postingUrl?
source?                      # linkedin|company_website|referral|recruiter|indeed|wellfound|other
dateApplied?
stage                        # saved|applied|phone_screen|interview|offer|closed
referralStatus?              # not_checked|need_referral|reached_out|referred
applicationType?             # quick_apply|tailored_apply|referral_backed
resumeId?: Id<"resumes">     # ONE resume per application
applicationDeadlineAt?, takeHomeDeadlineAt?, offerResponseDeadlineAt?
# offer details
offerComp?: string           # free-text comp summary (e.g. "$160k + 0.2% + $20k bonus")
offerDecision?               # accepted|declined|negotiating
# content
jobDescriptionSnapshot?, notes?
# close / outcome
closedAt?
closedOutcome?               # rejected|withdrew|accepted_elsewhere|ghosted
rejectionStage?, rejectionReason?, rejectionFeedback?, rejectionLessons?, reapplyAfter?
archived: boolean
createdAt, updatedAt, lastActivityAt?
```
Indexes: `by_userId`, `by_userId_and_archived`, `by_userId_and_stage`,
`by_userId_and_source`, `by_userId_and_referralStatus`, `by_userId_and_resumeId`,
`by_userId_and_applicationDeadlineAt`, `by_userId_and_takeHomeDeadlineAt`,
`by_userId_and_offerResponseDeadlineAt`, `by_userId_and_reapplyAfter`.

### `resumes`
```
userId, label, fileName, storageId: Id<"_storage">, mimeType, sizeBytes,
notes?, isDefault: boolean, archived: boolean, createdAt, updatedAt
```
Indexes: `by_userId`, `by_userId_and_archived`, `by_userId_and_isDefault`.
Usage is computed by querying `applications.by_userId_and_resumeId`.

### `reminders`
```
userId, applicationId?: Id<"applications">,   # optional → standalone allowed
title, description?, dueAt,
status,                                        # pending|completed|dismissed
reminderType,                                  # follow_up|deadline|general
createdAt, completedAt?, dismissedAt?
```
Indexes: `by_userId`, `by_userId_and_status`, `by_userId_and_status_and_dueAt`,
`by_applicationId`.

### `activityEvents` (timeline)
```
userId, applicationId: Id<"applications">,
type,                       # created|stage_changed|edited|resume_linked|reminder_completed|note|manual
title, description?,
source,                     # auto|manual
eventDate, createdAt
```
Indexes: `by_userId`, `by_applicationId`, `by_userId_and_eventDate`.

### `weeklyGoals`
```
userId, weekStart,
applicationsSentTarget, followUpsSentTarget, interviewsReachedTarget, resumeImprovementsTarget,
manualResumeImprovements,
lessonsLearned?, nextWeekFocus?,
createdAt, updatedAt
```
Indexes: `by_userId`, `by_userId_and_weekStart`.

### `winLogEntries`
```
userId, applicationId?: Id<"applications">,
type,                       # application_submitted|response_received|interview_reached|offer_received|resume_improved|follow_up_completed
title, notes?, occurredAt,
source,                     # auto|manual
createdAt
```
Indexes: `by_userId`, `by_userId_and_occurredAt`.

---

## 6. Feature specs

### 6.1 Landing + Auth
- Public marketing page: hero, feature highlights, CTA, footer.
- `/signin`: Google + GitHub buttons (Better Auth). Logged-in users hitting `/` or `/signin`
  redirect to `/app`; logged-out users hitting `/app/*` redirect to `/signin`.

### 6.2 Dashboard (`/app`)
A calm overview — no score. Sections:
- **Stage strip:** counts per stage + total active (applied/phone_screen/interview/offer).
- **Needs attention** (plain list): stale active apps (no activity ≥14d), active apps with no
  linked resume, active apps with referral status `not_checked`, saved-not-applied.
- **Due this week:** upcoming deadlines (from app deadline fields) + pending reminders due ≤7d,
  merged and sorted by date.
- **Recent activity:** latest N `activityEvents` across all applications.
- **Quick add:** "New application" opens the application form (sheet).

Backed by `dashboard-model.ts` (pure rollup) via `convex/dashboard.ts`.

### 6.3 Applications (`/app/applications`)
- **Board + List toggle.**
  - Board: one column per stage; drag a card to change stage (writes stage + logs a
    `stage_changed` activity event). Stage color per `design.md`.
  - List: sortable/filterable table (company, role, stage, source, referral, dateApplied,
    deadline, resume). Filters: stage, source, referral status, archived.
- **Create/Edit form** (sheet): company, role, location, work arrangement, salary range,
  posting URL, source, date applied, stage, referral status, application quality, JD snapshot,
  notes, deadlines, resume picker (defaults to the default resume).
- **Detail (`/app/applications/[id]`):**
  - Header: company / role / stage badge / quick actions (edit, archive, record outcome).
  - Metadata panel.
  - JD snapshot + notes.
  - **Timeline:** auto events + an "add note/entry" control for manual events.
  - **Linked resume:** the one attached resume (view/download/change).
  - **Quality checklist + score** (0–100) from `quality-model.ts`.
  - **Deadlines + reminders** for this app (create/complete).
  - **Offer panel** (visible in `offer` stage): comp, response deadline, decision.
  - **Outcome panel** (at `closed`): outcome enum + rejection stage/reason/feedback/lessons +
    reapply-after.

### 6.4 Documents — Resumes (`/app/documents`)
- Upload (PDF) → Convex storage → `resumes` row. Validate type/size in `resume-model.ts`.
- Mark a **default** resume (used to prefill the application form).
- Card list: label, size, updated, notes, default badge, archived badge, download/view,
  edit (label/notes/default), archive/restore, and **"used in N applications"** with links.

### 6.5 Analytics (`/app/analytics`) — Recharts
All computed in `analytics-model.ts` over the user's applications + activity + resume links:
- **Funnel & conversion:** applied → response (reached phone_screen+) → interview → offer, with
  conversion % at each step.
- **Timing:** avg time-to-first-response, avg time-in-stage, avg interview→decision.
- **Segment breakdowns:** response/interview/offer rates by **source**, **referral status**,
  **work arrangement**, **application quality**, **resume version**.
- **Rejection analysis:** `closedOutcome` distribution + rejection stage/reason distribution +
  early-stage rejection warning.
- Charts: funnel (bar), weekly volume (bar/area), breakdowns (grouped bars), distributions
  (bars). See `design.md` for chart conventions. Each chart has a labeled empty state.

### 6.6 Goals (`/app/goals`)
- Week selector (defaults to current week; week math in `goals-model.ts`).
- **Targets + progress** (4 metrics): applications sent, follow-ups sent, interviews reached,
  resume improvements. First three auto-computed; resume improvements is a manual count.
- **Win log:** log/auto-log wins (`response_received`, `interview_reached`, `offer_received`,
  `resume_improved`, `follow_up_completed`, `application_submitted`).
- **Weekly review:** lessons learned + next-week focus, saved per week.

### 6.7 Settings (`/app/settings`)
- **Display name** override (writes `userSettings.displayName`).
- **Theme**: dark / light / system (writes `userSettings.theme`; respected by the theme provider).
- **Export my data**: download JSON of applications + resume metadata + goals + reminders.
- Profile identity (email/avatar) shown read-only from the OAuth provider.

---

## 7. Domain logic & tests

Each `src/lib/*-model.ts` is pure and unit-tested. Minimum coverage:
- `application-model`: stage ordering, allowed transitions, label maps.
- `quality-model`: checklist items + score boundaries (0/partial/100).
- `rejection-model`: outcome + reason/stage label maps.
- `analytics-model`: funnel counts, conversion rounding, timing with/without timeline data,
  each breakdown dimension, rejection distribution, empty-state insight.
- `goals-model`: week boundaries, per-metric progress %, completion, win-type labels.
- `dashboard-model`: stale detection, due-this-week merge/sort, attention list.
- `reminder-model`: pending/overdue/due-soon grouping.
- `resume-model`: file validation (type/size), default selection, size formatting.

---

## 8. Build milestones

1. **Foundation** — `schema.ts`; Better Auth wiring; theme provider (dark default + light) +
   tokens; authed `app-shell` with 6-item nav; landing + signin.
2. **Applications core** — schema-backed CRUD; form; board + list; detail with timeline
   (auto + manual), deadlines, quality score, offer + outcome panels.
3. **Resumes** — upload/storage, default, link-to-application, usage.
4. **Reminders** — app-linked + standalone; surfaced on dashboard + app detail.
5. **Dashboard** — overview rollups + attention + due-this-week + recent activity + quick add.
6. **Analytics** — Recharts: funnel, timing, breakdowns, rejection.
7. **Goals** — targets/progress, win log, weekly review.
8. **Settings** — display name, theme persistence, JSON export.
9. **Polish & QA** — empty/loading/error states, responsive, a11y, full `*-model` test pass.
