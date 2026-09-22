# Daloft People — UI/UX Redesign v2 (Enterprise Minimal)

Complete visual redesign of the entire application with a refined pass over
contrast, alignment and responsive behavior. All application logic, routes,
API calls, role-based workspaces and permissions are untouched.

## Design system

- Canvas `#F6F7F9`, white surfaces, hairline `#E7E9ED` borders
- Single professional blue accent `#2563EB`; green reserved strictly for success states
- Inter typography with a readable 12–26px scale
- Light 248px sidebar, collapsible rail, mobile drawer
- Full responsive pass (1440 / 1024 / 768 / 390 / 360 breakpoints)

## v13 — Port onto the daloft-workspace repo

The enterprise redesign (v2-v12) has been applied to the main
daloft-workspace codebase while preserving every functional change it
contained:

- New ADMIN role fully supported everywhere (routing guards, login,
  role labels, system settings, task broadcast, employee filters)
- Manager workspace keeps its newer feature set: assigned-departments
  overview, department-filtered roster, daily work reports with
  date/employee/department filters and Excel export
- People table keeps the Active / Inactive counters; the Archive
  button remains removed per earlier feedback
- All inline green/legacy color tokens in ManagerDashboard were moved
  to the enterprise blue palette
- Fixed the leave donut in analytics: var(--amber) was undefined in
  the redesign CSS, silently breaking the conic gradient
- index.html loads the Inter webfont, matching the design system

## v12 — Simple clean login

- Login page returned to a single, quiet, centered card on the plain canvas
  (the v11 split brand panel was too busy): logo, title, two fields, sign-in
  button, quiet reset link and the secure-access footer — nothing else

## v11 — Inventory bars, DWR layout, login page, flat sidebar

- Inventory overview bar lists rebuilt on a strict three-column grid
  (name · bar · value) so quantities now sit in their own right-aligned
  column with tabular numerals — no more floating "19" next to labels.
  Unit labels live inside the value column ("19 units", "1 unit" — correct
  singular/plural) and the detached "UNITS" chip was removed from the card
  header. Mobile stacks label + value above a full-width bar
- Daily Work Reports (admin) re-aligned: consistent 16px vertical rhythm,
  roster panel uses shared card styling (proper hairline border, sticky,
  no inline max-height hacks), duplicated "in view" counters collapsed to
  one, filter card spacing normalised with a 12px internal rhythm
- Topbar user chip now shows the friendly role ("HR Administrator",
  "System Administrator", "Manager") instead of the raw login ID
  (e.g. "admin"); employees/interns still see their employee ID
- Login page redesigned as a split layout: blue-tinted brand panel with
  logo, headline, feature list and drone visual, beside a cleaner sign-in
  card; collapses to the single card on phones
- Sidebar restored to the simple flat list everywhere (system admin, HR
  admin, manager, employee) — the v9 grouped section labels are removed
  and only the single "WORKSPACE" header remains

## v10 — Archive removed, login & inventory polish, friendly role labels

- The "Archive" employee button is removed from the People table (Edit and
  Deactivate/Activate remain)
- Role labels are now friendly everywhere: "HR Administrator",
  "System Administrator", "Manager", "Employee", "Intern" — no raw role codes
- Login page calmed down: neutral background, lighter card shadow, smaller
  title, softer focus rings, cleaner sign-in button (no shadow), quiet links
- Inventory overview with sparse data: cards take their natural height (no
  more giant empty voids next to one-row lists), Y-axis ticks are unique
  (no more "2, 2, 1, 1, 0"), low-stock rows show a "current / minimum"
  label, header action buttons (Open stock / View all) are clearly
  blue-tinted actions
- Daily Work Reports got more breathing room: larger card padding, wider
  layout gaps
- Sidebar labels protected against wrapping/clipping

## v9 — Grouped admin navigation & system button polish

- Admin sidebars are now grouped with small uppercase section labels so the
  long admin module list is scannable:
  System Admin: People (HR Administrators, Organization) · Workplace (Office
  Calendar, Tasks) · Governance (Daily Work Reports, Security Center, Audit
  Logs) · System (Offices & Geofences, Configuration, System Health)
  HR Admin: People (People, Attendance, Leave, Daily Reports) · Workplace
  (Tasks, Announcements, Office Calendar) · Operations (Inventory, Damage,
  Offices) · Insights (Reports & Analytics)
  Group labels hide when the sidebar is collapsed
- System-admin filter rows (Audit logs, Security) now stack on phones with
  full-width 44px Apply/Reset buttons and inputs
- All system primary/secondary buttons got text containment (no overflow)
- Audit timestamps use tabular numerals for clean column alignment
- Verified zero page-level overflow at 320/390px across system admin, HR
  admin and employee workspaces

## v8 — Audit log simplification, universal mobile 2-column grids

- Audit Logs simplified: action column is now plain wrapped blue text (no
  pills), long API paths like "POST /api/system-admin/organization/..." wrap
  fully, compact rows, top-aligned columns, cleaner mobile stacking
- All admin summary grids (analytics metrics, attendance stats, inventory
  stats, system cards) now flow to a compact 2-column grid on phones instead
  of one full-width card per row
- Analytics hero banner compacted on phones; employee clock reduced
- Page headers (analytics, attendance, inventory, leave) stack on phones with
  full-width action buttons — no more clipped Refresh/Add buttons
- Technical backend errors (Hibernate proxy / "no Session" / stack traces)
  are replaced with a friendly message instead of raw stack text
- Verified zero page-level overflow at 320/390px on audit, attendance,
  inventory, employee dashboard and Daily Work Reports

## v7 — Daily Work Reports redesign, audit log, mobile rows

- DWR admin toolbar rebuilt: balanced "Team review" header with live count,
  hairline divider, controls aligned right
- DWR KPI cards compacted (shorter height, tighter padding; 2x2 grid on phones)
- DWR table restyled as a proper data table: uppercase sticky headers, row
  hover, consistent cell padding, long text truncates via expandable controls
- Duplicated "Showing X reports" counter removed from the filter card
- Employee "Recent attendance" table restructured to 4 compact columns
  (Date / Check in-out stacked / Worked / Status) — fits a 390px phone with no
  scrolling, "HALF DAY" badges no longer clip
- Audit Logs rebuilt as a structured table: When / Actor / Action / Details
  headers, blue action pills, IST timestamps, long API paths wrap inside their
  column, compact stacked cards on mobile
- Leave page: "2026 balance" badge can no longer clip; Casual/Earned/Sick
  balances are a tight 3-column group on phones
- Verified zero page-level overflow at 320/390/1440px on DWR admin, audit logs,
  employee overview and leave

## v6 — Mobile compactness & chart rebuild

- Employee mobile: the four daily stats (Today / Working time / My tasks /
  Updates) now form a compact 2x2 grid instead of four oversized stacked
  cards; quick actions also went 2-up with tighter sizing; hero chip can no
  longer clip
- Inventory "Stock movement" chart fully rebuilt: bars aligned exactly over
  their month labels across the full card width, value numbers sit above each
  bar pair (never behind bars), aligned horizontal gridlines with a 5-step
  Y-axis scale, blue/amber bars, clean empty state when no movement
- "Stock by category" now distributes its rows across the full card height
  (no more floating-in-a-void look with few categories) and uses thicker bars
- Buttons/tabs/filter chips can no longer leak text outside their box
  (overflow contained with ellipsis fallback)
- Verified: zero page-level horizontal overflow at 320/390/768/1440px on
  inventory, employee dashboard, DWR admin, leave, tasks and my-inventory

## v5 — Inventory fix, notifications fix, India-safe dates

- Inventory "Stock movement" card repaired: the summary tiles and chart were
  laid out side-by-side, forcing the chart outside the card (the "data out of
  the box" bug). Now: tiles above, chart below, always inside the card
- Monthly chart capped to the latest six months (matches the card title) and
  turns blue (received) / amber (issued); chart scrolls horizontally on phones
  instead of squishing; legend gained colored dots
- Notification Center rebuilt: Delete and Mark-read now work reliably
  (optimistic update, server sync, error recovery with a visible message
  instead of silent failure), category icons, Today/Yesterday time labels,
  proper link-styled actions
- All dates and times now render in India time (Asia/Kolkata) regardless of the
  device's timezone/region settings; new shared helper src/utils/datetime.js
- Report date default fixed: previously used UTC, which stored the previous
  day's date for anything submitted between midnight and 5:30 AM IST
- Verified zero page-level overflow at 320/360/390/768/1024/1440px on the
  inventory, notifications and report pages (tab strip and chart scroll
  horizontally by design)

## v4 — Deep responsive & polish pass

- Analytics "Workforce command center" banner converted from dark navy to the
  light soft-blue system (matches the employee hero)
- Daily Work Reports (admin): duplicated page title removed, compact toolbar
  with live report count, refined empty state, roomier table headers
- Daily Work Report (employee): form rebuilt — responsive field rows (stack on
  mobile), sentence-case labels, neutral inputs, full-width submit on mobile
- Systematic overflow fix: all grid children get `min-width: 0` — kills the
  layout blowouts on phones (attendance table, sys cards, calendar header)
- Touch targets raised to 44px on mobile for buttons, tabs, filters and dates
- Verified zero horizontal overflow at 320 / 360 / 390 / 768 / 1024 / 1440 px
  on every major page (automated DOM-level check)

## v3 — Employee Overview reframe

- New light soft-blue hero banner: date, time-aware greeting and a live attendance status chip
- Quick actions: four equal cards; primary is a soft blue tint (no saturated solid block)
- Clock widget converted from heavy dark navy to a light card with soft decorative rings
- Fully responsive: 4 → 2 → 1 column action grid, banner wraps on mobile

## v2 refinements

- **Login** — rebuilt as a clean centered card: "Welcome back" heading,
  neutral gray canvas, white card, blue accents, visible forgot-password link
- **Daily Work Reports (admin)** — employee roster rebuilt: clean white cards,
  blue selected state (no more black cards), view toggle now blue/white,
  neutral text (no green everywhere), readable roster fonts, friendlier
  empty states, Export as a standard neutral button
- **Office Calendar** — save button blue, governance label muted, green
  soft-button converted to blue
- **Employee dashboard** — uniform stat-card and quick-action heights,
  high-contrast buttons on the dark clock card, roomier pills
- **Contrast pass** — muted text darkened (`#5B6472`), invisible light-gray
  text fixed, tiny 9.5–10.5px fonts bumped to 11px+
- **API errors** — HTML error pages never leak into the UI as raw code

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
