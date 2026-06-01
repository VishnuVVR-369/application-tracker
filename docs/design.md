# Application Tracker — Design Spec

> Companion to `plan.md`. Defines the visual language and UX:
> a **modern, dark-first dashboard** with an **emerald** accent, a light theme, and
> **Recharts**-driven analytics.

---

## 1. Principles

1. **The application is the subject of every screen.** Layouts orient around an application or
   a set of applications; supporting data (resumes, reminders, analytics) frames it.
2. **Dark-first, calm-dense.** Dark is the primary theme. Dense where it earns it (tables,
   charts), airy everywhere else. Density never means clutter.
3. **One accent, used sparingly.** Emerald marks the primary action, the active state, and
   "good" data. It is not decoration — if everything is emerald, nothing is.
4. **Data is legible.** Numbers use tabular, monospaced figures. Charts are honest (no truncated
   axes), labeled, and readable at a glance.
5. **Quiet chrome, loud content.** Borders and surfaces are low-contrast; the content and the
   accent carry the eye.
6. **Every state is designed.** Loading (skeletons), empty (guided), and error states are
   first-class, not afterthoughts.

---

## 2. Aesthetic direction

A modern analytics-product feel: deep neutral-slate canvas, layered surfaces with hairline
borders, soft elevation, generous corner radius (not pill-round), and emerald as the single
vivid accent. Subtle, optional grain/glow only behind hero/empty states — no heavy neon. The
light theme is a faithful inversion, not a different design.

---

## 3. Color tokens

Defined as CSS variables; Tailwind reads them. Dark is the default; light overrides via
`:root[data-theme="light"]`. Surfaces layer from `surface-0` (deepest) upward; `ink-*` is text;
`line` is borders.

### Dark (default)
| Token | Value | Use |
|---|---|---|
| `--surface-0` | `#0B0E11` | App background (deepest) |
| `--surface-1` | `#111519` | Sidebar, header, sunken areas |
| `--surface-2` | `#171C21` | Cards, panels |
| `--surface-3` | `#1F252B` | Hover / raised within a card |
| `--line` | `#252C33` | Hairline borders |
| `--line-strong` | `#323A42` | Emphasized borders, dividers |
| `--ink-100` | `#E8EDF1` | Primary text |
| `--ink-300` | `#9AA6B2` | Secondary text |
| `--ink-500` | `#5C6873` | Muted/labels |
| `--accent` | `#10B981` | Emerald — primary action, active, "good" |
| `--accent-hover` | `#34D399` | Hover / glow |
| `--accent-press` | `#059669` | Pressed |
| `--accent-weak` | `rgba(16,185,129,0.10)` | Accent tint backgrounds |
| `--status-up` | `#10B981` | Success / positive |
| `--status-warn` | `#F59E0B` | Warning / due-soon |
| `--status-down` | `#EF4444` | Danger / overdue / rejected |
| `--status-info` | `#38BDF8` | Informational |

### Light
| Token | Value |
|---|---|
| `--surface-0` | `#F7F8FA` |
| `--surface-1` | `#FFFFFF` |
| `--surface-2` | `#FFFFFF` |
| `--surface-3` | `#F1F4F7` |
| `--line` | `#E5E9ED` |
| `--line-strong` | `#D2D8DE` |
| `--ink-100` | `#0F172A` |
| `--ink-300` | `#475569` |
| `--ink-500` | `#7C8794` |
| `--accent` | `#059669` (emerald-600, for contrast on white) |
| `--accent-hover` | `#10B981` |
| status colors | same hues, `-600` weights where needed for contrast |

### Stage colors (board columns & badges)
| Stage | Hue |
|---|---|
| `saved` | slate `--ink-500` |
| `applied` | blue `#3B82F6` |
| `phone_screen` | cyan/teal `#06B6D4` |
| `interview` | violet `#8B5CF6` |
| `offer` | emerald `--accent` |
| `closed` | gray `#6B7280` (red `--status-down` tint when outcome = rejected) |

Stage badges use the hue at ~12% opacity background + full-strength text/border.

---

## 4. Typography

- **Sans (UI + headings):** `Geist` or `Inter`. Headings use tight tracking (`-0.02em`) and
  semibold; no separate display serif (keeps the modern-product tone).
- **Mono (data):** `Geist Mono` / `JetBrains Mono` for numbers, metric values, IDs, dates, and
  small labels. Use `tabular-nums` everywhere numbers can change.
- **Scale:** page title 28–32 / section 18–20 / body 14 / small 12–13 / micro-label 10–11
  (uppercase, letter-spacing `0.16em`, `--ink-500`).
- Body line-height 1.5–1.6; long-form notes/JD use 1.6.

---

## 5. Spacing, radius, elevation, motion

- **Spacing:** 4px base; common gaps 8 / 12 / 16 / 24; page padding 24 (desktop) / 16 (mobile).
- **Radius:** `--r-sm 6px` (controls, badges), `--r-md 10px` (cards/panels), `--r-lg 14px`
  (modals/sheets). Not pill-shaped.
- **Elevation:** flat by default — separation via `--surface-*` + `--line`. One soft shadow for
  overlays/popovers only: `0 8px 32px rgba(0,0,0,0.45)` (dark).
- **Accent glow:** the active nav item and primary button may carry a subtle
  `0 0 12px rgba(16,185,129,0.35)` — used sparingly.
- **Motion:** 120–180ms ease-out for hover/press; 200–260ms for sheet/drawer; respect
  `prefers-reduced-motion`. Drag-on-board uses a light lift + ghost placeholder.

---

## 6. Core components (Radix + Tailwind)

- **App shell:** fixed left sidebar (260px) with brand, 6 nav items (Dashboard, Applications,
  Documents, Analytics, Goals, Settings); active item = accent bar + glow; user block + theme
  toggle + sign-out at the bottom. Top bar: breadcrumb + live status. Mobile: sidebar collapses
  into a drawer.
- **Button:** `primary` (emerald fill, dark text), `secondary` (surface-2 + line), `outline`,
  `ghost`, `danger`. Sizes sm/md.
- **Card / Panel:** `--surface-2` + `--line`, `--r-md`, header row with micro-label.
- **Badge:** stage badges (per §3), plus `success/warn/danger/outline/accent`.
- **Sheet (Radix Dialog, side="right"):** application create/edit, max-w-xl, scrollable.
- **Table:** sticky header, zebra-free, hairline row borders, hover = `--surface-3`, sortable
  headers, tabular numerics.
- **Board card:** company (mono micro-label) + role + small meta row (resume dot, deadline chip,
  referral dot); draggable.
- **Inputs/Select/Textarea:** `--surface-1` field, `--line` border, accent focus ring
  (`0 0 0 2px --accent-weak`).
- **Theme toggle:** dark/light/system segmented control in Settings + a quick toggle in the
  sidebar footer.

---

## 7. Charts (Recharts)

- Library: **Recharts**. One thin wrapper per chart type so theming/tokens stay centralized.
- Palette: emerald `--accent` for the primary/positive series; `--ink-500` for baseline/"other";
  stage hues when a series maps to stages; `--status-down` for rejection/negative.
- Grid lines `--line` at low opacity; axis text `--ink-500` mono; tooltips on `--surface-3` with
  `--line` border and `--r-sm`.
- **Honest axes** (start at 0; no dual-axis tricks). Show counts and % explicitly.
- Chart types: **funnel** = horizontal bars with step conversion labels; **weekly volume** = bar
  (or soft area); **segment breakdowns** = grouped/stacked bars (response/interview/offer);
  **distributions** (rejection reasons/stages, outcomes) = bars. Always render a labeled empty
  state when there's no data.

---

## 8. Page layouts (wireframes)

### Shell
```
┌──────────┬────────────────────────────────────────────────┐
│ ◆ Tracker│  app / dashboard                      ● live  ⌄ │
│          ├────────────────────────────────────────────────┤
│ ▸ Dash   │                                                │
│   Apps   │   <page content, max-w ~1400, centered>        │
│   Docs   │                                                │
│   Stats  │                                                │
│   Goals  │                                                │
│   Setngs │                                                │
│ ──────── │                                                │
│ ◐ theme  │                                                │
│ user  ⏏  │                                                │
└──────────┴────────────────────────────────────────────────┘
```

### Dashboard (overview, no score)
```
Dashboard                                          [ + New application ]
┌ stage strip ───────────────────────────────────────────────────────┐
│ saved 4 · applied 12 · phone 3 · interview 2 · offer 1 · closed 9    │
│ active 18                                                            │
└──────────────────────────────────────────────────────────────────────┘
┌ Needs attention ──────────────┐ ┌ Due this week ─────────────────────┐
│ • 3 stale (no activity 14d+)  │ │ Wed  Take-home — Acme              │
│ • 2 active w/o resume         │ │ Thu  Follow up — Globex (reminder) │
│ • 5 referral not checked      │ │ Fri  Offer response — Initech      │
│ • 4 saved, not applied        │ └────────────────────────────────────┘
└───────────────────────────────┘ ┌ Recent activity ───────────────────┐
                                    │ • Moved Acme → interview            │
                                    │ • Linked resume v3 to Globex        │
                                    │ • Note added to Initech             │
                                    └─────────────────────────────────────┘
```

### Applications — board / list
```
Applications                              [ Board | List ]   [ + New ]   filters ⌄
saved        applied       phone_screen   interview     offer      closed
┌────────┐   ┌────────┐    ┌────────┐     ┌────────┐    ┌──────┐   ┌──────┐
│ ACME   │   │ GLOBEX │    │ INITECH│     │ HOOLI  │    │ PIED │   │ …    │
│ FE Eng │   │ BE Eng │    │ FS Eng │     │ FE Eng │    │ Lead │   │      │
│ ● ▢ 2d │   │ ● ▢    │    │ ● ▢ !  │     │ ●      │    │ ●    │   │      │
└────────┘   └────────┘    └────────┘     └────────┘    └──────┘   └──────┘
        (drag a card across columns to change stage; logs a timeline event)

List view: sortable table — Company | Role | Stage | Source | Referral | Applied | Deadline | Resume
```

### Application detail
```
‹ Back            ACME / Senior Frontend Engineer        [Edit] [Outcome] [Archive]
[ interview ]  [ remote ]  [ referral ]
┌ main (1.4fr) ───────────────────────────┐ ┌ side (0.8fr) ──────────────────┐
│ metadata: location, salary, source,     │ │ Timeline (auto + manual)       │
│ applied, referral, quality, deadlines    │ │  • created                     │
│                                          │ │  • applied → phone_screen      │
│ Job description (snapshot)               │ │  • [ + add entry ]             │
│                                          │ ├────────────────────────────────┤
│ Notes                                    │ │ Linked resume: v3  [view][↻]   │
│                                          │ ├────────────────────────────────┤
│                                          │ │ Quality 78/100  ✓✓✓▢▢          │
│                                          │ ├────────────────────────────────┤
│                                          │ │ Deadlines & reminders          │
│                                          │ ├────────────────────────────────┤
│                                          │ │ Offer (if offer stage):        │
│                                          │ │   comp · response by · decision│
│                                          │ ├────────────────────────────────┤
│                                          │ │ Outcome (if closed):           │
│                                          │ │   rejected/withdrew/… + detail │
└──────────────────────────────────────────┘ └────────────────────────────────┘
```

### Documents (resumes)
```
Resumes                                                   [ ⤴ Upload resume ]
filter: [ All ] [ Default ] [ Archived ]
┌ Frontend Resume v3   ★default ──────────┐ ┌ Backend Resume v1 ──────────────┐
│ 184 KB · updated May 30                  │ │ 201 KB · updated May 12         │
│ "Use for FE-heavy roles."                │ │                                 │
│ [Download] [View] [Edit] [Archive]       │ │ [Download] [View] [Edit] [Arch] │
│ used in 6 applications ▸                  │ │ used in 2 applications ▸         │
└──────────────────────────────────────────┘ └─────────────────────────────────┘
```

### Analytics
```
Analytics
┌ Funnel ─────────────────────────────┐ ┌ Timing ──────────────────────────┐
│ Applied   ████████████ 42           │ │ time→first response   6.4d        │
│ Response  ██████ 18  (43%)          │ │ avg time-in-stage     …           │
│ Interview ███ 9     (50%)           │ │ interview→decision    8.1d        │
│ Offer     █ 3       (33%)           │ └───────────────────────────────────┘
└──────────────────────────────────────┘
┌ Breakdowns (by source / referral / arrangement / quality / resume) ───────┐
│ grouped bars: response · interview · offer rate per segment                │
└────────────────────────────────────────────────────────────────────────────┘
┌ Rejection analysis ─────────────────┐ ┌ Weekly volume ────────────────────┐
│ outcome + reason + stage bars        │ │ bars per week                      │
└──────────────────────────────────────┘ └────────────────────────────────────┘
```

### Goals
```
Goals                                                    week of May 26 ⌄
┌ Targets & progress ─────────────────┐ ┌ Weekly review ───────────────────┐
│ Applications sent     7 / 10  ###--  │ │ Lessons learned: …                │
│ Follow-ups sent       3 / 5   ###--  │ │ Next-week focus: …                │
│ Interviews reached    2 / 2   #####  │ │ [ Save review ]                   │
│ Resume improvements   1 / 2   ##---  │ └───────────────────────────────────┘
└──────────────────────────────────────┘ ┌ Win log ──────────────────────────┐
                                          │ + log a win  | recent wins list   │
                                          └────────────────────────────────────┘
```

### Settings
```
Settings
┌ Profile ────────────────────────────────────────────────────────────────┐
│ avatar · name (editable) · email (read-only) · [Google][GitHub] linked   │
└────────────────────────────────────────────────────────────────────────────┘
┌ Appearance ─────────────────┐ ┌ Data ────────────────────────────────────┐
│ Theme: [Dark][Light][System]│ │ Export my data (JSON)  [ Download ]       │
└──────────────────────────────┘ └───────────────────────────────────────────┘
```

---

## 9. States

- **Loading:** skeleton blocks matching the final layout (cards, table rows, chart frames) —
  never a bare spinner for primary content.
- **Empty:** a centered prompt with one clear CTA in each major surface (e.g., "No applications
  yet → Add your first application"; "No resumes yet → Upload one"; "Add ≥5 applications to
  unlock analytics").
- **Error:** inline, recoverable message in the surface that failed; never blank the page.
- **Optimistic UI:** stage drag and reminder-complete update immediately, reconcile on write.

---

## 10. Responsive & accessibility

- **Breakpoints:** mobile <768 (sidebar → drawer, board → horizontal scroll or stage tabs,
  detail single-column), tablet 768–1024, desktop ≥1024 (two-column detail, multi-col grids).
- **Contrast:** body text ≥ 4.5:1 on its surface in both themes; verify emerald-on-dark and
  emerald-600-on-white for buttons.
- **Keyboard:** all actions reachable; visible focus ring (`--accent-weak`); board cards movable
  via keyboard (menu fallback for drag); Radix handles dialog/menu focus traps.
- **Semantics:** real landmarks (`nav`/`main`), labeled controls, chart data also available as
  accessible text/summary (e.g., funnel numbers in the DOM, not just SVG).
- **Reduced motion:** disable the glow pulse and large transitions when requested.
