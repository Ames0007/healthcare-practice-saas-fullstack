# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Added

- Repository governance structure
- Specification organization
- Claude Code implementation tracking
- Architectural decision log
- Risk/blocker register
- Laravel 13.26.1 backend bootstrap under `backend/` (TASK-002): modular-monolith
  structural convention (`backend/app/Modules/`, `backend/ARCHITECTURE.md`),
  `/api/v1` route-loading convention, `/api/v1/health` liveness endpoint,
  environment-driven CORS configuration. No business functionality.
- Next.js 16.3.2 frontend bootstrap under `frontend/` (TASK-003): five
  top-level route areas (`/auth`, `/onboarding`, `/app`, `/book`, `/admin`),
  design-token foundation (`frontend/src/design-system`), foundational
  component set (Button, Input, Card, StatusBadge, Skeleton, EmptyState,
  AppShell/AppSidebar/AppTopbar/PageHeader), genuine FR/AR i18n + RTL
  foundation (cookie-backed, no flash), responsive shell (mobile bottom
  nav / tablet collapsed rail / desktop expanded sidebar). No business
  functionality, no backend integration.
- Specification #10 (Visual Identity & Graphic Charter) approved and added
  to the repository (TASK-003A). Design tokens realigned to the approved
  palette (primary hover, secondary/disabled text, and all four semantic
  "soft" tones corrected to the approved HEX values; `primary-strong`,
  `primary-support`, `primary-soft`, `text-disabled` added). Typography
  confirmed (Inter / Noto Sans Arabic, unchanged from TASK-003). Fixed two
  charter deviations found during audit: the SaaS Admin shell used a dark
  header bar (prohibited by Spec #10 §32) and the sidebar's selected-item
  background used a generic neutral instead of the approved Primary-50
  soft surface (Spec #10 §16/§19). Added a `primary` StatusBadge tone
  (restrained teal, for "in consultation"-style active-process states).
  Aligned the `/book` placeholder with the charter (cabinet-identity area,
  teal primary action — still non-functional). Rendered browser visual QA
  was not possible in this environment (no browser-automation tooling);
  validated instead via compiled-CSS hex inspection and SSR HTML/dir/lang
  inspection across FR and AR for all five route areas. No business
  functionality, no backend integration.
- Local development infrastructure established (TASK-004): PostgreSQL
  18.6, Redis 8.10.1 and MinIO run as native/portable processes — no
  Docker on this development machine, see `DECISIONS.md` ADR-002 and
  `RISKS_AND_BLOCKERS.md` RISK-014 — managed via `scripts/dev-up.sh` /
  `dev-down.sh` / `dev-status.sh` / `dev-reset.sh`. Backend connects to a
  real local PostgreSQL database and, via `predis/predis` (the portable
  PHP build has no native `phpredis` extension), a real local Redis
  instance; MinIO provides local S3-compatible object storage with a
  `healthcare-practice-dev` bucket. Full local stack (frontend + backend
  + all three infrastructure services) validated running simultaneously;
  PostgreSQL and MinIO data confirmed to survive a stop/restart cycle.
  New `docs/development/LOCAL_DEVELOPMENT.md` guide. No migrations, no
  queue architecture, no application file-storage behavior — those remain
  TASK-005/TASK-006 scope.
- PostgreSQL application foundation established (TASK-005). Reviewed
  Laravel's three default migrations (users/password_reset_tokens/
  sessions, cache/cache_locks, jobs/job_batches/failed_jobs) against
  Specification #4 before they were ever applied and removed all three —
  `database/migrations/` is deliberately empty (see
  `database/migrations/README.md`); the `users` schema conflicted with
  Spec #4 §4.1's UUID-based Identity model and auth/cache/queue are later
  tasks' scope (TASK-014/015, TASK-006). Removed `app/Models/User.php`
  and its factory as a consequence; `config/auth.php` no longer
  hardcodes a default Authenticatable model. `SESSION_DRIVER`/
  `CACHE_STORE`/`QUEUE_CONNECTION` moved from `database` to `file`/
  `file`/`sync` accordingly — no behavior silently depended on the
  removed tables. Established the UUID convention: application-generated
  UUIDv7 (RFC 9562) via a new `App\Models\Concerns\HasUuidPrimaryKey`
  trait wrapping Laravel's native `HasUuids` (already UUIDv7-based in
  13.26.1 — no custom generation code needed), stored as native
  PostgreSQL `uuid` columns. `config/database.php`'s `pgsql` connection
  now pins the session to UTC regardless of server locale. Added a
  dedicated `healthcare_practice_test` database (provisioned by
  `scripts/dev-up.sh` alongside the development database) and
  reconfigured `phpunit.xml` to run the full suite against real
  PostgreSQL instead of SQLite, with the test database hardcoded so
  `php artisan test` cannot reach development data by name alone. Added
  `tests/Feature/Database/DatabaseFoundationTest.php` (6 tests) proving
  the PostgreSQL connection, UUIDv7 generation/round-tripping, and
  NUMERIC(14,2) money precision against a test-only fixture table
  (created/dropped per test, never a migration). New
  `backend/database/README.md` documents the UUID/timestamp/money/
  tenant-table/tenant-aware-FK/migration/constraint/index conventions;
  ADR-003 (single `public` schema for V1) and ADR-004 (UUIDv7 strategy)
  record the material decisions. RLS remains an open, deliberately
  deferred decision (RISK-007, unchanged). No business-domain tables,
  no TASK-006 (Redis queue/cache) functionality implemented.
- Aujourd'hui dashboard prototype (UI-001), replacing the TASK-003
  foundation/demo page as the real `/app` landing screen. Built entirely
  against a new centralized mock-data layer
  (`frontend/src/features/today/mock-data.ts`, synthetic Moroccan-context
  names only) — no backend/API integration. Composed from new reusable
  components: `MetricCard` and `AttentionItem`
  (`components/ui/`, domain-neutral) and `AppointmentCard` plus a central
  appointment status → tone/label registry
  (`components/domain/appointments/`, intended for reuse by Agenda/
  UI-002). Implements the header (greeting + locale-aware business date),
  four operational KPI cards, a prominent "Prochain rendez-vous" section
  with a prototype-only local-state "Patient arrivé" interaction
  (Confirmed → Arrived, no persistence), "Agenda du jour", a neutral "À
  faire" attention list, and a typography-led (not green/red-coded)
  "Finances aujourd'hui" snapshot — all reusing the existing AppShell,
  design tokens and graphic charter. Loading (shape-matched skeleton),
  empty-day and error states are implemented and covered by tests; the
  live page only exercises loading→loaded (a fixed prototype delay, no
  real fetch) since there is nothing to error against yet. Full FR/AR
  translations added under a new `aujourdhui.*` dictionary namespace;
  RTL verified. Added `frontend/src/features/today/today-dashboard.test.tsx`
  (7 tests: FR content, AR/RTL, the local status-change interaction, empty/
  loading/error states). Renamed the stale `emptyState.backToFoundation`
  translation key to `emptyState.backToHome` since the catch-all `/app/*`
  placeholder now points back to a real dashboard, not a demo page. All
  13 frontend tests, typecheck, lint and build pass; backend regression
  (10 tests) unaffected — no backend files touched.
- Agenda & appointment prototype (UI-002) at `/app/agenda`, replacing the
  placeholder. Extended the appointment domain layer for reuse across both
  prototype screens: moved `AppointmentStatus` into
  `components/domain/appointments/types.ts` (11-state machine — the
  original UI-001 6-status subset keeps identical tones, so Aujourd'hui is
  unaffected) and extended `AppointmentCard` with a `calendar` variant,
  explicit `schedulingType`, and an `onSelect` handler. Added four new
  generic `components/ui/` primitives shared across every dialog surface:
  `Dialog` (one focus-trapped, portal-rendered implementation backing
  drawer/modal/alert variants — Escape closes, focus returns to the
  trigger), `ConfirmDialog`, `Toast` (single-slot, not a global provider),
  `Combobox` (keyboard-navigable patient search with a "+ Créer un nouveau
  patient" future-feature notice), and `Select`. New
  `frontend/src/features/agenda/` composition: Day view (30-minute slots,
  click-to-create empty slots) and Week view (desktop grid, mobile day-
  selector + reused Day view list — seven columns are not usable on
  mobile); exact-time vs arrival-window appointments render distinctly
  everywhere (`AppointmentCard`'s "Arrivée entre" wording, not just a
  dash-joined range). `AppointmentDrawer` exposes the state-aware primary
  action from a new central `status-actions.ts` registry (Confirmer →
  Patient arrivé → Mettre en attente → Commencer; Ouvrir consultation is a
  disabled future-route placeholder per UI-005 scope) plus Ouvrir
  patient/Modifier/Reporter/Annuler/Absent. Create/edit
  (`AppointmentFormDialog`), reschedule (`RescheduleDialog`), cancellation
  with a by-patient/by-practice reason (`CancelConfirmDialog`) and no-show
  (`NoShowConfirmDialog`) are all local prototype state transitions on one
  centralized appointment array — a status change from any surface (drawer,
  Waiting Room) is immediately visible on every other surface, with no
  cross-page sync needed since Waiting Room is an in-page toggle, not a
  separate route. A lightweight frontend-only conflict check
  (`features/agenda/conflict.ts`) blocks obviously overlapping exact/
  window bookings per practitioner/date and suggests up to 3 nearby free
  slots — explicitly UX demonstration only, not real server-side
  enforcement. Full FR/AR translations under new `agenda.*` and
  `appointment.*` dictionary namespaces (the latter replacing UI-001's now-
  dead `aujourdhui.status.*` keys); RTL verified, including drawer/
  dialog placement via logical CSS properties (no `rtl:` overrides
  needed). Fixed two genuine bugs surfaced while testing this feature:
  `addDaysIso` mixed local-time `Date` parsing with UTC `toISOString()`
  serialization, silently shifting mock week-view dates by a day on any
  machine ahead of UTC; and Day View matched appointments to time slots by
  exact string equality, so any appointment not starting on an exact
  30-minute boundary (e.g. a 08:55 arrival, or any time a user might type
  into the create form's native time input) silently never rendered — both
  fixed at the root (UTC-consistent date arithmetic; slot-containment
  bucketing) rather than only adjusting mock data to avoid them. Added
  `frontend/src/features/agenda/agenda-page.test.tsx` (20 tests covering
  day/week rendering, exact/window distinction, practitioner filtering,
  drawer open/close, every lifecycle transition, create/conflict/edit/
  reschedule/cancel/no-show, Waiting Room + shared-state propagation,
  empty/loading/error states, and FR/AR/RTL). All 33 frontend tests
  (13 UI-001 + 20 UI-002), typecheck, lint and build pass; backend
  regression (10 tests) unaffected — no backend files touched.
- Patient list prototype (UI-003A) at `/app/patients`, replacing the
  placeholder — the first real Patients workspace. New
  `frontend/src/features/patients/` composition against a centralized
  mock dataset (`mock-data.ts`, 16 synthetic Moroccan-context patients:
  patient number, name, phone, responsible practitioner, last visit, next
  appointment, outstanding balance — administrative/operational fields
  only, no clinical data per CLAUDE.md §13). Desktop table (Patient/
  Téléphone/Praticien/Dernière visite/Prochain RDV/Solde, "Dernière
  visite" hidden below `lg`) and a separate mobile card presentation
  (`PatientTable`/`PatientCardList`, the same dual-render pattern as
  Agenda's Waiting Room) share one `filterPatients()` pure function
  (`filter-patients.ts`) for local, case-insensitive search across name/
  phone/patient number plus practitioner and next-appointment (Today/
  Upcoming/None) filters — result count and a "Effacer les filtres"
  action give active-filter feedback. Compact prev/next pagination
  (`components/ui/pagination.tsx`, 10/page) and an initials-fallback
  `components/ui/avatar.tsx` are new generic primitives (Spec #8 §47/§58).
  Each row links to a new `/app/patients/[id]` route that previews the
  selected patient's synthetic name and reference while explicitly
  deferring the real Patient 360° overview to UI-004; "+ Nouveau patient"
  shows a future-feature toast rather than a creation form (UI-003B
  scope). Three list states beyond loading/loaded: the global empty state
  ("Aucun patient pour le moment"), a distinct filtered/search-empty state
  ("Aucun patient ne correspond à vos critères") that never suggests
  adding a first patient when patients merely happen to be filtered out,
  and an error state with retry. Full FR/AR under a new `patients.*`/
  `patientDetail.*` dictionary namespace; RTL verified (logical
  properties throughout, phone/patient-number isolated `dir="ltr"` inside
  RTL layout). `toIntlLocale` in `features/today/format.ts` was exported
  (previously module-private) so `features/patients/format.ts` can reuse
  it for locale-aware date formatting instead of duplicating it — no
  behavioral change, confirmed by the unchanged UI-001 suite. Added
  `frontend/src/features/patients/patients-page.test.tsx` (18 tests:
  route render, rows, patient number, search by name/phone/patient
  number, practitioner filter, next-appointment filter, clear filters,
  filtered-empty, global empty, loading, error, FR/AR/RTL, the desktop/
  mobile dual-render, the future-feature notice, and the Patient 360°
  placeholder link). All 51 frontend tests (13 UI-001 + 20 UI-002 + 18
  UI-003A), typecheck, lint and build pass; backend regression (10 tests)
  unaffected — no backend files touched.
- Create/edit patient prototype (UI-003B) — "+ Nouveau patient" on
  `/app/patients` now opens a real right-side drawer form instead of the
  UI-003A future-feature toast (removed, along with its now-dead
  `patients.newPatientNotice` key); each row gained a compact "Modifier"
  action alongside "Ouvrir". `/app/patients` now owns a mutable
  `Patient[]` in React state (was recomputed from mock data every render)
  so created/edited patients flow straight through the existing search/
  filter/pagination pipeline with no extra wiring — the same centralized-
  state pattern as Agenda's appointment array (UI-002). New
  `PatientFormDialog` (`components/patient-form-dialog.tsx`) is shared
  by create and edit: primary fields (Prénom/Nom/Téléphone/Praticien
  responsable, all required) plus a collapsible "Informations
  complémentaires" section (birth date/email/city/address/emergency
  contact, all optional, collapsed by default and auto-expanded when
  editing a patient that already has any of these set) — still no
  clinical fields. `Patient` gained the matching optional administrative
  fields; the list/table columns are unchanged. Duplicate detection
  (`duplicate-detection.ts` + `normalize.ts`, Spec #4 §8) flags a
  probable match on normalized phone (`+212`/`00212`/spaced-format
  aware) or same normalized first+last name (accent- and case-
  insensitive); a match never blocks or merges — the form shows each
  candidate's name/number/phone/practitioner with an "Ouvrir ce patient"
  link and one "Créer quand même" override, mirroring Agenda's conflict-
  suggestion UX (UI-002). Edit's duplicate check excludes the patient
  being edited. A new prototype-only sequential generator
  (`patient-number.ts`) continues the existing `PAT-00281`... series.
  Validation (`patient-form-validation.ts`) is inline-rendered per field
  (required first/last/phone/practitioner; optional email format, DOB-
  not-in-future, and a loose Moroccan phone digit-count check reused for
  the emergency contact number) — the form now sets `noValidate` so this
  custom validation actually runs instead of being preempted by
  unlocalized native browser constraint-validation popups, a real gap
  found while writing the required-field test (agenda's own equivalent
  form was never exercised against this exact case). Successful create/
  edit shows a toast ("Patient créé."/"Patient modifié.") and closes the
  drawer; Annuler/Escape discard the draft without submitting. Shared
  locale-utility cleanup: `toIntlLocale` (added to `features/today/
  format.ts` in UI-003A) moved to `frontend/src/i18n/intl-locale.ts` —
  while moving it, found that `features/agenda/format.ts` had
  independently defined the exact same two-line function during UI-002;
  both Today and Agenda now import the one shared copy instead of
  defining/duplicating it. Pure move, no behavioral change, confirmed by
  the unchanged UI-001/UI-002 suites. Full FR/AR for every new form/
  duplicate-warning string; RTL verified. Extended
  `frontend/src/features/patients/patients-page.test.tsx` to 30 tests
  (the 17 surviving UI-003A tests + 1 replacing the retired future-
  feature-toast test + 12 new: required validation, optional/
  complementary fields, no leaked appointment fields, create integrating
  with list/search/practitioner-filter/number-generation in one flow,
  phone duplicate + Open Existing, name duplicate, Create Anyway without
  mutating the original record, edit prefill with a read-only patient
  number, edit updating the list, edit self-exclusion, edit collision
  with a different patient, cancel discarding the draft, and Arabic/RTL
  for the form). All 63 frontend tests (13 UI-001 + 20 UI-002 + 30
  UI-003A/B), typecheck, lint and build pass; backend regression
  (10 tests) unaffected — no backend files touched.
- Patient 360° header + overview (UI-004A), replacing `/app/patients/[id]`'s
  UI-003A placeholder with 6 real routes: `/app/patients/{id}` (Aperçu,
  the only tab with real content this task) plus `/health`, `/appointments`,
  `/treatments`, `/invoices`, `/payments` — each a thin page rendering the
  shared `features/patients/patient-detail-page.tsx` composition root with
  a fixed `activeTab`, chosen over a Next.js `layout.tsx`+children-slot
  approach so the composition root stays one directly-testable component
  (mirrors `AgendaPage`/`PatientsPage`) without Next.js App Router test
  friction; the header/tab lookup re-runs on every tab click, which is
  imperceptible since it is synchronous local mock data. Documented
  prototype limitation: UI-003B's create/edit changes live only in
  `/app/patients`'s own component state, so a patient created there is not
  yet visible here — this route always reads the centralized seed dataset
  (`mock-data.ts`); real cross-page consistency arrives with backend
  integration. New domain layer `components/domain/patients/`: `types.ts`
  (`PatientOverview`/`PatientActiveTreatment`/`PatientNextInstallment`/
  `PatientActivityItem`/`PatientTabKey` — kept separate from the
  administrative `Patient` type per CLAUDE.md §12, so future domain
  concepts don't get folded into it), `patient-header.tsx` (persistent
  identity/context header — pure presentation, every value pre-resolved by
  the caller, no mock-data coupling), `patient-activity-timeline.tsx`
  (the unified activity list — also takes only pre-resolved display
  strings, so the domain layer has no dependency on `features/*`
  formatting code either). New generic `components/ui/tabs.tsx`: real
  `<nav>`/`aria-current="page"` navigation (not the ARIA `tablist`
  pattern, which is for JS-only panel switching with no URL change, as
  Agenda's Day/Week toggle already uses) since these tabs are genuine
  URL-addressable routes; horizontally scrollable so six tabs stay usable
  on mobile. New `features/patients/` pieces: `mock-overview-data.ts`
  (treatment/installment/activity fixtures for a couple of representative
  patients, falling back to an explicit empty overview for the rest),
  `patient-detail-page.tsx` (the composition root: loading/error states,
  not-found derived from a real lookup miss rather than a simulated state,
  header/tabs/Aperçu wiring), `components/patient-overview-content.tsx`
  (the four summary cards — Prochain RDV, Traitement actif, Solde,
  Prochaine échéance — plus the timeline section), `patient-summary-card.tsx`
  (a restrained empty-state rendering, not `MetricCard`'s bold big-number
  treatment, for sentences like "Aucun traitement actif"),
  `patient-tab-placeholder.tsx` (keeps the header/tabs visible on the five
  future tabs; cites the owning future task where UI-004A's own scope
  sections name one — UI-005 for Dossier Santé, UI-006 for Traitements,
  UI-007 for Factures/Paiements — and a generic message for Rendez-vous,
  which wasn't given a number), `patient-detail-skeleton.tsx`. Small,
  justified extensions to existing UI-003A/B code: `PatientNextAppointment`
  gained an optional `service` field (display-only prototype enrichment,
  documented as not a real Agenda/Patients cross-module join, which
  doesn't exist yet); `mock-data.ts` gained a `birthDate` on two seed
  patients so the header's age display ("34 ans") is actually
  demonstrable — every other seed patient still has no birth date, so the
  "age unknown → don't show one" path is exercised too; `format.ts` gained
  `computeAge` (plain integer arithmetic on the ISO string parts, avoiding
  any `Date`-object timezone parsing entirely — no UTC/local mismatch
  possible, unlike the bug class fixed in UI-002's `addDaysIso`) and
  `formatDayMonth`/`formatDayMonthTime` (Patient 360°'s "27 août" date
  style, distinct from the list's numeric "27/08/2026"). Full FR/AR under
  an expanded `patientDetail.*` namespace (header actions, tabs, overview
  labels, activity-item translation keys — activity titles are always a
  dot-path key, never a raw stored string, so they translate correctly);
  RTL verified, including forcing `dir="ltr"` only around genuine
  formatted dates/money/reference values and never around a translated
  fallback sentence like "Aucun rendez-vous prévu" — the header/overview
  data shape carries an explicit `null` for "no appointment"/"no balance"
  rather than a single pre-resolved label string, specifically so the
  component (not the data) decides when to apply `dir="ltr"`, avoiding
  forcing Arabic prose into LTR reading direction for patients with no
  next appointment or no balance. Added
  `frontend/src/features/patients/patient-detail-page.test.tsx` (17
  tests: identity/reference/phone/practitioner, next-appointment and
  balance summaries in both header and overview, active-treatment with
  session progress, the no-treatment/no-balance empty states,
  next-installment, all six tabs with Aperçu active by default, a future
  tab keeping the header/tabs visible, the activity timeline with an
  explicit check that no clinical-sounding text leaks in, not-found for
  an unknown id, loading, error, French, Arabic/RTL, header actions
  including the Facturer/Encaisser/Plus future-feature toast, and
  LTR isolation of the patient number/phone). All 80 frontend tests
  (13 UI-001 + 20 UI-002 + 30 UI-003A/B + 17 UI-004A), typecheck, lint
  and build pass; backend regression (10 tests) unaffected — no backend
  files touched.
- Patient Rendez-vous tab (UI-004B), replacing `/app/patients/[id]/appointments`'s
  UI-004A placeholder with real content: upcoming appointments (grouped by
  date, chronological) and appointment history (grouped by date, newest
  first). No second appointment dataset — `features/patients/patient-appointments.ts`
  derives everything by filtering Agenda's own centralized mock fixtures
  (`getAgendaMockAppointments()`, UI-002) by `patientId`, since both feature
  areas already share the same `pat-N` ids. Classification is status-aware,
  not date-only: a terminal-outcome appointment (completed/cancelled/no-show/
  rescheduled) is always history, even with a future date, so a future
  cancellation never reads as a normal upcoming visit — the opposite (a
  stale non-terminal appointment before the fixed prototype business date)
  also falls back to history. Documented prototype limitation: Agenda owns
  the one mutable appointment array; this tab only reads the seed fixtures,
  so a mutation made in Agenda during a session is not reflected here and
  vice versa, until real API integration replaces both mock sources.
  Reused rather than duplicated UI-002's appointment architecture per this
  task's explicit instruction: extended `AppointmentCard` with an optional
  `showPatientName` prop (defaults `true`, so all five existing call sites
  are unaffected) so patient-context lists can suppress the redundant
  identity line and show the practitioner/service instead — `variant="prominent"`
  for upcoming (with per-card "Voir le rendez-vous"/"Ouvrir dans l'agenda"
  actions) and the denser `variant="row"` for history (directly clickable,
  matching Agenda's own day-view rows). Extended `AppointmentDrawer` rather
  than forking a second detail drawer: `onPrimaryAction`/`onEdit`/
  `onReschedule`/`onCancel`/`onNoShow` are now optional, and the
  corresponding controls simply don't render when omitted — Patient 360°
  passes none of them (read-focused detail per this task's explicit
  guidance, since enabling lifecycle mutation here would mean duplicating
  Agenda's state management), and adds a `patientLinkHref`/`patientLinkLabel`
  override so the drawer's bottom link points at Agenda instead of Patients
  (the patient page is already the current page). Agenda's own usage is
  unchanged (still passes every callback), so its 20 existing tests were
  unaffected. Lightweight status-group filtering (Tous/À venir/Terminés/
  Annulés/Absents, the last grouping both `cancelled_by_patient` and
  `cancelled_by_practice`) with a live result count, reusing the same
  segmented-toggle visual pattern as Agenda's Day/Week switch. "+ Nouveau
  RDV" and the per-card "Ouvrir dans l'agenda" action both navigate to
  `/app/agenda` as a plain link — no query-param prefill wiring was added
  to Agenda's `AppointmentFormDialog`, since this task marked that
  optional and explicitly capped scope ("do not significantly expand
  scope"); there remains exactly one appointment-creation UX
  (`AppointmentFormDialog`, UI-002). Loading (shape-matched skeleton: new
  RDV button, filter row, two card placeholders — no spinner), error
  (component-level test seam, mirroring every other feature page), fully
  empty (`EmptyState` + "Planifiez son premier rendez-vous"), empty
  upcoming (restrained inline text + a "Planifier un rendez-vous" link)
  and empty history (a single restrained sentence, no action) states all
  implemented; patient not-found is unaffected, since `PatientDetailPage`
  resolves that before any tab renders. Full FR/AR under a new
  `patientDetail.appointments.*` namespace; status/arrival-window labels
  are reused from the existing `appointment.*` namespace rather than
  duplicated. RTL verified, with dates isolated `dir="ltr"` the same way
  UI-004A already established. Added
  `frontend/src/features/patients/components/patient-appointments-content.test.tsx`
  (22 tests: upcoming/history ordering, exact vs arrival-window
  presentation, the status registry, the future-cancelled classification
  rule, all five filters including the cancelled-status grouping, the
  live result count, opening the shared drawer and its Agenda link, the
  three empty states, loading, error, French, Arabic/RTL, and that the
  patient name never leaks into a card) plus two integration assertions
  in `patient-detail-page.test.tsx` (header/tabs preserved with Rendez-vous
  active, and not-found still wins for an invalid patient id on this tab).
  All 104 frontend tests (13 UI-001 + 20 UI-002 + 30 UI-003A/B + 19
  UI-004A + 22 UI-004B on the dedicated appointments-content suite, with
  the remaining 2 new assertions folded into UI-004A's file), typecheck,
  lint and build pass; backend regression (10 tests) unaffected — no
  backend files touched.
- Patient Traitements/Séances tab (UI-004C), replacing
  `/app/patients/[id]/treatments`'s UI-004A placeholder with a treatment-
  plan and session-management prototype, aimed at kiné-style multi-session
  care plans. New domain layer `components/domain/treatments/`: `types.ts`
  (`TreatmentPlan`/`TreatmentSession`, deliberately simplified from Spec #4
  §14's backend ENUMs per this task's own explicit status lists — e.g.
  `no_show`/`unscheduled` instead of the backend's `missed`/`planned`),
  `treatment-status.ts`/`session-status.ts` (two separate small registries,
  not a reuse of `APPOINTMENT_STATUS_MAP` — a session's lifecycle has
  different semantics from an appointment's), `session-progress.tsx` (the
  `SessionProgress` component named in Spec #8 §97 — completed/scheduled/
  remaining always spelled out as text, never color-only, with a real
  `role="progressbar"`), `session-tracker.tsx` (the compact accessible
  session grid from Spec #9 Screen 22 — each cell a labeled button, e.g.
  "Séance 13 — Planifiée", opening that session's detail; chosen over
  duplicating a full 20-row list underneath it, since clicking a cell
  already surfaces the same date/status/action detail Screen 23's session
  list would show), `treatment-plan-card.tsx` (`TreatmentPlanCard` — an
  "active" rich variant with an `actions` slot and a "completed" dense
  clickable row, mirroring `AppointmentCard`'s own `variant`/`actions`/
  `onSelect` API exactly for consistency). New `features/patients/`
  pieces: `mock-treatments-data.ts` (centralized synthetic treatment-plan
  fixtures — pat-1/Ahmed gets the active 20-session "Rééducation genou"
  plan from Screen 22's own wireframe numbers, 12 completed/1 scheduled
  Aug 26 15:00/7 unscheduled; pat-3/Fatima gets a fully completed 10-
  session plan; pat-2/Sara deliberately has none at all — covering the
  active, no-active-but-history, and fully-empty states from one seed
  set), `treatments.ts` (pure derivation: filter-by-patientId, the active/
  completed split, session-status counts, "prochaine séance" lookup, and
  `getActiveTreatmentSummary`), `components/patient-treatments-content.tsx`
  (the tab composition), `components/treatment-detail-drawer.tsx` (reuses
  the shared `Dialog` drawer unmodified — one Dialog instance with two
  internal views, treatment and a selected session, rather than a second
  nested drawer; a `key` prop the parent increments on every open resets
  the internal session-selection state, mirroring UI-002's
  `formDialogKey` pattern, instead of a reset effect that
  `react-hooks/set-state-in-effect` correctly flagged during lint).
  **Overview consistency (§33):** `mock-overview-data.ts`'s
  `getPatientOverview` no longer hand-types an `activeTreatment` number —
  it now derives it from these same treatment fixtures via
  `getActiveTreatmentSummary`, so the Aperçu card and the Treatments tab
  can never disagree; verified by keeping every existing UI-004A overview
  assertion green plus a new explicit consistency test. "+ Nouveau
  traitement" shows a future-feature toast rather than a creation form
  (§13, out of scope); "Voir la facturation" is a real link to the still-
  placeholder `/invoices` tab with no finance figures anywhere in the
  drawer (§32); completed-session detail shows a disabled future "Voir la
  consultation" link and no clinical content; scheduled/unscheduled
  session detail and "Planifier prochaine séance" all navigate to
  `/app/agenda` as plain links — no second appointment-creation UX.
  Documented prototype limitation (§34): treatment/session data is local
  seed fixtures, same reasoning as UI-004B's Agenda-sync limitation. Full
  FR/AR under a new `patientDetail.treatments.*` namespace, reusing
  `patientDetail.overview.sessionsProgress` and
  `patientDetail.appointments.openInAgenda` rather than duplicating them.
  RTL verified, dates/session numbers isolated `dir="ltr"` per the
  established pattern. Added
  `frontend/src/features/patients/components/patient-treatments-content.test.tsx`
  (17 tests: active treatment/practitioner/date, session counts, the
  accessible progress bar, next session, the dense completed-treatment
  section, the no-active-but-history and fully-empty states, opening/
  closing the drawer with the session tracker, completed/scheduled/
  unscheduled session detail — including an explicit no-clinical-content
  check — the billing link with no finance figures, loading, error,
  French, Arabic/RTL, and the new-treatment future notice) plus 3
  integration assertions in `patient-detail-page.test.tsx` (header/tabs
  preserved with Traitements/Séances active, the overview/tab session-
  count consistency check, and not-found still wins for an invalid
  patient id on this tab). All 124 frontend tests (13 UI-001 + 20 UI-002 +
  30 UI-003A/B + 22 in the shared `patient-detail-page.test.tsx` file —
  17 original UI-004A + 2 UI-004B + 3 UI-004C integration assertions —
  + 22 UI-004B on the dedicated appointments-content suite + 17 UI-004C
  on the dedicated treatments-content suite), typecheck, lint and build
  pass; backend regression (10 tests) unaffected — no backend files
  touched.
- Patient Factures/Installments tab (UI-004D), replacing
  `/app/patients/[id]/invoices`'s UI-004A placeholder with an invoice and
  staged-payment workspace. **Money representation (§8-9):** whole MAD
  units (never fractional/floating-point), deliberately matching
  `Patient.outstandingBalance`/`formatMad`'s pre-existing convention
  rather than introducing a separate minor-units (×100) model — this
  task's own instructions explicitly allow "another safe deterministic
  money representation consistent with existing frontend architecture,"
  and every amount in every wireframe across this whole product is a
  whole MAD number, so ordinary integer arithmetic is already float-free.
  Reuses `formatMad` as the one shared formatter rather than adding a
  second one. New domain layer `components/domain/finance/`: `types.ts`
  (`Invoice`/`InvoiceLine`/`Installment`, Spec #4 §15-16's backend model
  simplified to this task's own status lists), `invoice-status.ts` and
  `installment-status.ts` (two separate small registries — an
  installment can legitimately be "overdue" inside a still-
  "partially_paid" invoice), `invoice-card.tsx` (`InvoiceCard`) and
  `installment-row.tsx` (`InstallmentRow`, icon + text + tone, never
  color alone). New `features/patients/` pieces: `mock-invoices-data.ts`
  (centralized synthetic fixtures — pat-1/Ahmed carries three invoices:
  the partial one with the full six-installment schedule using Spec #9
  Screen 29's own numbers exactly, a second fully paid one, and a
  cancelled one, whose non-cancelled totals aggregate to precisely this
  task's own §17 wireframe summary, 4 500/3 000/1 500 MAD; pat-4/Youssef
  is fully paid; pat-9/Mehdi has one overdue invoice/installment;
  pat-2/Sara has none at all), `finance.ts` (filter-by-patientId, the
  four-group filter, `getFinancialSummary` — deliberately excluding
  cancelled invoices from the aggregate, since a voided invoice was never
  really "facturé" — `findNextInstallment`, and
  `getPatientFinancialSummary`), `components/patient-invoices-content.tsx`
  (the tab composition — neutral typography-led `MetricCard`s for the
  summary, per §19's explicit "no giant green/red cards" instruction),
  `components/invoice-detail-drawer.tsx` (reuses the shared `Dialog`
  drawer unmodified; looks its linked treatment plan up by
  `treatmentPlanId` from UI-004C's own fixtures rather than duplicating
  a title, CLAUDE.md §12). **Overview/header consistency (§15-16):**
  `getPatientFinancialSummary` returns `null` for any patient with no
  invoice fixtures here, so `PatientDetailPage`'s header balance and
  `mock-overview-data.ts`'s next-installment fall back to the existing
  per-patient values unchanged for the other 12 seed patients — only the
  4 patients this task actually gave invoices to have their balance
  derived, avoiding the wide refactor the task explicitly warned against;
  verified by keeping every existing UI-004A overview/header assertion
  green plus two new explicit consistency tests. A genuine fixture-design
  finding surfaced by a failing integrity test: a cancelled invoice's
  `remainingAmount` is legitimately 0 regardless of its `totalAmount` (a
  voided invoice owes nothing) — documented in both the fixture and the
  dedicated integrity-test file as the one deliberate exception to the
  `paidAmount + remainingAmount === totalAmount` invariant. "+ Nouvelle
  facture" and "Télécharger PDF"/"Imprimer" all show a future-feature
  Toast; "Encaisser" only navigates to `/app/patients/{id}/payments`
  and never renders for a paid or cancelled invoice; cancelled invoices stay
  visible under the "Toutes" filter. Full FR/AR under a new
  `patientDetail.invoices.*` namespace, reusing
  `patientDetail.header.collectPayment` and
  `patientDetail.treatments.viewTreatment` rather than duplicating them.
  RTL verified, invoice numbers/dates/amounts isolated `dir="ltr"` per
  the established pattern. Added
  `frontend/src/features/patients/mock-invoices-data.test.ts` (11 fixture-
  integrity tests — installment-sum/paid-sum/total invariants, the
  cancelled-invoice exception, and the exact 4 500/3 000/1 500 aggregate)
  and
  `frontend/src/features/patients/components/patient-invoices-content.test.tsx`
  (24 tests: the financial summary, newest-first ordering, partial/paid/
  overdue/cancelled presentation, all four filters, opening the drawer
  with lines/totals/the installment schedule and its paid/due/future/
  overdue statuses, the down-payment caption, no-Encaisser-on-a-paid-
  invoice, Encaisser navigating rather than collecting, the PDF/print
  future notice, the treatment link, both empty states, loading, error,
  French, Arabic/RTL, and the new-invoice future notice) plus 4
  integration assertions in `patient-detail-page.test.tsx` (header/tabs
  preserved with Factures active, the header-balance consistency check,
  the overview-next-installment consistency check, and not-found still
  wins for an invalid patient id on this tab). All 163 frontend tests
  (13 UI-001 + 20 UI-002 + 30 UI-003A/B + 26 in the shared
  `patient-detail-page.test.tsx` file + 22 UI-004B on the dedicated
  appointments-content suite + 17 UI-004C on the dedicated treatments-
  content suite + 24 UI-004D on the dedicated invoices-content suite +
  11 UI-004D fixture-integrity tests), typecheck, lint and build pass;
  backend regression (10 tests) unaffected — no backend files touched.
- Patient Paiements/Reçus tab (UI-004E), replacing
  `/app/patients/[id]/payments`'s UI-004A placeholder with a payment
  history, summary and cash-collection prototype. Framed explicitly as
  patient payment UX, not cabinet-wide Caisse accounting (UI-006's scope).
  **Financial Source-of-Truth Rule (§7):** every posted payment's
  allocations reconcile exactly with UI-004D's own invoice `paidAmount`
  and paid-installment fixtures — verified by dedicated integrity tests,
  not merely rendered text. `mock-payments-data.ts` carries one
  deliberately reversed payment (Mehdi/pat-9, §14): it never reduced
  `inv-3`'s balance, which is *why* that invoice still shows the full
  2 200 MAD overdue in UI-004D's own fixtures rather than an oversight —
  reversed payments are excluded from every collected-total/count figure
  (`getEffectivePaidAmount`/`getPaymentSummary`) but remain visible in the
  history list itself (CLAUDE.md §24: a posted payment is financially
  historical, never silently edited). New domain types on the existing
  `components/domain/finance/types.ts` (no second finance model):
  `Payment`/`PaymentAllocation`/`Receipt`, `PaymentStatus` kept to
  exactly `posted`/`reversed` per this task's own §10, `PaymentMethod`
  kept to `cash` only (CLAUDE.md §23 — V1 patient payments are cash-only,
  no card/online method anywhere in the UI). `payment-status.ts` (its own
  small tone/label registry) and `payment-row.tsx` (`PaymentRow`, a dense
  clickable history row mirroring `TreatmentPlanCard`'s "completed"
  variant, not a full `Card`, per this task's own "keep it operational
  and restrained" instruction). New `features/patients/` pieces:
  `mock-payments-data.ts` (6 fixtures — 3 payments reconciling exactly
  with pat-1/Ahmed's 1 500 MAD partial-invoice history down to each
  individual 500 MAD installment, 1 payment reconciling pat-1's second
  fully paid invoice, 1 payment reconciling pat-4/Youssef's fully paid
  invoice, and pat-9/Mehdi's one reversed payment; pat-2/Sara
  deliberately has none), `payments.ts` (`getPaymentSummary`,
  `computeEffectiveRemaining`/`getAllocatableInvoices`/
  `getPayableInstallments` — pure functions computing an effective
  allocatable balance for the capture dialog *without* ever mutating an
  invoice fixture, reference-number generators explicitly documented as
  illustrative-only, not concurrency-safe production numbering, §32),
  `payment-form-validation.ts` (whole positive-integer amount check, no
  floating-point parsing), `components/patient-payments-content.tsx` (the
  tab composition: neutral summary `MetricCard`s, no filter — history
  stays short enough to scan without one, a deliberate scope-reduction
  per this task's own §41 "not mandatory... do not create unnecessary
  complexity"), `components/patient-payment-capture-dialog.tsx` (the
  Encaisser prototype, reusing the shared `Dialog` drawer unmodified —
  "do not create another modal system," §23: selecting an invoice with an
  installment schedule locks the payment amount to that installment's
  exact value, the simpler bounded UX this task's own §29 explicitly
  allows instead of inventing a partial-installment lifecycle; only an
  invoice with no installment schedule of its own accepts a free amount,
  validated against zero/negative/non-numeric input and against
  overpayment; includes the required informational Caisse-boundary note,
  §46, without simulating any Caisse concept), `components/payment-
  detail-drawer.tsx` (read-only — no edit/delete action anywhere, §37;
  "Voir la facture" only navigates to the Factures tab, no duplicated
  invoice drawer, §40; "Télécharger le reçu"/"Imprimer" show a
  future-feature Toast, never generating a document, §38). **Local-
  session state, not a global store (§33-34):** a captured payment is
  appended only to `PatientPaymentsContent`'s own component state — the
  UI-004D invoice fixtures are never mutated, so the Factures tab and
  Aperçu overview remain unaffected and correct; navigating away from
  Paiements and back resets to the seed state, the same accepted
  prototype limitation already documented for UI-004A §7/UI-004B §9,
  applied here to a same-route local mutation instead of a cross-route
  read. On a successful capture the payment/receipt reference is
  generated, the capture dialog closes, and the new payment's own detail
  drawer opens immediately as the success/receipt surface (Spec #9 Screen
  28's content — amount, date, allocation, receipt actions — reached this
  way instead of inventing a third dialog type). Full FR/AR under a new
  `patientDetail.payments.*` namespace, reusing
  `patientDetail.invoices.installmentLabel`/`viewInvoice`/`print` and
  `patients.form.cancel`/`close` rather than duplicating them. RTL
  verified (SSR `dir="rtl"`/`lang="ar"` on the route), payment/receipt
  references and amounts isolated `dir="ltr"`. Added
  `frontend/src/features/patients/payments.test.ts` (20 pure-function
  tests for every derivation/validation helper — chosen over only
  DOM-testing generated numbers indirectly, since §57 explicitly asks for
  tests proving the calculation, not merely rendered text),
  `frontend/src/features/patients/mock-payments-data.test.ts` (12
  fixture-integrity tests: allocation-sums-to-payment-amount, reference/
  receipt uniqueness, allocation validity, the core payment-to-invoice
  reconciliation, paid-installment evidence, the reversed-payment
  exclusion, and a cross-file check against UI-004D's own
  `getFinancialSummary`) and
  `frontend/src/features/patients/components/patient-payments-content.test.tsx`
  (28 tests: summary/history/method rendering, payment detail with
  receipt/allocation/patient/invoice-link, the future-feature receipt
  notice, no edit/delete anywhere, Encaisser opening the capture form,
  the derived outstanding balance, payable-invoice-only allocation, the
  default next-unpaid-installment with a locked amount, the no-
  allocatable-invoice state, zero/negative/non-numeric/overpayment
  rejection, a valid free-amount capture, a full successful capture with
  the receipt opening and history/summary/balance updating locally, the
  reversed-payment presentation, empty/loading/error states, French,
  Arabic/RTL, and the absence of any Caisse UI or online payment method)
  plus 2 integration assertions in `patient-detail-page.test.tsx`
  (header/tabs preserved with Paiements active and real content, and
  not-found still wins for an invalid patient id on this tab). All 225
  frontend tests (163 carried over from UI-001 through UI-004D + 20
  UI-004E `payments.ts` unit tests + 12 UI-004E fixture-integrity tests +
  28 UI-004E payments-content tests + 2 UI-004E integration assertions),
  typecheck, lint and build pass; backend regression (10 tests)
  unaffected — no backend files touched.
- Dossier Santé: important medical information (UI-005A), replacing
  `/app/patients/[id]/health`'s UI-004A placeholder with the first real
  clinical prototype — the patient's persistent allergies/medical
  history/current medications/important notes only. Explicitly not
  consultation history, active consultation, prescriptions or clinical
  documents (UI-005B/C/D's scope). **Administrative/clinical separation
  (§8):** a new `MedicalProfile`/`MedicalProfileEntry` model in
  `components/domain/clinical/types.ts`, deliberately never added onto
  the existing administrative `Patient` interface (CLAUDE.md §8/§12) —
  verified by a dedicated diff grep, not just by convention. **Master-
  data architecture (§11-14):** `features/clinical/master-data.ts`
  provides a small synthetic bounded FR/AR catalog (6 allergies, 6
  history items, 5 medications) with case- and accent-insensitive search
  (NFD Unicode normalization, no fuzzy/AI matching) — practitioners
  search and select rather than typing every term from scratch, with a
  controlled custom-entry escape hatch that never writes back into the
  shared catalog. **Reusing `Combobox` for multi-select (§27):** rather
  than building a second autocomplete system, each of the edit drawer's
  three category pickers is a `Combobox` whose own committed `value` is
  always kept `null` — a selection is immediately appended to a local
  chip list and the field clears for the next search. The only change to
  the shared primitive itself is that `onCreate` now receives the
  current query text (small and backward-compatible: the sole existing
  caller, Agenda's quick-create-patient action, already ignores extra
  arguments). Already-selected items are filtered out of the next
  search's suggestions, which is what prevents a duplicate predefined
  selection (§50) without extra bookkeeping; typing an exact match of an
  existing master-data label resolves to that predefined item instead of
  creating a shadow custom duplicate. New domain layer
  `components/domain/clinical/`: `types.ts`, `clinical-summary-
  section.tsx` (`ClinicalSummarySection` — one restrained card per
  category, an inline empty sentence rather than a per-category
  `EmptyState`, and a small "Important" `StatusBadge` on one allergy
  entry at a time, never coloring the whole card, §18-19) and
  `entry-chip.tsx` (`EntryChip`, the removable selected-value pill).
  Added `components/ui/textarea.tsx` (mirrors `Input`'s label/error
  pattern — the design system's own component vocabulary already names
  `Textarea`, and Dossier Santé's important-notes field is its first
  real use). New `features/patients/` pieces: `mock-medical-profiles-
  data.ts` (pat-1/Ahmed fully populated including one "important"
  Pénicilline allergy; pat-3/Fatima partially populated — some history,
  no allergies/medications; pat-2/Sara has no fixture at all — the same
  "empty by omission" convention as UI-004D/E), `medical-profile.ts`
  (`getMedicalProfileForPatient`, `isMedicalProfileEmpty` — `null` and
  "every section empty" treated identically), `components/patient-
  health-content.tsx` (the tab composition) and `components/medical-
  profile-edit-drawer.tsx` (reuses the shared `Dialog` drawer
  unmodified). **Local-session state (§7/UI-004E's same convention):** a
  saved edit is kept only in `PatientHealthContent`'s own component
  state — no LocalStorage/IndexedDB/cookie anywhere holds this clinical
  data, and the centralized fixtures are never mutated. Also added
  `formatDayMonthYear` to `features/patients/format.ts` ("23 août 2026"
  — the one existing date formatter, `formatDayMonth`, deliberately omits
  the year). Since Dossier Santé was the last remaining placeholder tab,
  the now-permanently-unreachable "future-placeholder" integration test
  for it was replaced with a real-content assertion, matching every
  other tab's own precedent; `PatientTabPlaceholder`'s fallback branch
  and its `FUTURE_TASK_BY_TAB` map are left in place (now empty) as
  harmless, precedent-consistent scaffolding for any future tab, not
  deleted. Full FR/AR under a new `patientDetail.health.*` namespace, all
  Arabic clinical terminology reviewed for register (e.g. "الحساسيات" for
  allergies, not a literal transliteration). RTL verified (SSR
  `dir="rtl"`/`lang="ar"` on the route). Added
  `frontend/src/features/clinical/master-data.test.ts` (18 tests:
  predefined search per category, case/accent-insensitivity, an
  abbreviation search term, category scoping, catalog stability across
  calls, and locale-resolved labels),
  `frontend/src/features/patients/medical-profile.test.ts` (6 tests),
  `frontend/src/features/patients/mock-medical-profiles-data.test.ts` (7
  fixture-integrity tests — Patient A/B/C shape, no duplicate labels
  within a category, and every `masterDataId` resolving to a real
  catalog item of the matching category) and
  `frontend/src/features/patients/components/patient-health-content.test.tsx`
  (25 tests: all four summary sections, the important-allergy badge, an
  individual empty section, the fully-empty state, opening the edit
  drawer with entries prefilled as removable chips, searching each
  category, adding a predefined entry, adding a custom entry, removing
  an entry, duplicate-selection prevention, save updating the local
  profile with a success toast, cancel discarding a draft, the absence
  of any finance/consultation-history/prescription/document content,
  loading, error, French, and Arabic/RTL) plus 2 integration assertions
  in `patient-detail-page.test.tsx` (header/tabs preserved with Dossier
  Santé active and real content, and not-found still wins for an invalid
  patient id on this tab). All 277 frontend tests (225 carried over from
  UI-001 through UI-004E + 18 UI-005A master-data tests + 6 UI-005A
  medical-profile tests + 7 UI-005A fixture-integrity tests + 25 UI-005A
  health-content tests + 2 UI-005A integration assertions), typecheck,
  lint and build pass; backend regression (10 tests) unaffected — no
  backend files touched.
- UI-005B — Dossier Santé: clinical history & consultation timeline
  (`/app/patients/[id]/health`, below UI-005A's important-information
  cards, same tab and route — no new top-level nav item). New
  `ClinicalEncounter` on `components/domain/clinical/types.ts` (Spec #4
  §9.1 `clinical_encounters` simplified to `consultation`/`session`; all
  historical encounters are `completed`, no larger status registry, §16).
  **A purpose-built `ClinicalTimeline` rather than reusing UI-004A's
  `PatientActivityTimeline`:** that component only renders one-line
  translated activity strings and explicitly excludes clinical note/
  diagnosis text, so it cannot represent structured motif/session detail
  or the "Voir la consultation"/"Voir le traitement" interactions this
  tab needs — the two timelines now deliberately coexist, Aperçu keeping
  its concise cross-domain feed and Dossier Santé getting its own richer,
  clinical-only chronology (documented in `frontend/ARCHITECTURE.md`).
  New `features/patients/clinical-history.ts`
  (`getEncountersForPatient`/`sortEncountersDesc`/
  `matchesClinicalHistoryFilter`/`groupEncountersByDate`, mirroring
  `patient-appointments.ts`'s own shape — newest-first sorting and date
  grouping are explicit derivations, never fixture insertion order).
  Lightweight Tous/Consultations/Séances filter (§17 — deliberately no
  practitioner/date-range/diagnosis filtering) with a distinct
  filtered-empty message, never the global empty-history state. New
  `features/patients/components/consultation-detail-drawer.tsx`
  (`ConsultationDetailDrawer`) — read-only: no Modifier/Supprimer/
  Réouvrir anywhere, since a completed clinical record is not ordinary
  CRUD (CLAUDE.md §24); structured Motif/Observations/Évaluation/Plan
  sections (Spec #7 §11's own "Motif"/"Observations" wording, extended
  with Évaluation/Plan per this task's own explicit instruction — Spec
  #1 Table 16 already names "diagnosis/assessment" for general medicine,
  so this is a documented current-task-instruction/specification
  reconciliation, not an invented category), plus an optional "Rendez-
  vous associé" section with a safe link to the Rendez-vous tab. A
  session encounter never opens a second detail drawer — its timeline
  card links directly to `/app/patients/{id}/treatments` ("Voir le
  traitement", reusing the existing i18n key), reusing UI-004C's own
  session-detail interaction instead of duplicating a second treatment-
  session workspace (§25-26). New
  `features/patients/mock-clinical-encounters-data.ts`: pat-1/Ahmed has
  two completed consultations (23/18 August) plus one completed session
  that intentionally reuses the exact date/practitioner/appointment
  reference of the "Rééducation genou" plan's 6th completed session
  (`mock-treatments-data.ts`) rather than inventing a contradicting
  duplicate; pat-3/Fatima has a populated `MedicalProfile` (UI-005A) but
  no clinical-history fixture at all, demonstrating "profile without
  history"; pat-2/Sara has neither, demonstrating the fully empty
  Dossier Santé (§31 — the two independent empty states are allowed to
  coexist rather than being collapsed into one giant generic screen).
  `PatientHealthContent`'s own "MedicalProfile empty" branch was
  restructured from an early return into an inline conditional so the
  clinical-history section always renders below it in both the empty and
  populated cases; its loading skeleton was extended with a clinical-
  history heading and two row placeholders, and loading/error remain one
  unified state for the whole tab (§33 — no real network boundary exists
  between the two fixture reads in this frontend-only prototype). One
  UI-005A-era boundary test in `patient-health-content.test.tsx` was
  updated, not weakened: it used to assert this tab never rendered
  "Historique clinique"/"Motif" text at all, which UI-005B's own explicit
  scope now legitimately supersedes — the assertion was narrowed to what
  is still genuinely out of scope (no consultation-creation affordance,
  §37), and the now-real content is covered by dedicated new tests
  instead. Full FR/AR under a new `patientDetail.health.history.*`
  namespace, reusing `patientDetail.treatments.viewTreatment`/
  `sessionHeading` where the phrase is already identical rather than
  duplicating it; new Arabic clinical terminology reviewed for register
  (e.g. "السجل السريري" for "Historique clinique", distinct from the
  existing "التاريخ المرضي" used for medical history/antécédents, to
  avoid conflating the two concepts). RTL verified (SSR `dir="rtl"`/
  `lang="ar"` on the route). Added
  `frontend/src/features/patients/clinical-history.test.ts` (9 tests:
  patient filtering, newest-first sorting including a same-date time
  tie-break, non-mutation of the input array, the three-way filter, and
  date grouping), `frontend/src/features/patients/mock-clinical-
  encounters-data.test.ts` (9 fixture-integrity tests: every encounter
  references a real patient/practitioner, unique ids, consultation-only
  vs session-only fields never cross-populate, and the session
  encounter's treatment/appointment references resolve exactly against
  `mock-treatments-data.ts` rather than merely existing) and
  `frontend/src/features/patients/components/clinical-history-
  section.test.tsx` (25 tests: heading/consultation/session rendering,
  newest-first ordering and date grouping from an out-of-order prop,
  each filter and the filtered-empty state, the result count, opening/
  closing the read-only drawer, each of the four structured sections,
  patient/practitioner/date context, the associated-appointment link
  appearing only when present, the treatment link, the absence of
  edit/delete/reopen/prescription/document/finance content and of any
  consultation-creation affordance, the empty-history state, French, and
  Arabic/RTL). All 320 frontend tests (277 carried over from UI-001
  through UI-005A + 43 new UI-005B tests), typecheck, lint and build
  pass on the first run; backend regression (10 tests) unaffected — no
  backend files touched.
- UI-005C — Active Consultation Workspace, independently addressable at
  `/app/patients/{id}/consultations/{consultationId}` rather than a
  Patient 360° tab (§6) — it deliberately does not reuse the full
  `PatientHeader`/`Tabs` shell, since that shell shows the patient's
  financial balance and this workspace must show none (CLAUDE.md §40).
  New `ActiveConsultation`/`ConsultationStatus` on
  `components/domain/clinical/types.ts` (Spec #4 §9.1's `status` column
  narrowed further still to just `draft`/`completed` — not the domain
  spec's full draft/active/completed/amended set, §7), deliberately
  shaped so a completed consultation is a near-direct match for UI-005B's
  `ClinicalEncounter`. New `features/patients/active-consultation.ts`:
  `isConsultationCompletionValid` (a non-empty reason, required before
  completion but never before a draft save), `isConsultationDirty`
  (compares only the four editable fields, never `status`/`completedAt`)
  and `toClinicalEncounter` — a pure transformation proving a completed
  consultation is representable as history without a second, incompatible
  clinical model (§9), covered by dedicated tests rather than only
  rendered-text assertions (§50). **Deliberate terminology
  reconciliation, same reasoning as UI-005B:** the task's own wireframe
  and translation checklist require Motif/Observations/Évaluation/Plan;
  reused UI-005B's exact same four labels rather than inventing new ones.
  **Two new shared `components/domain/clinical/` pieces**, extracted so
  UI-005C's completed-consultation view does not duplicate UI-005B's own
  read-only presentation (§30): `consultation-structured-detail.tsx`
  (`ConsultationStructuredDetail`, the four labeled Motif/Observations/
  Évaluation/Plan blocks) and `related-appointment-note.tsx`
  (`RelatedAppointmentNote`, the "Rendez-vous associé" block) —
  `features/patients/components/consultation-detail-drawer.tsx`
  (UI-005B) was refactored to consume both instead of its own inline
  copies; all of UI-005B's existing tests pass unchanged, confirming the
  refactor is behavior-preserving. New `consultation-status.ts` (draft →
  `neutral` tone, same restrained choice as `invoice-status.ts`'s own
  `draft`; completed → `success`, matching every other domain's own
  "completed" tone). New centralized
  `features/patients/mock-active-consultations-data.ts`: cons-1/pat-1
  (Ahmed) is an in-progress draft dated on the fixed prototype "today"
  (an active consultation is inherently a today event; the task's own
  wireframe illustrative date was not treated as a strict requirement),
  continuing the same "Rééducation genou" narrative thread as UI-005B's
  own historical fixtures for this patient at a distinct time so the two
  do not read as contradicting duplicates; cons-2/pat-4 (Youssef) is
  already `completed`, kept on a different patient to avoid narrative
  overlap and dedicated to exercising the read-only completed state. New
  `features/patients/consultation-workspace-page.tsx`: important medical
  context (allergies/history/medications) reuses UI-005A's
  `ClinicalSummarySection` completely unmodified and strictly read-only —
  no MedicalProfile edit affordance is duplicated here (§13/§42), the
  existing Dossier Santé editor remains the sole source for profile
  edits. Desktop uses a two-column layout (main form | narrow context
  column), matching Spec #9 Screen 20's own note ("Desktop may use narrow
  right context column for patient flags. Mobile stacks it") — the
  context column moves above the form on mobile via source order, not
  just CSS, so screen-reader/keyboard users encounter allergies before
  the form exactly like sighted mobile users. **Draft behavior (§21-23):**
  "Enregistrer le brouillon" requires nothing and never blocks; a
  restrained "Modifications non enregistrées" indicator (warning tone,
  never alarming) appears whenever the live form differs from the last
  saved snapshot. **Completion (§25-29):** "Terminer la consultation"
  first validates the reason (showing a field error, never silently
  failing) then opens `consultation-complete-dialog.tsx`
  (`ConsultationCompleteDialog`, a thin `ConfirmDialog` wrapper mirroring
  `CancelConfirmDialog`/`NoShowConfirmDialog`'s own pattern, `tone=
  "primary"` since completing is the intended outcome, not destructive);
  confirming uses the live in-progress form values directly — a
  completion is not required to have been draft-saved first — and stamps
  a fixed prototype `completedAt` (the consultation's own date, never
  `Date.now()`). Once completed, the editable form is replaced by the
  same `ConsultationStructuredDetail` read-only view UI-005B's drawer
  uses, the draft/complete actions disappear entirely, and no Modifier/
  Supprimer/Réouvrir affordance exists anywhere (CLAUDE.md §24 — a
  completed clinical record is not ordinary CRUD). **Unsaved-changes
  navigation boundary, documented rather than engineered further (§24):**
  the back link to Dossier Santé is a plain, unguarded `Link` — no
  `beforeunload`/route-interceptor was added (no precedent for
  programmatic `useRouter` navigation exists anywhere else in this
  codebase, and the task explicitly asks not to build "a complex global
  route blocker"); the persistent dirty-state indicator is the chosen
  bounded "do not silently discard changes" mechanism, visible before the
  practitioner clicks away. **Cross-route boundaries, explicitly not
  faked (§31/§33):** completing a consultation never writes into
  UI-005B's `mock-clinical-encounters-data.ts`, never navigates to
  `/health`, and never touches Agenda's appointment status — introducing
  a global store purely to fake any of that was out of scope; the
  `toClinicalEncounter` transformation and its tests are the proof that a
  real backend integration could do this correctly. Patient-not-found
  (reusing the exact `patientDetail.notFoundTitle`/`backToPatients` keys
  and pattern from `patient-detail-page.tsx`) takes precedence over
  consultation-not-found, including when a `consultationId` resolves but
  belongs to a different patient. Full FR/AR under a new
  `patientDetail.consultation.*` namespace, reusing UI-005B's
  `patientDetail.health.history.*` labels/keys everywhere the phrase is
  identical (Motif/Observations/Évaluation/Plan/Rendez-vous associé/Voir
  le rendez-vous) rather than duplicating them; new Arabic terminology
  reviewed for register and consistency with UI-005A/B (e.g. "مسودة" for
  Brouillon, "السجل السريري" from UI-005B left untouched — no competing
  translation introduced). RTL verified (SSR `dir="rtl"`/`lang="ar"` on
  the route). Added `frontend/src/features/patients/active-
  consultation.test.ts` (12 tests: lookup, completion validity including
  a whitespace-only reason, dirty-state comparison including the
  unset-vs-empty-string equivalence and the status/completedAt exclusion,
  and the `toClinicalEncounter` transformation field-by-field plus its
  appointmentId-absent case), `frontend/src/features/patients/mock-
  active-consultations-data.test.ts` (8 fixture-integrity tests: every
  consultation references a real patient/practitioner, unique ids, at
  least one draft and one completed fixture exist, and every completed
  fixture transforms into a structurally valid ClinicalEncounter) and
  `frontend/src/features/patients/consultation-workspace-page.test.tsx`
  (24 tests: patient/consultation context, the read-only important-
  context panel including the important-allergy badge, the draft status
  badge, all four form fields, draft save with success feedback and
  continued editability, the dirty-state indicator appearing/
  disappearing, completion blocked without a reason, the confirmation
  dialog opening/cancelling/confirming — the last of these also proving
  completion uses live unsaved values — the completed read-only state
  with draft/complete actions and edit/delete/reopen all absent, the
  associated-appointment note appearing only when present, absence of
  prescription/document/finance content, consultation-not-found for a
  missing id and for a consultation belonging to a different patient,
  patient-not-found precedence, loading, error, French, and Arabic/RTL).
  All 364 frontend tests (320 carried over from UI-001 through UI-005B +
  44 new UI-005C tests) pass on the full-suite run; typecheck, lint and
  build all pass cleanly. One instance of the previously-documented
  vitest-pool worker-startup flakiness occurred while running the new
  workspace-page test file standalone during development, resolved by a
  clean retry before the full suite was run. Backend regression (10
  tests) unaffected — no backend files touched.
- UI-005D — Dossier Santé: Clinical Documents & Prescriptions, the last
  screen in the Patient 360° clinical prototype sequence. Both sections
  sit inside Dossier Santé, below Historique clinique — deliberately
  **not** a seventh Patient 360° tab (§6), preserving the existing six
  (Aperçu/Dossier Santé/Rendez-vous/Traitements/Factures/Paiements).
  New `ClinicalDocument`/`ClinicalDocumentCategory` and `Prescription`/
  `PrescriptionItem`/`PrescriptionStatus` on `components/domain/clinical/
  types.ts` (Spec #4 §10.2 `patient_documents` simplified — no
  object-storage row, since no real file is ever stored; §10.3's
  `generated_documents` treats a prescription as one more document kind
  with no item structure, so `Prescription`'s own structured
  medication-item model is a deliberate, documented extension of that
  generic shape for this bounded prototype, matching the task's own
  explicit model — both reconciliations are recorded directly in the
  type definitions' own doc comments). `PrescriptionStatus` keeps
  `"cancelled"` for shape-fidelity with a real future backend (the
  task's own two-value sketch) without inventing any UI to reach it —
  every fixture and every prototype creation only ever produces
  `"issued"` (§31's own "do not implement a cancellation workflow"
  instruction). New `components/domain/clinical/document-category.ts`
  (`DOCUMENT_CATEGORY_MAP` — analysis/imaging/report/prescription/other,
  each with its own Lucide icon, no emoji, no per-category color
  treatment) and two new shared structured-detail pieces reused from
  UI-005C's own consultation work: none needed to be added here since
  Documents/Prescriptions have their own distinct presentation, but the
  prescription detail view intentionally mirrors UI-005B/C's own
  labeled-section pattern for visual consistency. New
  `features/patients/clinical-documents.ts`/`mock-clinical-documents-
  data.ts` (pat-1/Ahmed has four documents — three cross-referencing
  UI-005B's own `enc-1`/`enc-2`/`enc-3` `ClinicalEncounter` fixtures
  rather than inventing contradicting consultation references, plus one
  externally-scanned `"prescription"`-category document with no
  consultation reference, demonstrating that document category exists
  independently of the structured `Prescription` records below — the two
  are never auto-synchronized, §42; pat-2/Sara has none, "empty by
  omission") and `features/patients/prescriptions.ts`/`mock-
  prescriptions-data.ts` (pat-1's `ORD-2026-0018`, matching the task's
  own §7 example exactly, cross-referenced to `enc-1`; two harmless
  generic medications — Paracétamol/Ibuprofène — never a detailed
  realistic regimen, §28). New `formatFileSize` in
  `features/patients/format.ts` ("1,2 MB", `Intl.NumberFormat`-based,
  matching `formatMad`'s own locale-aware convention). New
  `components/documents-section.tsx` (`DocumentsSection`): lightweight
  Tous/Analyses/Imagerie/Comptes-rendus/Ordonnances/Autres filter with
  its own filtered-empty state and result count (mirrors
  `ClinicalHistorySection`'s exact filter architecture), `+ Ajouter un
  document` opens `document-upload-dialog.tsx`
  (`DocumentUploadDialog`) — a native `<input type="file">` (§18, no new
  FileUpload infrastructure) whose `onChange` reads only `file.name`/
  `file.type`/`file.size`; the file's contents are never accessed, no
  `FileReader`, no Base64, no `ObjectURL` (§19, verified by a dedicated
  fixture-shape test asserting every stored field is a string/number/
  undefined, never a Blob/File). Validates a selected file, an allowed
  MIME type (`application/pdf`/`image/jpeg`/`image/png` — Spec #5 §29
  names file-size/MIME/extension as validation concerns generally but
  gives no concrete numeric limit, so no file-size boundary was invented
  without basis, per this task's own explicit §21 instruction — a
  documented, deliberate omission, not an oversight), a category and a
  title. `document-detail-drawer.tsx` (`DocumentDetailDrawer`) is
  read-only — "Télécharger" only ever shows a future-feature Toast
  notice, never a real file access (§15); no "Supprimer" anywhere, a
  historical clinical document requires governed lifecycle/audit
  behavior (§24). New `components/prescriptions-section.tsx`
  (`PrescriptionsSection`): history newest-first, `+ Nouvelle ordonnance`
  opens `prescription-form-dialog.tsx` (`PrescriptionFormDialog`) — a
  dynamic medication-item list (add/remove any row, including down to
  zero, with a clear "at least one medication is required" error on
  submit rather than disabling removal, §34), each item validated for
  medication/dosage/frequency only (duration/instructions stay optional,
  §35) — **no drug database, no autocomplete, no dosage/interaction/
  contraindication checking anywhere in this diff (§27, the task's own
  mandatory constraint)**. `generatePrescriptionNumber` mirrors
  `generatePaymentNumber`'s own illustrative sequential-numbering
  pattern (`ORD-2026-####`, real numbering is concurrency-safe and
  server-controlled later, §37). `prescription-detail-drawer.tsx`
  (`PrescriptionDetailDrawer`) is read-only — no Modifier/Supprimer
  anywhere; "Télécharger PDF"/"Imprimer" are prototype affordances only,
  never real document generation (§40); an optional "Consultation
  associée" section resolves the prescription's `consultationId` against
  UI-005B's own `ClinicalEncounter` fixtures without ever mutating that
  record (§38). A newly uploaded document and a newly created
  prescription both live only in `DocumentsSection`'s/
  `PrescriptionsSection`'s own local state — the same "local session
  state, not a global store" convention as every prior Dossier Santé
  prototype interaction; the centralized fixtures are never mutated, and
  no LocalStorage/IndexedDB/cookie is used anywhere. `PatientHealthContent`'s
  loading skeleton was extended with two more shape-matched placeholder
  blocks; loading/error remain the tab's one unified state (same §33
  reasoning as UI-005B/C — no real network boundary exists between these
  fixture reads). One UI-005B/C-era boundary test in `patient-health-
  content.test.tsx` was updated, not weakened: it used to assert this
  tab never rendered "Prescription"/"Document" text at all, which
  UI-005D's own explicit scope now legitimately supersedes — replaced
  with a positive integration check that both new section headings
  render, with their own full dedicated coverage living in
  `documents-section.test.tsx`/`prescriptions-section.test.tsx`. Full
  FR/AR under new `patientDetail.health.documents.*`/`patientDetail.
  health.prescriptions.*` namespaces (initially misnested as siblings of
  `patientDetail.health` rather than nested inside it — the same
  structural slip UI-005C's own `consultation` namespace made and left
  in place; caught here via a failing test run showing raw untranslated
  `patientDetail.health.documents.*` dot-path strings, and fixed by
  programmatically moving both blocks inside `patientDetail.health` in
  both locale files rather than by hand-editing raw JSON text). New
  Arabic clinical/document terminology reviewed for register and
  consistency with UI-005A/B/C (e.g. "المستندات" for Documents, "الوصفات
  الطبية" for Ordonnances — no competing translation introduced for any
  term already established). RTL verified (SSR `dir="rtl"`/`lang="ar"`
  on the route). Added `frontend/src/features/patients/clinical-
  documents.test.ts` (5 tests), `mock-clinical-documents-data.test.ts` (8
  fixture-integrity tests — including that no fixture field is ever a
  non-primitive value, proving no raw file contents are stored),
  `prescriptions.test.ts` (10 tests — including the numbering generator
  and both item-level and form-level validation), `mock-prescriptions-
  data.test.ts` (7 fixture-integrity tests), `components/documents-
  section.test.tsx` (15 tests: heading/list/metadata, category
  filtering with a filtered-empty state, the detail drawer's full
  metadata, the download future-feature notice, the upload form opening,
  file-required/MIME-rejected/valid-upload-succeeds, the new document
  appearing immediately, absence of any delete action, the empty state,
  absence of finance content, French, Arabic/RTL) and
  `components/prescriptions-section.test.tsx` (15 tests: heading/
  history, the detail drawer's structured items, the associated-
  consultation date, absence of edit/delete, the PDF/print future-feature
  notices, the creation form opening, per-field required validation,
  adding/removing a medication, the zero-items block, a full successful
  creation immediately opening the new read-only prescription, the empty
  state, absence of any drug-recommendation/interaction-checking UI,
  French, Arabic/RTL). All 424 frontend tests (364 carried over from
  UI-001 through UI-005C + 60 new UI-005D tests), typecheck, lint and
  build pass on the first full-suite run; backend regression (10 tests,
  clean on the first run) unaffected — no backend files touched. This
  completes the Patient 360° clinical frontend prototype sequence
  (UI-005A/B/C/D).
- UI-006A — Cabinet Finance Dashboard: `/app/finance` replaces the
  generic "not implemented" placeholder with the first real cabinet-wide
  financial command center (Spec #9 Screen 24), explicitly distinct from
  Patient 360°'s own Factures/Paiements tabs (CLAUDE.md §12/§19) — no
  patient-scoped screen is duplicated here. New `features/finance/`
  introduces a bounded aggregation/read-model layer: `aggregations.ts`
  derives every KPI from the *existing* UI-004D/E invoice/payment
  fixtures rather than a second, possibly-diverging calculation —
  `getFinancialSummary` (UI-004D) is reused unmodified across the full
  cabinet-wide invoice set for À encaisser/En retard, and
  `getEffectivePaidAmount` (UI-004E) is reused unmodified after
  period-filtering for Encaissé, so cabinet totals can never
  independently contradict Patient 360°'s own figures. A new
  `CabinetExpense`/`ExpenseCategory`/`ExpenseStatus` sibling finance-
  domain model was added to `components/domain/finance/types.ts`
  (alongside the existing Invoice/Payment types), with its own read-only
  synthetic fixture set (`features/finance/mock-expenses-data.ts`) —
  supports the Décaissements KPI/activity aggregation only, no
  expense-entry UI anywhere (UI-006D's own scope). KPIs: Encaissé, À
  encaisser, En retard, Décaissements, Position caisse — deliberately
  reconciling with the task's own §17/§18 five-metric set rather than
  Spec #9 Screen 24's four-metric illustration (Facturé/Encaissé/À
  encaisser/En retard), per CLAUDE.md §1's priority order (explicit task
  instructions over specification). À encaisser/En retard are
  deliberately NOT period-scoped (§18 never mentions a period for
  them — they are current balances, not activity that occurred during a
  window) while Encaissé/Décaissements/Position caisse do recompute on
  every period switch; this asymmetry is documented directly in
  `aggregations.ts`, not left implicit. Period switching (Aujourd'hui/
  Cette semaine/Ce mois, defaulting to "Ce mois" per Screen 24's own
  illustration) is resolved against the fixed `MOCK_BUSINESS_DATE`
  ("2026-08-23") prototype convention already used by Aujourd'hui/Agenda
  — "week" reuses Agenda's own Monday-start `getWeekStart` (UI-002)
  rather than a second week-boundary rule. Cash position is an
  explicitly documented prototype-only formula — opening position
  (500 MAD, matching Spec #9 Screen 30's own illustrative "Solde
  initial" rather than an invented number) + period collected − period
  disbursed — with a supporting-text disclaimer on its own MetricCard
  that this is a dashboard projection, not a real Caisse closing/
  reconciliation result (§41); UI-006C/E own actual Caisse session UX.
  The Receivables ("À encaisser") section resolves cabinet-wide
  outstanding (non-cancelled, positive-remaining) invoices to
  display-ready patient names, ordered overdue-first then currently-due
  (`RECEIVABLE_RANK`, never fixture insertion order); each row is a real
  `next/link` to the existing `/app/patients/{id}/invoices` workspace —
  no duplicate InvoiceDetailDrawer under cabinet Finance (§24). "Voir
  toutes les factures" shows a future-feature Toast notice rather than a
  real screen — the global invoice list is UI-006B's scope, not
  implemented early (§25/§51). "Activité récente" merges posted
  payments and posted expenses for the selected period into one
  newest-first list (`buildRecentActivity`), each row pairing a textual
  type label ("Encaissement"/"Décaissement") with its amount — never
  color/sign alone (§32) — and neither KPIs nor activity rows use
  giant green/red financial color coding anywhere (§19/Spec #10 §22),
  only MetricCard's existing restrained typography-emphasis convention
  (danger only for a genuinely nonzero En retard). No accounting
  terminology (Profit/Marge/EBITDA/Débit/Crédit/Grand livre) anywhere,
  no Caisse open/close controls, no expense-entry controls, no
  cabinet-level Encaisser/payment-capture workflow, no global invoice
  screen — all verified by dedicated absence tests. Added
  `frontend/src/features/finance/aggregations.test.ts` (16 tests:
  period-boundary resolution, collected/receivable/overdue/disbursed/
  cash-position math against the real fixtures, reversed-payment and
  cancelled-expense/cancelled-invoice exclusion, receivable ordering,
  activity merging/sorting), `mock-expenses-data.test.ts` (5
  fixture-integrity tests), `components/app/app-sidebar.test.tsx` (1
  test — the sidebar's generic `pathname.startsWith` active-state logic
  was already correct and unmodified, but had no prior regression test
  for any nav item; this is the first, and incidentally proves Finance
  now resolves against real content rather than the catch-all), and
  `finance-dashboard.test.tsx` (15 tests: header/default period,
  all five KPIs against the real fixtures, period switching recomputing
  the right three KPIs while leaving the other two unchanged,
  receivables ordering/exclusion/navigation, the future-feature "Voir
  toutes les factures" notice, recent activity rendering/ordering/
  exclusion, empty receivables, empty-period activity with an
  opening-only cash position, loading, error, French, Arabic/RTL, and
  absence of every forbidden accounting/Caisse/expense-entry/payment-
  capture control). All 461 frontend tests (424 carried over through
  UI-005D + 37 new UI-006A tests), typecheck, lint and build pass on the
  first full-suite run; backend regression (10 tests, clean) unaffected
  — no backend files touched. `frontend/ARCHITECTURE.md` gained a new
  "Cabinet Finance aggregation" convention paragraph documenting the
  reuse-over-reimplementation rule for future UI-006B/C/D/E tasks to
  follow.
- UI-006B — Global Invoices & Receivables: `/app/finance/invoices`, the
  cabinet-wide operational invoice workspace UI-006A's own "Voir toutes
  les factures" button now navigates to (a real `next/link`, replacing
  the future-feature Toast notice UI-006A originally showed before this
  screen existed — `finance.receivables.viewAllNotice` removed from both
  locale files as dead i18n). Reuse-first per the task's own explicit
  instruction: `InvoiceDetailDrawer` (UI-004D,
  `features/patients/components/invoice-detail-drawer.tsx`) is shared
  unmodified between Patient 360°'s Factures tab and this new screen —
  inspecting it first confirmed it never actually assumed Patient 360°
  page composition (it already took only pre-resolved props), so the
  only change needed was one small additive `showPatientNavigation`
  prop (default `false`) rendering "Ouvrir le patient"/"Voir les
  factures du patient" links only when explicitly requested; Patient
  360°'s own existing usage passes nothing and is behaviorally
  unchanged (its full test suite re-run confirms this). "Encaisser"
  still navigates unchanged to the existing `/app/patients/{id}/payments`
  workflow (UI-004E) — there remains exactly one implemented
  payment-capture prototype in the whole product, never a second one
  here (§24/§44). New `features/finance/global-invoices.ts` builds a
  `GlobalInvoiceRow` read model — cabinet-wide, every patient's
  invoices, not just one — from the *existing*
  `getInvoicesMockData()`/`getPatientsMockData()` fixtures (UI-004D/
  UI-003A), keeping the full `Invoice` embedded on each row rather than
  flattening total/paid/remaining onto it, so a table cell reads
  `row.invoice.totalAmount` directly instead of risking a second, stale
  copy. The next payable installment per invoice is derived via
  `getPayableInstallments` (UI-004E) called with no local payments —
  reused unmodified for a read-only cabinet view, never a payment
  session. Operational ordering (§18) is one explicit rank per
  `InvoiceStatus` value — overdue → issued → partially_paid → draft →
  paid → cancelled — with earliest-relevant-due-date-first as the
  secondary sort key (falling back to most-recently-issued-first for the
  tiers with no meaningful due date), verified against the real fixture
  set's exact order: inv-3, inv-1, inv-1b, inv-2, inv-1c. The five-value
  status filter (Toutes/À payer/Partiellement payées/Payées/En retard)
  is a second, deliberately distinct taxonomy from
  `features/patients/finance.ts`'s own patient-scoped `InvoiceFilterGroup`
  (which merges issued+partially_paid into one "due" bucket) — this
  screen's own task instructions require splitting them, so this is a
  documented, explicitly-scoped second mapping over the same
  `InvoiceStatus`, not duplicated status logic. Search is local,
  case-insensitive, across patient full name/patient number/invoice
  number. The financial summary card row (Total facturé/Payé/Reste à
  encaisser/En retard) reuses `getFinancialSummary` (UI-004D) completely
  unmodified — called over the *filtered* result set specifically, per
  this task's own explicit §5/§30 requirement, so cabinet totals can
  never independently drift from the same source invoices Patient 360°
  and the Finance dashboard already show. Desktop table
  (`global-invoice-table.tsx`) + mobile card list
  (`global-invoice-card-list.tsx`) mirror `PatientTable`/
  `PatientCardList`'s exact `hidden overflow-x-auto md:block` /
  `divide-y ... md:hidden` dual-render convention, including the same
  `lg:table-cell` secondary-column-hiding pattern at tablet width
  (Date/Total/Payé hidden below `lg`, since Patient/Invoice/Remaining/
  Next installment/Status are the columns the task calls more
  important). Search-empty ("Aucune facture ne correspond à votre
  recherche.") and filtered-empty ("Aucune facture ne correspond à ce
  filtre.") are two intentionally distinct states, each with its own
  targeted clear action — the real fixture set's own "À payer" filter
  (no invoice is ever plain "issued" with a positive balance in the
  current data) conveniently doubles as a live demonstration of the
  filtered-empty state without any synthetic data needed at the page
  level. No invoice creation/editing/cancellation, no payment capture,
  no Caisse, no expenses, no accounting terminology anywhere — verified
  by dedicated absence tests. Added
  `frontend/src/features/finance/global-invoices.test.ts` (14 tests:
  operational ordering/priority against the real fixtures, patient-name/
  number resolution, next-installment derivation including the
  no-schedule case, search by name/number/invoice-number, all five
  filter predicates against synthetic rows, and a direct equality check
  against `getFinancialSummary`'s own output), `global-invoices-page.test.tsx`
  (24 tests: header, summary integrity, table ordering/patient identity/
  invoice reference, mobile-card dual-render proof, next-installment
  display, search by name/number/invoice-number, each filter, the
  À-payer/filtered-empty combination, search+filter composition, result
  count, invoice detail opening with lines/installment schedule, the two
  new patient-navigation links, Encaisser navigation plus absence of any
  duplicate payment form, paid/cancelled invoices having no Encaisser,
  search-empty with working clear action, fully-empty with no filter
  chrome, loading, error, Arabic/RTL, and absence of invoice-creation/
  accounting/Caisse/expense controls), and two more cases in
  `components/app/app-sidebar.test.tsx` (Finance remains the active
  main-sidebar section for both `/app/finance` and the new nested
  `/app/finance/invoices`). All 500 frontend tests (461 carried over
  through UI-006A + 39 new UI-006B tests), typecheck, lint and build
  pass on the first full-suite run; backend regression (10 tests, clean)
  unaffected — no backend files touched.
- UI-006C — Caisse: Opening & Cash Movements: `/app/finance/caisse` —
  Spec #2's own IA sitemap nests Caisse under Finance (alongside
  Factures/Échéances/Encaissements/Décaissements), not a standalone
  `/app/caisse`, so the task's own tentative route guess was reconciled
  against the specification per CLAUDE.md §1's priority order and
  documented as a deliberate choice, not an oversight. Today's cash
  register: closed → opening-balance workflow → open, with a derived
  movement history — deliberately distinct from the Finance dashboard
  (UI-006A, "how much did the cabinet collect this period") and from
  Patient 360°'s own Paiements tab (CLAUDE.md §12/§19). New
  `CashSession`/`CashMovementDirection`/`CashMovementType`/
  `CashMovement` types added to `components/domain/finance/types.ts`
  (Spec #4 §18's `cash_register_sessions`/`cash_movements`, simplified —
  every closing/reconciliation field
  (`expected_closing_balance`/`physical_closing_balance`/`difference_*`/
  `closed_by`/`closed_at`) deliberately omitted rather than modeled
  early, since UI-006E owns them and they are not harmless to leave
  half-defined) plus `cash-session-status.ts` (closed/open → tone/label,
  mirroring `invoice-status.ts`'s own registry pattern). New
  `features/caisse/` — `calculations.ts`'s `buildCashMovements` derives
  every movement from the *existing* fixtures, never a second movement
  universe: posted, cash-method patient payments matching the session's
  business date (UI-004E, reversed excluded) and posted expenses
  matching that date (UI-006A, cancelled excluded — proven against the
  real `exp-5` fixture). Since neither `Payment` nor `CabinetExpense`
  tracks a real time-of-day, a small deterministic synthetic-time
  generator assigns each movement an `HH:MM` value from a stable sort
  key (type then id) rather than inventing per-fixture times by hand —
  general and reproducible for any input set, not coupled to specific
  real IDs. Movements are then re-sorted newest-first for display.
  Theoretical balance (opening + incoming − outgoing) reuses a new
  `computeCashBalance` primitive extracted from UI-006A's own Position
  Caisse formula (`features/finance/aggregations.ts`) — the smallest
  safe refactor the task asked for (§43): `computeCashPosition` now
  calls this shared one-liner internally with zero change to its own
  public signature/behavior, verified by UI-006A's entire pre-existing
  test suite passing unmodified. The two "opening" values keep
  deliberately distinct semantics, documented directly in the shared
  function's own doc comment: UI-006A's is the constant
  `OPENING_CASH_POSITION` reused across all three period views (a
  projection), while Caisse's is the real amount entered when today's
  specific session was opened. `mock-data.ts` provides the deterministic
  "Open Caisse" prototype defaults required by §21-22 (never
  `Date.now()`) — `SESSION_OPENED_AT = "08:15"` and a new synthetic
  receptionist name, `OPENED_BY_NAME = "Meryem Bakkali"`, deliberately
  NOT "Sara Alaoui" (already the canonical empty-fixture patient across
  UI-004D/E/UI-005*, pat-2) to avoid a staff/patient name collision that
  Spec #9 Screen 33's own wireframe would have introduced if copied
  verbatim. The live route defaults to an already-open synthetic session
  (§17 — a reviewer can inspect movement history immediately) while
  `CaissePage`'s own `initialSession` prop fully supports starting
  `null` (closed) so the opening workflow itself is demonstrable and
  tested; opening a second session is structurally impossible once open
  — the opening form simply stops rendering, no separate guard needed.
  A patient-payment movement row navigates to the existing
  `/app/patients/{id}/payments` surface, never a duplicate payment
  detail/capture. "Fermer la caisse" is shown (Spec #9 Screen 30's own
  wireframe includes it) but is deliberately non-functional — it shows
  only "La clôture de caisse sera implémentée dans UI-006E." and never
  mutates session state, verified by a dedicated test. No expense entry,
  no physical cash count, no discrepancy calculation, no real closing,
  no accounting terminology anywhere. Added
  `frontend/src/features/caisse/calculations.test.ts` (17 tests:
  movement derivation from real payment/expense fixtures, reversed-
  payment and cancelled-expense exclusion — the latter against the real
  `exp-5` fixture, cross-day isolation, deterministic multi-movement
  ordering, payment/expense reconciliation against
  `getEffectivePaidAmount`'s own output, movement reference integrity,
  the theoretical-balance formula, and the direct UI-006A/UI-006C
  formula-consistency proof), `caisse-page.test.tsx` (14 tests: header,
  closed state with the opening-balance input, negative-balance
  rejection, zero-balance acceptance with success feedback, custom
  opening balance represented in the summary, second-session
  prevention, a combined payment+expense day exercising opened-at/
  opened-by/summary/movement rendering/ordering/patient navigation,
  reversed-payment exclusion, cancelled-expense exclusion doubling as
  the open/no-movement state, the non-functional close notice, loading,
  error, Arabic/RTL, and absence of every forbidden manual-creation/
  payment-capture/expense-entry/cash-count/reconciliation/accounting
  control), and one more case in `components/app/app-sidebar.test.tsx`
  (Finance remains active for the new nested `/app/finance/caisse`
  route too). All 532 frontend tests (500 carried over through UI-006B +
  32 new UI-006C tests), typecheck, lint and build pass on the first
  full-suite run; backend regression (10 tests, clean) unaffected — no
  backend files touched.
- UI-006D — Décaissements & Expenses: `/app/finance/expenses` — the
  cabinet cash-expense capture workspace, completing the
  Caisse-open → new décaissement → Expense + CashMovement OUT →
  theoretical balance decrease workflow whose opening/movement-history
  half UI-006C already implemented. Scoped to `MOCK_BUSINESS_DATE` only,
  like `/app/finance/caisse` itself, rather than Spec #9 Screen 32's own
  broader Période/Catégorie-filterable ledger: a décaissement is
  conceptually a cash-register operation tied to the *currently open*
  session, not an accounting history browser, so a period selector was
  deliberately not added (documented decision, §15's own explicit
  "otherwise do not expand scope" instruction) — the task's own §13
  mockup (today-only, "TOTAL AUJOURD'HUI" + a flat list) was treated as
  authoritative over the wireframe under CLAUDE.md §1. For the same
  reason, the "+ Nouveau décaissement" form's field list follows the
  task's own explicit §19 enumeration (category/amount/description/
  optional supporting document) rather than Screen 32's beneficiary/
  payment-method fields — every décaissement recorded here is implicitly
  a cash expense (`CabinetExpense` has no payment-method field to begin
  with, an UI-006A-era simplification carried forward unchanged).
  `CabinetExpense` (UI-006A) is extended, not replaced: three new
  optional fields (`time`, `createdBy`, `supportingDocument`, plus a new
  `ExpenseSupportingDocument` metadata-only type — `fileName`/
  `mimeType`/`sizeBytes`, mirroring `ClinicalDocument`'s own shape, never
  `File`/`Blob`/base64/an `ObjectURL`) so UI-006A's five original
  fixtures are completely unaffected. New `features/finance/expenses.ts`
  holds every pure, directly-tested calculation: `filterTodayPostedExpenses`/
  `sortExpensesNewestFirst` (a missing `time` — UI-006A's date-only
  fixtures — sorts as if "00:00", never a fabricated time),
  `computeExpensesTotal`, a strictly-positive `isValidExpenseAmount`
  (deliberately a separate function from Caisse's own
  `isValidOpeningBalance`, which allows 0 — a different validation rule,
  not the same one duplicated), a deterministic `nextSyntheticTimeForSequence`
  (never `Date.now()`, independent from but stylistically consistent
  with UI-006C's own synthetic-time generator — that one assigns times
  to *derived* movements, this one to a *newly created* expense), and
  `createExpenseAndMovement` — a pure builder returning a matching
  `CabinetExpense` + `CashMovement` OUT pair whose direction/type/
  `expenseId`/amount are consistent by construction, not by a separate
  reconciliation check. The page's create handler calls this once and
  applies both results to local state in the same function (§30's own
  "one orchestrated handler" requirement) — never an intermediate render
  where the expense exists but the movement does not, or vice versa. A
  dedicated cross-module test (`expenses.test.ts`) proves the resulting
  `CashMovement`, once folded into `features/caisse/calculations.ts`'s
  own `computeTheoreticalBalance`, decreases the theoretical balance by
  exactly the new expense's amount — the balance itself is deliberately
  never re-rendered on this page (§45: "do not duplicate the entire
  Caisse page"), only proven by calculation; a persistent "Voir la
  caisse" link (header + closed-state guidance) is the only cross-page
  connection, consistent with §32-33's explicit allowance that
  cross-route prototype state does not need to survive navigation.
  `EXPENSE_CATEGORY_MAP` (UI-006A) is reused unmodified for both the
  form's category `Select` and every rendered category label — no second
  taxonomy. The optional supporting-document file input reuses the exact
  same conservative PDF/JPEG/PNG MIME allowlist and metadata-only
  discipline already established by UI-005D's clinical-document upload,
  and the read-only detail drawer's "Télécharger le justificatif" reuses
  that same feature's exact future-feature Toast message rather than
  inventing a second one. Caisse-open is enforced structurally: while
  closed, both "+ Nouveau décaissement" affordances (header and the
  empty-state's own action) are simply not rendered, replaced with an
  alert-styled guidance card linking to `/app/finance/caisse` — never a
  silent auto-open. Expense detail is read-only — no "Modifier"/
  "Supprimer" anywhere, matching CLAUDE.md §24 (financial records are not
  ordinary CRUD). Added `frontend/src/features/finance/expenses.test.ts`
  (21 tests: MIME allowlist, amount validation including zero/negative/
  non-integer/NaN, today+posted filtering including the real cancelled
  `exp-5`-style case, newest-first ordering including the missing-time
  tiebreak, the total, the deterministic time generator, the atomic
  builder's structural reference/amount integrity, supporting-document
  metadata pass-through and its metadata-only field shape, and the
  cross-module Caisse-balance-decrease proof),
  `expenses-page.test.tsx` (21 tests: header/summary, existing today's
  history rendering, cancelled-expense exclusion from the total,
  newest-first ordering, the create dialog opening only while Caisse is
  open, closed-state guidance and its link, required-field validation,
  zero/negative amount rejection, disallowed MIME rejection, optional
  document success, immediate list/total update on valid submit,
  `createdBy` sourced from the open session, detail-drawer rendering
  including supporting-document metadata and the future-only download
  notice, no-document detail state, empty state with/without the create
  action depending on Caisse status, loading, error, Arabic/RTL, and
  absence of every forbidden supplier/accounting/Caisse-closing
  control), and one more case in `components/app/app-sidebar.test.tsx`
  (Finance remains active for the new nested `/app/finance/expenses`
  route too). All 575 frontend tests (532 carried over through UI-006C +
  43 new UI-006D tests), typecheck, lint and build pass on the first
  full-suite run; backend regression (10 tests, clean) unaffected — no
  backend files touched.
- UI-006X — Finance Workspace Alignment & Navigation: a corrective UX/IA
  task — no new business functionality — bringing `/app/finance` and its
  three siblings into one coherent workspace now that UI-006B/C/D all
  exist. New `features/finance/components/finance-nav.tsx` (`FinanceNav`)
  reuses the existing generic `Tabs` primitive (Spec #8 §48 — the same
  real-navigation component already backing Patient 360°'s own tab bar)
  rather than inventing a new nav pattern: real `<Link>`s, `aria-current`,
  horizontal-scroll-on-mobile and logical-property (RTL-safe) spacing all
  came for free. Four items — Vue d'ensemble/Factures/Caisse/
  Décaissements — deliberately fewer than Spec #9 Screen 24's own
  six-tab wireframe (Aperçu/Factures/Échéances/Encaissements/Caisse/
  Décaissements): Échéances and Encaissements have no real route yet, so
  including them would link to nothing; the task's own explicit
  four-item list (§8) takes priority per CLAUDE.md §1. Active-state
  matching is exact/path-aware (`resolveActiveSection`, keyed off
  `usePathname()`): `/app/finance` matches only the literal route, never
  every nested Finance path via a naive `startsWith` (the exact bug this
  task's own §9 warns against — `AppSidebar`'s own main-nav matching
  already gets this right for the whole Finance module, this fixes the
  equivalent problem one level down, inside it). Integrated identically
  into all four Finance pages, positioned right after `PageHeader` in
  every one. The main sidebar (`lib/nav-config.ts`, `AppSidebar`) is
  completely untouched — Finance remains exactly one sidebar module, its
  children living only inside `FinanceNav`.
  Dashboard recomposition: `KpiSummary` drops the "Position caisse" card
  — that whole prototype-projection concept is gone, not just hidden.
  `computeCashPosition`/`OPENING_CASH_POSITION` are removed from
  `features/finance/aggregations.ts` and `cashPosition` from the
  `FinanceKpis` type; `computeCashBalance` (the actually-shared
  arithmetic primitive) stays untouched, now with exactly one caller
  left — Caisse's own `computeTheoreticalBalance`
  (`features/caisse/calculations.ts`). New `DashboardCaisseSection`
  replaces the removed card with Caisse's real operational state,
  reusing `getDefaultOpenSessionMockData`/`buildCashMovements`/
  `computeIncomingTotal`/`computeOutgoingTotal`/
  `computeTheoreticalBalance`/`CaisseSummary` verbatim from
  `features/caisse/` (UI-006C) — never a second cash-position formula,
  per the task's own explicit §20/§24 requirement. Open state shows the
  real 4-metric `CaisseSummary` plus "Ouverte à HH:MM par {name}" and a
  "Voir la caisse" link (reusing UI-006D's own exact string, not a
  duplicate); closed state shows "La caisse n'est pas ouverte." (a new,
  deliberately distinct string from Caisse's own
  `closedDescription` — that one is an instruction to open it, this one
  is a status statement) plus the same link. `finance-dashboard.tsx`'s
  own local `BUSINESS_DATE = "2026-08-23"` literal — a pre-existing,
  UI-006A-era duplicate of the canonical business-date constant — is
  replaced with the real `MOCK_BUSINESS_DATE` import from
  `features/caisse/mock-data.ts`, required for correctness now that the
  dashboard's own Caisse section must query movements for the exact same
  business date as the `CashSession` it displays (previously harmless
  since nothing cross-checked the two; now genuinely load-bearing).
  `ReceivablesSection`'s heading changes "À encaisser" → "À traiter"
  with a new overdue-count/total + to-collect-count/total summary line,
  computed by filtering/summing the *already-built* `receivables` array
  in the component itself (`summarizeAttention`) — not a new financial
  total, not a rebuilt priority rule. `RecentActivitySection` rows are
  now real navigation: a payment row links to the existing
  `/app/patients/{id}/payments`, an expense row to
  `/app/finance/expenses` — mirroring `CaisseMovementList`'s own
  navigable-row convention (UI-006C) exactly, including reusing its
  `finance.caisse.movements.viewPaymentAriaLabel` key rather than adding
  a duplicate. Invoices/Caisse/Expenses pages are otherwise untouched —
  each gained exactly one line, `<FinanceNav />` after its own
  `PageHeader`.
  i18n: added `finance.nav.*` (navigationLabel, overview — the other
  three tab labels reuse `finance.invoices/caisse/expenses.pageTitle`
  verbatim, no duplicate strings), `finance.dashboard.*` (caisseTitle,
  caisseClosedNote), `finance.receivables.overdueCount`/`toCollectCount`,
  `finance.activity.viewExpenseAriaLabel`; removed the now-dead
  `finance.kpis.cashPosition`/`finance.cashPositionNote` keys (FR+AR).
  Arabic reuses the exact same "المصروفات" plural already established
  for `finance.kpis.disbursed`/`finance.caisse.summary.outgoing` for
  "Décaissements" tab consistency, and "نظرة عامة" verbatim from
  `patientDetail.tabs.overview` for "Vue d'ensemble" — no competing
  terminology introduced.
  Added `features/finance/components/finance-nav.test.tsx` (6 tests: all
  four items/hrefs, exact-route overview active state, each of the other
  three routes' own active state, Arabic). Rewrote
  `finance-dashboard.test.tsx` around the new composition (still 16
  tests: header+nav+period default, four KPIs with the projection gone,
  period-switch recomputation, real open-Caisse summary matching
  UI-006C's own derivation, closed-Caisse note, À traiter summary line
  and ordering/navigation, recent-activity navigation, empty/loading/
  error, Arabic/RTL, forbidden-controls). Updated
  `aggregations.test.ts` (removed the `computeCashPosition`/
  `OPENING_CASH_POSITION` describe block and `cashPosition` from the
  `computeFinanceKpis` expectation — the underlying concept was removed,
  not just its test) and `features/caisse/calculations.test.ts` (the
  UI-006A/UI-006C formula-consistency proof now compares
  `computeTheoreticalBalance` directly against `computeCashBalance`,
  since `computeCashPosition` no longer exists to compare against — the
  "no duplicate formula" property still holds and is still tested, just
  against the one primitive that's actually still shared). Added one
  FinanceNav-active-state test each to `global-invoices-page.test.tsx`,
  `caisse-page.test.tsx` and `expenses-page.test.tsx` — their own
  existing 59 tests all passed unmodified on the first run after adding
  `<FinanceNav />` (no text-collision fixes were needed there; the
  dashboard's own rewrite needed several, documented inline as `getAllByText`
  scoping, matching this session's established collision-handling
  convention). Total 586 frontend tests (575 carried over through
  UI-006D + 11 net new), typecheck, lint and build pass on the first
  full-suite run; backend regression (10 tests, clean) unaffected — no
  backend files touched. Rendered visual QA: DOM/SSR-level only (curl
  against the running dev server — 200 on all four routes, `dir="rtl"`/
  `lang="ar"` present, obsolete "Position caisse"/"Projection prototype"
  wording confirmed absent) — no browser-automation/screenshot tool was
  available in this environment, so true pixel-level rendered QA was not
  performed; the dev server was left running for manual browser review.
- UI-006E — Caisse Closing & Reconciliation: completes the daily
  lifecycle UI-006C left open-ended — CLOSED → OPEN → theoretical
  balance was already there; this task adds physical cash count →
  reconciliation → balanced/discrepancy handling → controlled closing →
  read-only closed summary, all inside the existing `/app/finance/caisse`
  (no new route, per the task's own explicit instruction).
  `CashSession` (`components/domain/finance/types.ts`) gains 7 new
  optional fields — `expectedClosingBalance`/`physicalClosingBalance`/
  `differenceAmount`/`differenceType`/`discrepancyReason`/`closedAt`/
  `closedBy` — plus a new `CashDifferenceType` ("balanced"/"shortage"/
  "overage", deliberately never accounting debit/credit terms, §14).
  `CashSessionStatus` itself is untouched — still exactly `"closed" |
  "open"` — resolving §8's own explicit question ("distinguish
  not_opened/open/closed ONLY if required... retain existing status
  semantics and use the presence of closedAt to distinguish") in favor
  of NOT adding a third status value: `session === null` continues to
  mean "not yet opened today" (no row exists until first opened,
  matching backend truth), while a genuinely completed closed session is
  `status: "closed"` with `closedAt` set. `CaissePage` now branches on
  three states instead of two — `session === null` (opening panel,
  unchanged) / `session.status === "open"` (live summary + movements +
  "Fermer la caisse", unchanged except the button's own handler) /
  `session.status === "closed"` (new: `ClosedCaisseSummary`, read-only,
  no opening panel ever shown again — no reopening anywhere in this
  prototype, per the task's own explicit instruction). The movement
  history section itself was hoisted out of the open-only branch so it
  renders for both open AND closed sessions (§25's own read-only
  "MOUVEMENTS" requirement), using the exact same `buildCashMovements`
  call as before — gated on `session !== null` instead of `isOpen`.
  New pure functions in `features/caisse/calculations.ts`:
  `computeCashDifference(physicalClosingBalance, expectedClosingBalance)`
  — physical minus expected, the task's own §13 "CRITICAL — NOT the
  reverse" formula, directly tested both ways to guard the sign — and
  `resolveCashDifferenceType` (0 → balanced, negative → shortage,
  positive → overage). Physical-count validation reuses
  `isValidOpeningBalance` as-is rather than a new function — the rule
  (whole-MAD, `>= 0`, zero valid) is genuinely identical, not just
  similarly-shaped, matching this task's own §12 requirement exactly.
  New `components/domain/finance/cash-difference-type.ts`
  (`CASH_DIFFERENCE_TYPE_MAP`, mirroring `cash-session-status.ts`'s
  registry pattern) maps balanced→success, shortage→danger,
  overage→**warning** — deliberately not `success` for overage, per the
  task's own explicit "do not treat positive discrepancy as good" (§17).
  Two-step closing UI, mirroring the existing `CancelConfirmDialog`
  (Agenda, UI-002) form-then-confirm convention: `CashCountDialog`
  (`features/caisse/components/`) shows a read-only opening/incoming/
  outgoing/théorique recap reusing `CaisseSummary`'s own
  `finance.caisse.summary.*` labels (no duplicate strings, just a
  vertical-list layout instead of a card grid, matching the task's own
  §10 wireframe), a physical-count `Input` that deliberately starts
  empty rather than prefilled with the expected balance (prefilling the
  value being verified against would defeat the point of counting), a
  live écart via `StatusBadge`, and a reason `Textarea` that only
  appears once the difference is non-zero — required then, never
  otherwise (§18-19). "Continuer" never closes the register (§20) — it
  hands the validated `{physicalClosingBalance, discrepancyReason}` up
  to `CaissePage`, which opens `CloseConfirmDialog` (a thin wrapper
  around the existing `ConfirmDialog` primitive, not a bespoke dialog)
  showing the same théorique/compté/écart/reason recap plus the
  consequence sentence ("Une fois clôturée... lecture seule.") before
  the actual mutation happens on explicit "Fermer la caisse" confirm.
  New read-only `ClosedCaisseSummary` renders business date, opened-at/
  by, closed-at/by, a 6-metric recap grid (opening/incoming/outgoing
  live-derived from the same immutable movement history; théorique/
  compté/écart from the session's own *frozen* closing fields — CLAUDE.md
  §24: a closed session's closing figures are financial history, never
  recomputed live afterward) with the écart card colored via
  `MetricCard`'s own existing `emphasis` prop (danger/warning/neutral,
  the same established pattern `KpiSummary` already uses for overdue —
  never color/sign alone, the label itself says "Écart"), and a
  "JUSTIFICATION" section that only renders when a discrepancy reason
  exists. `mock-data.ts` gains one new deterministic constant,
  `SESSION_CLOSED_AT = "18:35"` (never `Date.now()`, matching the task's
  own wireframe example exactly); `closedBy` reuses the session's own
  `openedBy` rather than a second identity constant — this prototype has
  no multi-shift/handoff concept, so the person who opened today's
  register is who closes it. `CaisseSummary`'s own doc comment (which
  said "Écart/Solde réel/Montant compté... stays UI-006E's scope") was
  corrected now that UI-006E exists — a one-line accuracy fix, not new
  behavior. The obsolete `finance.caisse.closeFutureNotice` toast key
  (FR+AR) is removed — grep-confirmed unreferenced anywhere else before
  deletion. Updated `caisse-page.test.tsx`'s own "Fermer la caisse
  shows a future notice" test — its entire premise was this task's own
  objective, so it was replaced with a `describe("closing/reconciliation")`
  block (11 tests: dialog opens instead of closing immediately, required/
  invalid/zero physical count, balanced state hides the reason field,
  the difference-sign proof — §13 — both directions, shortage requires
  a reason and blocks Continuer until provided, overage also requires a
  reason and its badge is never `success`-toned, the confirmation step's
  own recap + consequence text + cancel-discards-without-mutating,
  confirming actually closes the session with the full read-only recap
  and removes both the closing AND opening actions permanently, a
  balanced closing omits the justification section entirely) plus one
  more Arabic/RTL case for the full closing flow end-to-end. The
  existing "never introduces manual movement creation..." test was
  narrowed to "...on the default open view (before opening the closing
  dialog)" — cash counting/reconciliation/a functional close are real
  now, just not visible without clicking "Fermer la caisse" first — and
  had "Espèces comptées"/"Écart"/"Solde réel"/"Comptage physique" moved
  from a permanently-forbidden list into that same "not yet visible by
  default" list, since claiming they're forever absent would now be
  false. Added `computeCashDifference`/`resolveCashDifferenceType` tests
  to `calculations.test.ts` (3 new). All 598 frontend tests (586 carried
  over through UI-006X + 12 net new), typecheck, lint and build pass on
  the first full-suite run; backend regression (10 tests, clean)
  unaffected — no backend files touched.
- UI-007A — Équipe Directory & Employee Profiles: replaces the generic
  catch-all placeholder at `/app/equipe` with the first real cabinet
  Team/HR workspace, plus a nested `/app/equipe/[id]` employee profile
  (Spec #9 Screens 33-34) — the sidebar's own existing "Équipe" link
  (already pointing at `/app/equipe`, unchanged since TASK-003) now
  resolves to real content instead of the shared "Pas encore
  implémenté" screen, with no change needed to `nav-config.ts` or the
  `[...slug]` catch-all itself. New bounded `TeamMember` domain model
  (`components/domain/team/types.ts`) is deliberately kept separate
  from a future authentication User — no password/MFA/session/
  permission fields anywhere on it (§7) — and carries an optional
  `practitionerId` that links to Agenda/Patients/Caisse's own existing
  lightweight `PRACTITIONERS` fixture (`pr-1`/`pr-2`) for the two team
  members who are also schedulable practitioners, without refactoring
  any of those existing selectors to consume `TeamMember` instead (§8,
  documented as a deliberate future-relationship decision, not an
  oversight). Role is intentionally not a status: the new
  `TEAM_ROLE_MAP` registry (`components/domain/team/team-role.ts`,
  mirroring `expense-category.ts`'s exact pattern) carries only a
  translation key + optional icon, no `StatusTone`, while a separate
  `TEAM_MEMBER_STATUS_MAP` (mirroring `cash-session-status.ts`) owns
  active/inactive → success/neutral (§12/§14) — two roles were
  deliberately kept out of `TeamRole`'s literal union scope for now
  (`suspended`/`on_leave`), since UI-007D owns that state (§13).
  8 centralized synthetic fixtures (`features/team/mock-data.ts`) were
  chosen so no first/last name shares a fragment with any seeded
  patient (`features/patients/mock-data.ts`) — except the two
  explicitly-required practitioner identities (Youssef Benali, Amal
  Idrissi), which deliberately reuse Agenda's own established names/ids
  instead of inventing new ones, proven consistent by a dedicated
  fixture-integrity test (§16) rather than left to accidental
  agreement. `TeamPage` mirrors `PatientsPage`'s architecture line for
  line: search (name/employee number/phone/email — phone normalized via
  the existing `normalizePhoneDigits` from `features/patients/normalize.ts`,
  not a second implementation) composes with a role filter (built from
  only the roles actually present in the data, never a permanently
  empty option — §21) and a status filter, all reset together by
  "Effacer les filtres." No pagination was added — 8 synthetic members
  render fine as a single list, and Patients already having pagination
  was explicitly not treated as a reason to add it here (§25, a
  documented decision, not an omission). Desktop `TeamTable` + mobile
  `TeamCardList` reuse `PatientTable`/`PatientCardList`'s exact
  dual-render convention, including hiding Email/Date d'entrée before
  Contact/Role/Status/Actions on tablet (§29). `TeamMemberDetailPage`
  (Spec #9 Screen 34) renders only the "Profil" surface described by
  this task — no tab bar — since Planning/Congés/Paie/Documents/
  Permissions are Screen 34's own later tabs, explicitly owned by
  UI-007B through UI-007F. A bounded `TeamMemberFormDialog` (create/edit
  only — no duplicate detection, no contract/schedule/payroll/document
  fields) mirrors `PatientFormDialog`'s drawer/validate/submit shape and
  reuses `isValidEmail`/`isValidMoroccanPhone` from
  `features/patients/patient-form-validation.ts` unmodified; a new
  `generateEmployeeNumber` mirrors `generatePatientNumber`'s exact
  local-sequential-reference pattern, producing `EMP-####`. The same
  dialog is reachable both from the directory (row "Modifier" / "+
  Ajouter un membre") and from the profile page's own "Modifier"
  action; edits made from the profile page update only that page's own
  local state, not `/app/equipe`'s array — the same documented
  prototype limitation `PatientDetailPage` already has relative to
  `/app/patients` (UI-004A §7), not a new one. No avatar photo upload
  (§27 — initials-only `Avatar` reuse, no synthetic image assets
  exist), no employment-contract/schedule/shift/attendance/leave/
  payroll/bonus/commission/document-storage functionality anywhere, no
  backend integration (mock data only). All 646 frontend tests (598
  carried over through UI-006E + 48 net new — 6 fixture-integrity, 28
  directory/search/filter/create/edit, 12 profile/edit, 2 sidebar
  active-state), typecheck, lint and build pass on the first full-suite
  run; backend regression (10 tests, 26 assertions, clean) unaffected —
  no backend files touched. Manual review: DOM/SSR-level only (curl
  against the running dev server — `/app/equipe` and `/app/equipe/[id]`
  both 200, `dir="rtl"` present for the Arabic variant) — no
  browser-automation/screenshot tool was available in this environment.
- UI-007B — Employment Contracts, Roles & Work Schedules: evolves
  UI-007A's single-tab employee profile into an Employee 360° workspace.
  `TeamMemberHeader` (identity/status card) is extracted unchanged out
  of UI-007A's own former single-body `TeamMemberDetailPage` — a pure,
  behavior-preserving refactor (the existing UI-007A test suite for the
  Profil tab passes byte-for-byte unmodified, proving zero regression).
  New `TeamMemberNav` renders Profil/Contrat/Planning as real per-member
  links with `aria-current` — mirrors `PatientDetailPage`'s own
  explicit-`activeTab`-prop `Tabs` usage rather than `FinanceNav`'s
  `usePathname`-prefix-matching pattern, since `FinanceNav`'s approach
  only works for non-parameterized routes and this nav sits under a
  per-member `[id]`. Présence/Congés/Paie/Commissions (Screen 34's later
  tabs) are not shown at all — no route exists for them yet, and the
  task's own §7 explicit default is "otherwise show only currently
  implemented items," not disabled placeholders.
  `TeamMemberDetailPage` itself became a thin shell: header + nav, then
  one of three sibling content components switched on `activeTab` —
  `TeamMemberProfileContent` (UI-007A's own body, moved verbatim),
  `TeamMemberContractContent` and `TeamMemberScheduleContent` (both
  new). Two new domain routes: `/app/equipe/[id]/contract`,
  `/app/equipe/[id]/schedule`.
  `TeamMember` (UI-007A) is untouched — not one field added to it (§10).
  Two new, deliberately separate domain types instead
  (`components/domain/team/types.ts`): `EmploymentContract`
  (id/teamMemberId/contractNumber?/contractType/status/startDate/
  endDate?/jobTitle/weeklyHours?/notes?) and its two small enums.
  `ContractType` ("permanent"/"fixed_term"/"part_time"/"internship"/
  "other") — the domain-data spec only defines a free-text
  `employees.employment_type` column, no enum, so the task's own
  explicit suggested list is authoritative (CLAUDE.md §1); labeled
  "CDI"/"CDD" in French for permanent/fixed_term — the standard
  Francophone terms for those two contract shapes, not an invented
  Moroccan-specific legal category. `ContractStatus` stays to two
  values ("active"/"ended") — no `future`/`suspended`, nothing in scope
  requires them. Both get their own registry (`contract-type.ts`,
  `contract-status.ts`) mirroring `expense-category.ts`/`cash-session-
  status.ts`'s exact pattern; `ContractType`'s registry carries no
  `StatusTone` at all — a contract type is not a status (§13).
  `contractNumber` follows the task's own explicit §16 example format
  verbatim ("CTR-2025-0003", assigned to Meryem Bakkali/EMP-0003 in the
  fixtures, mirroring the task's own worked example person) — read-only
  once created, never part of the edit form's own shape. No
  remuneration field anywhere (§20) — `EmploymentContract` has no
  salary/rate/bonus/deduction property, grep- and test-confirmed
  (`mock-contracts-data.test.ts` asserts the properties don't exist on
  any fixture; `team-member-detail-page.test.tsx` asserts no
  "salaire"/"rémunération" text renders on the Contrat tab).
  `WorkInterval` mirrors Spec #4 §20.1's `employee_work_schedules` 1:1
  — one row per interval, several rows sharing the same `weekday`
  models a split shift, satisfying "multiple work intervals per day"
  (§7) without a separate list field; `active` is kept for shape-
  fidelity with the spec column but no UI in this task ever toggles it
  (same "kept but never reached by the UI" precedent as
  `PrescriptionStatus`'s `"cancelled"`, UI-005D) — an interval simply
  not existing already means "not working that day." `Weekday` is
  deliberately its own small abstract enum, not reused/derived from
  Agenda's date-based `formatWeekdayShort` (`features/agenda/format.ts`)
  — that formatter needs a concrete ISO date, and manufacturing a fake
  "reference week" purely to borrow day-name labels would be exactly
  the unwanted appointment-scheduling coupling the task's own §4
  explicitly warns against; a small standalone `team.weekday.*`
  translation set (FR/AR, 7 keys each) was added instead.
  `features/team/contracts.ts`: `getCurrentContract` — active first,
  else the most recently started historical contract, else `null` (§22,
  no contract-versioning UI); `isValidContractDateRange`/
  `isValidWeeklyHours` (0 < hours ≤ 60, optional). `features/team/
  schedule.ts`: `groupIntervalsByWeekday`/`computeWeeklyScheduledHours`
  (reuses `parseTimeToMinutes` from `features/agenda/format.ts` — a
  genuinely generic time-of-day primitive, not appointment-specific, so
  reusing it does not create the coupling §4 warns against) /
  `isValidWorkInterval`/`intervalsAreSequential` (no same-day overlap) /
  `buildInitialWorkWeekFormValues` + `buildIntervalsFromWorkWeekFormValues`
  (a round-trip pair: current intervals -> bounded per-weekday edit
  form state -> a full replacement interval set on submit — the editor
  is never a per-interval CRUD surface).
  7 centralized contract fixtures (`mock-contracts-data.ts`, every
  `teamMemberId` integrity-tested against real `TeamMember`s) cover all
  four required scenarios (§21 A-D): active open-ended (team-1/2/3/4),
  active fixed-end (team-5/8 — a fixed-term and an internship, both
  with a real future end date), ended historical (team-6), no contract
  at all (team-7 — reusing UI-007A's own "deliberately unlinked"
  outlier rather than introducing a new fixture just for this state).
  Work-interval fixtures (`mock-schedule-data.ts`) give team-1/2 (the
  two practitioners) a realistic split shift — morning + afternoon
  across a lunch break, plus a shorter Saturday morning — demonstrating
  §7 on a genuinely plausible cabinet pattern; team-3/4/5/8 each get a
  single interval per weekday (the simple case); team-6/7 deliberately
  have no intervals at all (the "no schedule" empty state, doubling as
  the same two members who already have no/ended contracts, rather than
  adding yet another fixture just to prove an empty state). Every
  scheduled member's own `computeWeeklyScheduledHours` output matches
  their own current contract's `weeklyHours` exactly — a dedicated
  integrity test (`mock-schedule-data.test.ts`) proves this rather than
  leaving it to accidental agreement between two independently-authored
  fixture files.
  Contract edit (`ContractFormDialog`) is edit-only — no "create a new
  contract" flow, matching the task's own §8 "contract edit prototype"
  (singular, editing the current one) rather than authoring contract
  history; mirrors `TeamMemberFormDialog`'s drawer/validate/submit
  shape. Work-schedule edit (`WorkScheduleFormDialog`) is a bounded
  per-weekday editor — a "Travaillé"/"Repos" `Select` per day (reusing
  the existing `Select` primitive rather than introducing a new
  Checkbox component the codebase doesn't have yet), and when worked,
  up to 2 time-range intervals with "+ Ajouter une plage"/"Retirer",
  validated for individual validity and same-day non-overlap. Submit
  always replaces the member's *entire* interval set, mirroring
  `CashCountDialog`'s own "one validated result object" shape (UI-006E)
  rather than field-by-field mutation.
  Every edit (Profil/Contrat/Planning) remains this page's own local
  state only — the same documented prototype limitation UI-007A's own
  profile edit and `PatientDetailPage` already have (UI-004A §7); no
  change here reaches `/app/equipe`'s own directory array.
  Test-collision fixes worth recording: `getByText("Réceptionniste")`
  was ambiguous once the Contrat tab renders both the header's own role
  label and the contract's own "Poste" value with the identical string
  — fixed via `{ selector: "dd" }`. A per-weekday form row could not be
  scoped via `.closest(".rounded-md")` because the `Select` primitive's
  own `<select>` element carries that exact utility class too (border-
  radius styling) and matched itself first — fixed via `.closest("div.p-3")`
  instead, a class token the `Select` never carries.
  All 706 frontend tests (646 carried over through UI-007A + 60 net
  new — 34 across 4 new pure-function/fixture-integrity files covering
  contracts.ts/schedule.ts/mock-contracts-data.ts/mock-schedule-data.ts,
  plus 26 new cases folded into `team-member-detail-page.test.tsx`'s own
  navigation/Contrat/Planning describe blocks), typecheck, lint and
  build pass on
  the first full-suite run after fixing the collisions above; backend
  regression (10 tests, 26 assertions, clean) unaffected — no backend
  files touched.
- UI-007CDEF — Complete HR Operations Prototype: Attendance, Leave,
  Payroll and Practitioner Commissions, executed as four sequential
  gates against one shared fixture universe — no contradictory
  duplicate mock data anywhere, verified by a dedicated
  `cross-hr-integrity.test.ts` that walks the full required chain
  (Contract → Schedule → Attendance → Payroll overtime, Leave →
  Attendance, Finance activity → Commission → Payroll) end to end for
  one real member (Dr. Benali).

  **Gate 1 — Attendance.** `AttendanceRecord`/`AttendanceStatus`
  (`components/domain/team/types.ts`) is a deliberate frontend-only
  prototype running ahead of the approved backend scope — recorded as
  `docs/implementation/DECISIONS.md` ADR-005 rather than silently
  resolved, since Spec #4 §20 ("No clock-in/out entity is required in
  V1") and Spec #3 §39/WF-36 ("No clock-in/out tracking") both describe
  the *backend* scope, not whether a non-persisted prototype screen may
  exist; nothing here creates a backend entity, API call, or persisted
  data. Only raw `checkIn?`/`checkOut?` are stored on the record —
  status, worked/late/early-departure/overtime minutes are always
  *derived* by `features/team/attendance.ts`'s pure functions against
  that member's own real `WorkInterval`s for the matching weekday
  (`getExpectedIntervalsForDate`), never a second hardcoded schedule.
  `computeWorkedMinutes` is gap-aware: for a split-shift day it
  subtracts only the *unpaid gap between* the two expected intervals
  from the raw check-in/check-out span, so it never naively computes
  "final minus first" and silently counts a lunch break as worked time
  (the task's own explicit warning, proven by a dedicated test showing
  the gap-aware result differs from the naive one). `resolveAttendanceStatus`
  returns `null` for a rest day (excluded from every count, never
  "not checked in") and distinguishes `not_checked_in` (today, no
  check-in yet) from `absent` (a past work day with none at all) via an
  `isPastDate` flag — approved leave is applied by the *caller* as
  contextual presentation ("En congé"), never folded into this enum
  (§13/§33). The cabinet workspace (`team-attendance-page.tsx`, at
  `/app/equipe/attendance`, reached from the Équipe directory's own
  header rather than a new sidebar entry, §66) buckets each member into
  exactly one of PRÉSENTS/EN RETARD/ABSENTS/NON POINTÉS
  (`resolveCabinetBucket`) — a late-then-completed day stays "En
  retard," never flips back to a generic "present," so the per-row
  badge never contradicts the summary counts above it. On its live
  default (`MOCK_BUSINESS_DATE`, a Sunday) it correctly shows a rest
  day for the entire cabinet — verified, honest behavior, not an
  omission — while a `businessDate` prop seam demonstrates every real
  state in tests. The per-employee Présence tab adds deterministic
  check-in/check-out actions (`MOCK_NOW_TIME`, reused from
  `features/agenda/mock-data.ts`, never `Date.now()`) and a restrained
  recent-history list. Fixtures (`mock-attendance-data.ts`) give
  Dr. Benali (split shift) and Meryem Bakkali (single interval) one
  on-time, one late, one early-departure and one overtime day each,
  plus one deliberate gap each proving the absent state — covering
  every real `AttendanceStatus` for both schedule shapes.

  **Gate 2 — Leave.** `LeaveRequest`/`LeaveBalance` with a bounded
  `LeaveType` (annual/sick/unpaid/other — this task's own explicit
  list, since the domain spec defines no leave-type enum) and
  `LeaveRequestStatus` (pending/approved/rejected, narrowed from Spec
  #4 §20.2's five-value backend ENUM). `computeLeaveDurationDays` is an
  inclusive calendar-day count with no invented weekend/holiday
  exclusion, matching the task's own "26-28 août = 3 jours" example
  exactly (verified by a direct test). The Congés tab combines Screen
  36's own staff ("Mes congés") and owner (Approve/Reject) views into
  one per-employee surface, since this prototype has no real
  multi-viewpoint role switching yet — documented as a deliberate
  consolidation, not a missing feature. `LeaveDecisionDialog` wraps the
  existing `ConfirmDialog` (mirrors `CloseConfirmDialog`, UI-006E) for
  both actions; a rejection reason is required, an approval needs none.
  `applyApprovedLeaveToBalance` moves the request's own duration from
  `available` to `used` only on approval (§35) — pending and rejected
  requests never touch either figure, each proven by a dedicated test.
  `doesApprovedLeaveCoverDate` is the Gate 1↔2 integration point: only
  a request with `status === "approved"` re-labels what would otherwise
  render as an unexplained absence/not-checked-in state as "En congé"
  (§33); a pending request covering the exact same date is proven, by a
  dedicated test, to leave the normal handling untouched (§34).
  Fixtures (`mock-leave-data.ts`) give Meryem Bakkali one request of
  each status — her approved one deliberately covers 2026-08-25, a date
  proven (by a fixture-integrity test) to be genuinely distinct from
  every Gate 1 attendance fixture date, so wiring leave into attendance
  never silently changed an already-tested Gate 1 result. Nawal Chaoui
  deliberately has none at all (empty-state demo).

  **Gate 3 — Payroll.** `PayrollPeriod`/`PayrollEntry`/`PayrollAdjustment`
  — an explicitly cabinet-*operational* payroll prototype; no statutory
  Moroccan tax/CNSS/AMO/IR line exists anywhere, grep- and
  test-confirmed (Spec #3 §42/WF-39 itself: "Statutory Moroccan
  payroll/tax/social compliance is not claimed without separate
  specification"). `PayrollPeriodStatus` is bounded to draft/finalized
  (narrower than Spec #4 §21.1's three-value backend ENUM — this task's
  own explicit two-value list takes priority, the same precedent
  UI-006E already set for `CashSessionStatus`); `PayrollEntryStatus`
  (unpaid/paid) is a distinct concept governing disbursement, not
  editability. `baseAmount` is a synthetic *payroll-specific*
  configuration value — never retroactively added to
  `EmploymentContract`, which UI-007B deliberately kept salary-free
  (§40). `overtimeMinutes` is duration-only and reconciles exactly
  against Gate 1's own real attendance overtime for the same
  member/period (`computePeriodOvertimeMinutes`, proven by a dedicated
  integrity test) — no monetary overtime rate/multiplier is invented
  anywhere, so `computeGrossPayable` never includes overtime money
  (proven by a test showing gross is unchanged regardless of
  `overtimeMinutes`). Bonuses/deductions are bounded adjustment lists,
  addable only while the period is `draft` — a `finalized` period shows
  a read-only notice and exposes no edit/delete action of any kind
  (§50). A read-only `PayslipDialog`'s own "Télécharger le bulletin"
  action shows this task's own exact future-feature notice
  ("La génération du bulletin PDF sera connectée au moteur documentaire
  ultérieurement."), never a real file. Meryem Bakkali's July entry
  (`mock-payroll-data.ts`) reproduces this task's own §47 worked
  example verbatim: 5 000 base + 300 bonus, no commission = 5 300 net —
  proven by a direct test, not just eyeballed.

  **Gate 4 — Commissions.** `CommissionRule`'s `basis` is fixed to
  `"collected_payments"` — the only basis the approved specifications
  actually demonstrate with a worked example (Spec #9 Screen 38's own
  "Base de calcul — Montants encaissés"; Spec #3 WF-40's own "Collected
  amount: 4 000 MAD × 30% = 1 200 MAD," reproduced verbatim by a direct
  test) — the other bases CLAUDE.md §28 lists (invoiced amount, fixed
  per service, ...) are not implemented since no approved
  wireframe/workflow demonstrates their exact rule (§54: "Do NOT invent
  the business basis"). `getEligibleCommissionActivity` derives every
  figure live from the *existing* `getPaymentsMockData()`/
  `getInvoicesMockData()` fixtures — posted payments only, allocated to
  an invoice genuinely attributed to this practitioner via
  `Invoice.practitionerName`, within the requested period — summing
  each payment's own *allocation* amount (never the whole payment) so a
  hypothetical multi-invoice payment could never be double-counted onto
  one practitioner (WF-40's own acceptance criterion, directly tested).
  `isCommissionEligible` requires both `role === "practitioner"` AND a
  real `practitionerId` link (§56) — Othmane Zouiten (`team-7`, a
  practitioner with no `practitionerId`, already UI-007A's own
  "deliberately unlinked" fixture) proves the distinction: no
  Commissions tab in `TeamMemberNav` (`showCommissions` prop), and
  direct route access shows a "Commissions non applicables" state
  rather than crashing or silently rendering empty (§62). Every
  activity row shows only patient identity, date, service description
  and amount — no clinical data of any kind, verified structurally by a
  test asserting the exact key set on every activity item (§60).
  `mock-commissions-data.ts` gives Dr. Benali (20%) and Dr. Amal (25%)
  active rules; a dedicated reconciliation test proves Dr. Benali's own
  `PayrollEntry.commissionAmount` for every period he has one equals
  Gate 4's own live `computeCommissionAmount` output exactly — never an
  independently hardcoded figure (§61).

  All 849 frontend tests (706 carried over through UI-007B + 143 net
  new), typecheck, lint and build pass on the first full-suite run
  after fixing one self-caught bug (the cabinet attendance page's
  per-row status badge originally used the raw 5-value
  `AttendanceStatus` instead of the same 4-bucket categorization as its
  own summary counts, so a late-then-completed day showed "Terminé" in
  its own row while being counted under "En retard" above — fixed by
  reusing `resolveCabinetBucket` for the row badge too) and one
  test-authoring bug (several money-amount literals in
  `team-member-detail-page.test.tsx`'s new Payroll/Commissions describe
  blocks were typed with a stray U+00A0 no-break space instead of a
  regular space, causing `getByText` to fail exact-match against the
  DOM's own narrow-no-break-space-normalized grouping separator even
  though the underlying values were already correct — found by
  isolating the exact byte sequence with a throwaway debug assertion,
  fixed by a byte-level `sed` replacement across the file, confirmed
  absent from every other file touched this task). Backend regression
  (10 tests, 26 assertions, clean) unaffected — no backend files
  touched.

- UI-008ABCD — Pharmacie & Stock: Catalog, Stock Parameters, Lots &
  Expiration, Movements & Alerts. Replaces the generic Stock placeholder
  with a real healthcare inventory prototype at `/app/stock`
  (Vue d'ensemble/Articles/Mouvements/Lots & expirations, `StockNav`
  mirroring `FinanceNav`'s exact `usePathname`-prefix pattern), executed
  as four sequential gates against one shared 24-item fixture universe —
  no contradictory duplicate mock data anywhere, verified by a dedicated
  `cross-inventory-integrity.test.ts`. The sidebar label changes from
  "Stock" to "Pharmacie & Stock" (`nav.stock`) — this module covers
  every category of cabinet medical/operational stock, not only
  medicines.

  **Domain-wide discipline.** `InventoryItem`/`InventoryLot`/
  `StockMovement` (`components/domain/stock/types.ts`) deliberately
  store **no balance field anywhere** — every item and lot balance is
  derived live from `StockMovement[]` (`computeItemStockBalance`,
  `computeLotBalance`), the exact "derive, don't duplicate" discipline
  already applied to Caisse's expected balance and Attendance's worked
  minutes. For a lot-tracked item, the sum of every one of its own
  lots' own balances always equals the item's own total, proven by a
  dedicated cross-check rather than assumed. A single 10-value
  `category` taxonomy (medical_consumables/medicines/procedure_products/
  diagnostic_consumables/sterilization_infection_control/ppe/
  disposable_medical_devices/patient_aftercare/emergency_stock/
  operational_stock) doubles as the item-type axis the task's own §14
  proposed separately — a second, near-1:1 parallel taxonomy was judged
  unnecessary duplication rather than a genuinely distinct concept, per
  that same section's own "avoid unnecessary complexity" caution.
  `expirationTracking` is only ever `true` alongside `lotTracking`
  (`isValidItemTrackingFlags`), since expiration dates live on lots, not
  items (Spec #2 §37) — enforced by both fixture-integrity and form
  validation.

  **Gate 1 — Catalog & Stock Parameters.** `StockPolicy` layers optional
  `safetyStock`/`reorderPoint`/`maximumStock`/`reorderQuantity`/
  `leadTimeDays` planning metadata on top of the approved schema's
  mandatory `minimumStock` (Spec #4 §23.1 defines only that one field) —
  a deliberate, non-persisted, product-owner-requested enrichment rather
  than a silent contradiction of the approved domain model, recorded as
  `docs/implementation/DECISIONS.md` ADR-006. `resolveStockAttentionStatus`
  buckets worst-to-best (out_of_stock → critical → low → reorder →
  available), gracefully skipping the `critical`/`reorder` tiers when an
  item configures no `safetyStock`/`reorderPoint`, and reproduces the
  task's own worked example exactly: Compresses stériles 10×10
  (`item-02`) at balance 18, minimum 25, safety 15, reorder 30 resolves
  "Stock faible," not "Critique" or "À commander" — verified by a direct
  test, not eyeballed. The Articles catalog (`/app/stock/items`) offers
  search (name/reference) plus bounded category/status filters,
  desktop table + mobile card dual-render mirroring
  `GlobalInvoiceTable`/`GlobalInvoiceCardList`'s exact convention, and a
  bounded Add-article dialog (`ItemFormDialog`, `STK-####` generated
  reference). Editing an existing article lives on its own Item 360°
  detail page (`/app/stock/items/[id]`, mirroring `TeamMemberDetailPage`'s
  header-then-tabs-then-switched-content shell) rather than the list —
  the same edit-on-detail convention Team already established.

  **Gate 2 — Lots & Expiration.** `resolveLotExpiryStatus`
  (expired/expiring_soon/valid) uses a 30-day warning horizon
  (`EXPIRY_WARNING_HORIZON_DAYS`), an explicit documented default since
  Spec #3's own open-questions list leaves "Expiration warning horizon"
  unresolved (ADR-006) — every consumer (item Lots tab, cabinet Lots
  workspace, dashboard KPI/alerts) derives from that one shared
  constant, never a second independent threshold. The read-only Lots &
  Expirations workspace (`/app/stock/lots`, cabinet-wide, worst-expiry-
  first, search by lot number/article name) and each item's own Lots
  tab are both purely derived views — lots are never created here, only
  through Stock IN (Gate 3). Fixtures deliberately include a lot that
  has since expired but still holds remaining quantity
  (`item-13`/`lot-13-1`, 5 units, expired) alongside a second, healthy
  lot on the same item (`lot-13-2`, 35 units) — proving an expired lot
  stays flagged even when the item overall looks comfortably above its
  minimum, a real WF-48 scenario a stock-level alert alone would never
  surface. A multi-lot item (`item-12`) proves lot-balance aggregation
  across two lots; a fully depleted expired lot (`item-07`/`lot-07-1`,
  balance 0) proves the browsing list still shows historical lots while
  the narrower dashboard alert subset correctly excludes it (nothing
  actionable remains).

  **Gate 3 — Stock Movements.** One shared `StockMovementFormDialog`
  serves Stock IN/OUT/Adjustment (bounded reason vocabulary per type via
  `REASON_OPTIONS_BY_MOVEMENT_TYPE` — an IN can never be reasoned
  "used_for_care," an OUT can never be "stock_received"). Negative stock
  is disallowed outright (`wouldCauseNegativeItemBalance`/
  `wouldCauseNegativeLotBalance`, ADR-006): an OUT or a negative
  adjustment that would drive the item's or the selected lot's own real
  balance below zero is blocked before submit with an explicit error,
  never silently clamped to zero. A Stock IN on a lot-tracked item can
  either select an existing lot or create a brand-new one inline
  (number, plus expiration date when the item tracks it); a Stock
  OUT/Adjustment must select an existing lot with remaining balance —
  the dialog's own lot dropdown excludes any lot already at zero.
  Movement history (`buildMovementHistory`) shows a running balance by
  chronologically replaying an item's own movements and reversing for
  display — its own most-recent balance always reconciles exactly with
  `computeItemStockBalance`, proven directly. The cabinet-wide
  `/app/stock/movements` workspace starts with an article selector, then
  reuses the exact same `ItemMovementsContent` component the item's own
  Mouvements tab uses — no duplicate movement-table implementation
  anywhere. Fixtures exercise every one of the nine `StockMovementReason`
  values and both `adjustment` directions at least once.

  **Gate 4 — Dashboard & Alerts.** `/app/stock` shows the exact three
  KPIs Spec #2 §42.5 defines — low-stock items (out_of_stock/critical/
  low, excluding the softer "reorder" tier), expiring lots (reusing
  Gate 2's own `getExpiryAttentionLots` count directly, never a second
  derivation), and stock movement volume (movements within the last 30
  days, the same rolling window as the expiry horizon) — plus worst-
  first attention lists for both stock and expiry, each linking through
  to the relevant item. Every dashboard figure reconciles exactly with
  the same pure functions Gates 1-3 already built, proven by
  `cross-inventory-integrity.test.ts` rather than merely assumed.
  `StockNav` gains its final "Vue d'ensemble" tab now that the dashboard
  route exists, completing the four-tab workspace nav.

  No procurement/purchase-order vocabulary anywhere (Spec #7 §24: "Do
  not introduce purchasing/procurement vocabulary" — grep-confirmed, no
  supplier/bon-de-commande/achat concept exists), no pricing/cost field
  (this domain is quantity-based only, CLAUDE.md §30), no
  LocalStorage/global persistence, no API calls, no authentication.
  161 net new tests (1010 total, up from the UI-007CDEF baseline of
  849), typecheck, lint and build pass on the first full-suite run
  after fixing several self-caught issues while authoring targeted
  component tests (required-field labels render a trailing " *," so
  `getByLabelText("Nom")` needed `getByLabelText("Nom *")` — the same
  established convention already used by Team's own tests; a couple of
  ambiguous `getByText` matches where a value legitimately appears twice
  on one page, resolved with `getAllByText`/scoped `within()` queries;
  and one genuinely wrong test assumption, corrected rather than the
  underlying code, once the fixtures showed the cabinet Lots &
  Expirations page is deliberately the *full* browsing list including
  depleted lots, distinct from the dashboard's narrower actionable-alert
  subset). Backend regression (10 tests, 26 assertions, clean)
  unaffected — no backend files touched.

- UI-009ABC — Communication Center: Message History, Templates &
  Automation Rules, Communication Dashboard. Replaces the generic
  Communication placeholder with a real cabinet communication prototype
  at `/app/communication` (Vue d'ensemble/Messages/Modèles/
  Automatisations, `CommunicationNav` mirroring `StockNav`'s exact
  one-tab-per-gate growth history), executed as three sequential gates
  against one shared 14-message/10-template/7-rule fixture universe —
  no contradictory duplicate mock data anywhere, verified by
  `cross-communication-integrity.test.ts`. `nav.communication` already
  read "Communication" — no sidebar rename needed this time.

  **Domain-wide discipline.** `CommunicationMessage`
  (`components/domain/communication/types.ts`) mirrors Spec #4 §24.2's
  `communication_messages` row field-for-field, including its own
  `queued`/`sent`/`delivered`/`failed` status ENUM — the task's own
  model only hedged "pending" as a "Potential" label and explicitly
  deferred to "the approved workflow," which the spec names as
  `queued`. The type deliberately carries **no `direction` field**:
  the spec's own schema has none, every field it does define
  (`recipient`/`resolved_body`/`template_id`) is inherently
  outbound-shaped, and the task itself warns not to invent inbound
  WhatsApp conversation management when V1 only needs outbound
  operational communication — recorded as `docs/implementation/DECISIONS.md`
  ADR-007. Every `patientId`/`appointmentId`/`invoiceId`/`installmentId`
  is a soft reference resolved at render time against the *existing*
  Patients/Agenda/Invoices fixtures — never a duplicate universe
  (CLAUDE.md §12). A pre-existing, already-documented split matters
  here: Patients' own `Patient[]` and Agenda's separately-seeded
  `AgendaAppointment[]` only agree on identity for `{pat-1..pat-5}`
  (Ahmed/Sara/Fatima/Youssef/Karim); every fixture message pairing a
  `patientId` with an `appointmentId` stays inside that safe range,
  never crossing into the two fixture sets' diverging names beyond it.

  **Gate 1 — Message History.** `CommunicationPurpose` (11 values, the
  union of Spec #2 §39.1's template categories) drives the message
  history table's "Type" column and doubles as `MessageTemplate.purpose`
  in Gate 2 — one shared bounded vocabulary, never two independently
  drifting ones. The Messages workspace (`/app/communication/messages`)
  offers search (patient name/number/recipient phone, reusing the
  existing `normalizePhoneDigits` helper) plus Canal/Statut filters —
  matching Spec #9 Screen 41's own wireframe exactly, deliberately
  *not* adding the task's own hedged, optional "Type" filter the spec
  wireframe itself omits. Selecting a row opens a read-only detail
  drawer (`Dialog variant="drawer"`, mirroring `PaymentDetailDrawer`'s
  exact shape) showing channel/recipient/timestamps/body plus real
  navigation into the patient's *existing* appointments/invoices tabs
  and Patient 360° — never a duplicate view of any of them. 14
  centralized synthetic messages demonstrate every status, both
  channels, and every purpose category the task's own §13 names,
  cross-linked to real `pat-1`/`pat-4`/`pat-9` invoices and real
  `apt-2`/`apt-4`/`apt-5`/`apt-6`/`apt-7`/`apt-14` appointments.

  **Gate 2 — Templates & Automation Rules.** `renderTemplate`
  (`features/communication/templates.ts`) is a pure substitution
  function over a strict 10-key variable allowlist (the union of the
  task's own §26 list and Spec #2 §39.2's) — no `eval`, no
  `dangerouslySetInnerHTML`, no arbitrary expression evaluation. A
  known variable missing its context value renders a deterministic "—"
  placeholder rather than an empty string that could misread as real
  (but blank) content; an unrecognized `{{token}}` is left exactly as
  written, never interpreted. `MessageTemplate.variables` is *derived*
  from `body` (`extractVariablesFromBody`), never independently
  authored, so a template's declared variables can never drift from
  what its own body actually references. The Templates workspace
  (`/app/communication/templates`) reproduces Spec #9 Screen 42's
  editor exactly — Nom/Canal/Langue/Message, a clickable VARIABLES
  reference list, and a live APERÇU rendered against a fixed sample
  context — alongside a card-based list (Name/Channel/Locale/Active,
  `[Modifier]`); the edit dialog is keyed by template id so switching
  the edit target between rows always remounts with fresh form state
  rather than leaking the previous target's values (a real bug caught
  and fixed while writing the edit-flow test). `AutomationRule` (7
  fixed canonical `CommunicationEventType`s, one per Spec #2 §40's own
  V1 rule list) exposes only an active/inactive toggle per row — the
  literal reading of §40's own closing line ("Owner can configure
  whether each automation is active"), deliberately not a rule builder
  that creates/deletes arbitrary event types (CLAUDE.md §3). 10
  centralized template fixtures include an Arabic one (`tpl-3`,
  reproducing Screen 42's own "تذكير بالموعد" / WhatsApp / AR example
  verbatim) and one deliberately inactive template (`tpl-8`) whose sole
  referencing automation rule is also inactive — proven coherent by a
  dedicated integrity test rather than assumed.

  **Gate 3 — Communication Dashboard & Operational Actions.**
  `/app/communication` shows three KPIs — failed messages, queued
  messages, and a 7-day send/deliver volume window
  (`MESSAGE_VOLUME_WINDOW_DAYS`, an explicit prototype default distinct
  from Stock's own 30-day window since patient messaging runs at
  daily/hourly cadence, not weekly — ADR-007) — plus Failed/Pending
  operational-attention sections, every figure reconciling exactly with
  `cross-communication-integrity.test.ts`. Retry becomes operational
  here on two surfaces sharing one pure function
  (`retryMessage`): the dashboard's own inline Failed-section button,
  and the Gate 1 detail drawer's own retry button, deliberately left
  dormant (no `onRetry` handler passed) until this gate. Retrying
  re-queues a failed message and clears its failure metadata — it
  never fabricates a successful "sent"/"delivered" outcome, since no
  real provider acknowledgment exists in this prototype (§12, ADR-007).
  The bounded Send Message dialog composes exactly one message to one
  existing patient via the existing searchable `Combobox` primitive;
  selecting an active template renders its body against the *real*
  selected patient's own identity/practitioner fields, while
  appointment/invoice-specific tokens correctly render "—" since this
  compose flow has no appointment/invoice picker (never a fabricated
  value). Submitting records a synchronous local `"sent"` message —
  never `"delivered"` — updating only local page state, no persistence.

  No real WhatsApp/SMS provider, no Meta/Twilio/provider integration,
  no message delivery network calls, no queues, no webhooks, no
  Laravel integration, no database changes, no AI-generated patient
  messaging, no marketing campaigns, no bulk/unsolicited messaging, no
  LocalStorage/global persistence, no API calls. 134 net new tests
  (1144 total, up from the UI-008ABCD baseline of 1010), typecheck,
  lint and build pass on the first full-suite run after fixing several
  self-caught issues while authoring targeted tests (several template
  names were initially identical to their own purpose label, making
  list rows ambiguous — renamed to distinct names; the edit-dialog
  remount bug above; a destructuring mistake in the cross-integrity
  test itself — `retryMessage` returns the *whole* array, not just the
  retried message — caught by the test's own failure, not silently
  passed). Backend regression (10 tests, 26 assertions, clean)
  unaffected — no backend files touched.

- UI-010ABC — Reports & Cabinet Configuration: Reports, Cabinet Settings,
  Services & Operational Configuration. Replaces the generic Rapports and
  Paramètres placeholders with `/app/rapports` (Vue d'ensemble/Activité/
  Finance/Équipe/Stock, `ReportsNav`) and `/app/parametres` (Cabinet/
  Services & tarifs/Horaires/Numérotation, `ParametresNav`), executed as
  three sequential gates. The task's own central rule — "Reports MUST
  derive from existing domain fixtures. Do NOT create an independent
  fake reporting universe" — is enforced structurally: every KPI is
  computed by a pure function that reuses an *already-shipped* module's
  own calculation (`computeFinanceKpis` from UI-006A, `buildItemRows`/
  `getExpiryAttentionLots` from UI-008ABCD, `computeAttendance`/
  `computePeriodOvertimeMinutes` from UI-007CDEF) — there is no
  `mock-report-data.ts` anywhere in this task. Proven end to end by
  `cross-reporting-integrity.test.ts` and
  `cross-configuration-integrity.test.ts`.

  **Gate 1 — Reports.** The Overview (`/app/rapports`) reproduces the
  task's own exact wireframe: four category blocks (Activité/Finance/
  Équipe/Stock), each exactly three MetricCards, under one period
  selector defaulting to "Ce mois" — reusing Finance's own
  `PeriodSelector`/`getPeriodRange`/`FinancePeriod` (UI-006A) rather than
  building a second period-toggle component. `StockReportKpis`
  deliberately partitions Stock's own combined `lowStockItemsCount` into
  `outOfStockCount` (out_of_stock only) and `lowStockCount` (critical +
  low) to match the wireframe's own two-number ask — a different
  grouping of the exact same attention rows `computeStockKpis` already
  reads, never a second balance derivation (ADR-008). The Activité and
  Finance detail pages each add one bounded table beyond their own KPI
  row: a "Performance par praticien" table (Spec #3 WF-72: appointments/
  completed/no-shows/collected per practitioner, joined by
  `practitionerName` — the one field both `AgendaAppointment` and
  `Invoice` reliably share) and a "Répartition par statut" breakdown.
  Deliberately **not implemented**: an invented "confirmation rate" KPI
  (Spec #2 §42.1 names the label with no defined formula anywhere in the
  approved specifications) and a "revenue by service" breakdown (Spec #2
  §42.2; `Invoice` has no service/service-id field, so a join to
  Agenda's `SERVICES` catalog would require an unreliable free-text
  match) — both recorded in ADR-008 rather than silently guessed. A new
  `APPOINTMENT_STATUS_ORDER` export was added to the existing
  `appointment-status.ts` map (additive only, mirrors
  `STOCK_ATTENTION_STATUS_ORDER`'s established pattern) — no other
  module's file was touched. 60 targeted tests.

  **Gate 2 — Cabinet Settings.** New bounded domain
  (`components/domain/settings/types.ts`): `CabinetProfile` narrows Spec
  #4 §5.1's `tenants` schema — no `slug` (public booking routing is a
  separate, unbuilt backend concern), no `logo_file_id` (the settings
  form shows a read-only "à venir" placeholder rather than building a
  fake upload flow with no real object storage behind it).
  `currencyCode`/`timezone` are fixed and excluded from the editable
  form entirely — Spec #2 §44 itself says "Currency fixed to MAD
  initially," and no timezone picker UX is defined anywhere in the
  approved specifications. `/app/parametres` is a single-record view/
  edit toggle, not a list-plus-dialog pattern (there is exactly one
  cabinet profile) — reuses the existing `isValidEmail`/
  `isValidMoroccanPhone` validators (UI-003B) rather than a second,
  possibly-diverging pattern. Edits are local component state only, and
  deliberately do **not** propagate to `topbar.practiceName` elsewhere
  in the app — no global store exists in this prototype, the same
  local-state-only boundary every prior UI-00X edit flow already has.
  16 targeted tests.

  **Gate 3 — Operational Configuration.** `CabinetService.name` seeds
  verbatim from Agenda's own pre-existing `SERVICES` string array
  (task's own repository-inspection guidance: "provide them a coherent
  configuration home") enriched with `durationMinutes`/`price`/
  `schedulingMode` (reusing `AppointmentSchedulingType` verbatim — the
  same exact/window vocabulary, never a second near-identical enum).
  `/app/parametres/services` reuses `TemplateFormDialog`'s own
  two-instance-dialog-plus-`key`-remount pattern for Add/Edit
  (UI-009ABC's documented stale-`useState` fix, applied preemptively
  here rather than rediscovered). `CabinetWorkingHoursDay`
  (`/app/parametres/horaires`) is deliberately cabinet-level only, never
  per-practitioner — Spec #4 §12 only defines `practitioner_working_hours`
  (no cabinet-wide table exists), and Spec #2 §46's own prose leaves the
  practice-vs-practitioner-hours distinction unresolved for a
  multi-practitioner cabinet (ADR-008); `weekday` reuses Team's own
  `Weekday`/`WEEKDAY_ORDER` verbatim, never a second weekday sequence.
  `/app/parametres/numerotation` is deliberately **read-only**:
  concurrency-safe sequence allocation ("lock sequence row during
  allocation," Spec #4 §59) is a real backend/database guarantee this
  frontend prototype cannot provide, so showing an editable form would
  misrepresent it (ADR-008); PAT/EMP rows reuse
  `generatePatientNumber`/`generateEmployeeNumber` verbatim, and FAC/REC
  apply the identical regex-extract-max+1 pattern locally since no
  existing generator covers them. Appointment operational parameters
  (buffer time, booking-advance window, cancellation policy) were
  searched for across all approved specifications and are simply not
  defined anywhere beyond what Services & Pricing's own
  `durationMinutes`/`schedulingMode` already cover — not implemented,
  per CLAUDE.md §3/§50. 42 targeted tests.

  No Laravel integration, no API calls, no database changes, no
  persistence, no accounting engine, no analytics warehouse, no payment
  gateway, no production document generation, no fake file-upload flow.
  123 net new tests (1267 total, up from the UI-009ABC baseline of
  1144), typecheck, lint and build pass on the first full-suite run.
  Backend regression (10 tests, 26 assertions, clean) unaffected — no
  backend files touched.

- UI-010BC — Cabinet Settings & Operational Configuration: Rendez-vous,
  Paiements, Documents. Completes the Paramètres IA list left open by
  UI-010ABC (`ParametresNav` extended from 4 to 7 tabs, in order: Cabinet/
  Services & tarifs/Horaires/Rendez-vous/Paiements/Numérotation/
  Documents). **Gate 1 — Cabinet Settings** required no code change:
  Spec #4 §5.1 (`tenants`) and Spec #2 §44 define only a single `address`/
  `city` pair — no `legalName`, split address, `postalCode`, `country`, or
  structured `logoMetadata` field exists anywhere in the approved domain
  model, so the already-shipped `CabinetProfile`/`CabinetSettingsPage`
  satisfy the spec exactly; the task's own conceptual field list is
  illustrative, not literal ("Use specification fields where different"),
  recorded as ADR-009 §1. **Gate 2 — Operational Configuration** adds
  three new sections (Services/Horaires/Numérotation preserved unchanged):
  Rendez-vous (`/app/parametres/rendez-vous`) is a single-record view/edit
  toggle bounded to `defaultSchedulingMode`/`defaultDurationMinutes` — the
  only two concerns Spec #2 §46 actually names — with no public-booking
  toggle, since `/book` remains a documented visual placeholder with no
  real request-submission flow (ADR-009 §3). Paiements
  (`/app/parametres/paiements`) is a **read-only** one-row table reusing
  Finance's own `PaymentMethod` type verbatim (typed as exactly `"cash"`,
  per that type's own doc comment citing CLAUDE.md §23) rather than an
  editable card/virement/chèque toggle list Finance cannot actually
  process (ADR-009 §2). Documents (`/app/parametres/documents`) is a
  single-record view/edit toggle for footer text/header note/document
  language — deliberately omits invoice/prescription template selection
  (no real document-rendering system exists, task's own explicit "NO
  production document generation") and tax display (`Invoice` carries no
  tax field at all); `footerText`/`documentLanguage` derive by default
  from the same Cabinet profile fixture (`buildDefaultDocumentFooter`),
  never an independently invented example string (ADR-009 §4).
  `cross-configuration-integrity.test.ts` gains 3 new reconciliation
  checks proving the Rendez-vous default mode matches Services' own
  majority scheduling mode, the Paiements row matches Finance's own
  payment fixtures' `method`, and the Documents footer derives live from
  the Cabinet profile fixture.

  No Laravel integration, no API calls, no database changes, no
  LocalStorage, no persistence, no accounting engine, no payment gateway,
  no production document generation. 33 net new tests (1300 total, up
  from the UI-010ABC baseline of 1267), typecheck, lint and build pass on
  the first full-suite run. Backend regression (10 tests, 26 assertions,
  clean) unaffected — no backend files touched.

- UI-011ABC — Subscription Lifecycle, Plans/Entitlements & Referral
  Program. Replaces the generic catch-all placeholder at `/app/abonnement`
  (already a real sidebar entry) with the full SaaS-commercial module —
  Abonnement/Plans/Parrainage, `SubscriptionNav` (never added to the
  global sidebar, per the task's own explicit rule). New domain layers
  `components/domain/subscription/` and `components/domain/referral/`,
  deliberately separate from `domain/settings/` — Subscription is the
  commercial platform-tenant relationship, not cabinet configuration.
  Every commercial figure either traces to the approved specifications or
  is deliberately left undefined rather than invented (ADR-010): only two
  plans exist (Solo/Cabinet, no invented "Cabinet+" tier), Cabinet's
  practitioner/staff limits (3/5) reproduce Spec #9 Screen 47's own
  worked example verbatim, every `PlanPrice.amount` is `undefined`
  (Spec #2 §50 explicitly defers pricing to "market validation"), and
  storage carries no limit at all (Screen 47's own literal "...").

  **Gate 1 — Subscription Lifecycle.** All 6 approved statuses
  (`trialing/active/expired/grace/blackout/cancelled`, CLAUDE.md §11)
  built from one base fixture plus `addDaysIso` offsets — never
  independently typed dates — so the grace fixture's own
  `graceEndsAt = currentPeriodEnd + 3 days` is provably consistent with
  the spec's own 3-day grace constant, not coincidental. The default
  Active/Cabinet fixture reproduces Screen 47's exact renewal date
  ("23 septembre 2026," exactly one month after `MOCK_BUSINESS_DATE`). No
  trial *duration* is ever stated anywhere — only a real `trialEndsAt`
  date and a live-computed days-remaining figure. Blackout renders
  Screen 49's own full takeover (no header/nav/usage/history) as a
  page-scoped presentational state only; the global sidebar is
  untouched — real access blocking is the future backend's job
  (WF-56: "Backend must block APIs, not only frontend navigation").
  "Renouveler" opens a purely informational dialog and never mutates
  subscription state — no fake payment anywhere. Usage rows are derived
  live from Équipe's own real `TeamMember` fixtures (2 active
  practitioners, 4 active staff), never independently hardcoded.

  **Gate 2 — Plans & Entitlements.** Centralized `hasEntitlement`/
  `getEntitlementLimit`/`getUsageState` resolvers — no component compares
  a plan code/name string directly anywhere. The Plans comparison shows
  "À définir" for price rather than an invented MAD figure. The Feature-
  Lock UX pattern (`EntitlementLimitNotice`) has one genuine, non-
  fabricated case: Solo's real 1-practitioner limit against the real
  fixture's 2 active practitioners blocks that selection with an
  explanatory message — WF-74's own scenario, using real derived data.

  **Gate 3 — Referral.** `Referral`/`ReferralReward` implement all 6
  approved statuses and the one approved reward type
  (`free_subscription_time`, always exactly 1 month — Spec #2 §51.2/
  WF-59's own "+1 free subscription month," never a cash/discount
  reward). Code/link derive deterministically from the Cabinet profile
  fixture (`app.ma/r/{code}`, the wireframe's own format, never a real
  domain); Copy uses the real Clipboard API with a toast confirmation.
  A qualified referral's "+1 mois" is composed from a real, matching
  *applied* reward — never an invented 7th status label.

  `cross-subscription-integrity.test.ts` proves the full chain end to
  end: Subscription→Plan→Entitlements→Usage reconciles, and
  Referral→Qualification→Reward→Subscription-benefit reconciles (the
  history event's month count and date always equal the real reward's
  own fields, never independently duplicated).

  No Stripe/payment-gateway integration, no real checkout, no Laravel/API
  calls, no database changes, no LocalStorage/global persistence, no real
  subscription enforcement, no coupon engine, no affiliate payout system.
  92 net new tests (1392 total, up from the UI-010BC baseline of 1300),
  typecheck, lint and build pass on the first full-suite run. Backend
  regression (10 tests, 26 assertions, clean) unaffected — no backend
  files touched.

- UI-011X — Access Governance, Roles, Permissions & Delegation of
  Authority. Adds "Accès & permissions" as `ParametresNav`'s 8th tab,
  `/app/parametres/access` (Utilisateurs/Rôles/Permissions/Délégations/
  Historique via its own nested `AccessGovernanceNav`, never added to
  the global sidebar). New domain layer `components/domain/access/`,
  deliberately distinct from `TeamMember` (a person employed by the
  cabinet — may exist with no `UserAccount`), `PlanEntitlement`
  (tenant-purchased capability, never per-user), and real authentication
  (no password/MFA/session fields anywhere). The permission catalog's 16
  core keys are copied verbatim from two independently-confirming
  sources — Spec #4 §4.3 `membership_permissions` and CLAUDE.md §9's
  identical list — rather than the task's own deeper suggested scheme;
  Screen 35's own single "CAISSE [x] Accéder" checkbox confirms the
  coarser grain directly (ADR-011).

  **Gate 1 — Roles & Permissions.** 23 permission keys across 14
  domains; sensitivity (normal/sensitive/critical) is UI-warning-only,
  never enforcement. Exactly the 3 V1 conceptual roles Spec #2 §29.1
  defines — Owner/Admin holds every permission; Practitioner defaults to
  agenda + own clinical + admin-patient-view + reports; Receptionist/
  Staff defaults to admin-patient + appointments only, since "clinical
  access should not be casually enabled." Rôles is a stacked, editable
  domain-grouped checklist per role; Permissions is the read-only
  catalog reference.

  **Gate 2 — User Access.** `UserAccount`/`TenantMembership` link to 5
  of 8 real Équipe fixtures — 3 deliberately have none, demonstrating
  "a TeamMember may exist without a UserAccount." Meryem Bakkali's own
  membership reproduces Screen 35's worked example exactly (role
  defaults + 2 individual grants + 1 restriction). The effective-access
  resolver (Role ∪ Grants ∪ Delegations minus Restrictions, restrictions
  always winning) was built here as Gate 3/4's own prerequisite. The
  Utilisateurs table reproduces Screen 46's own Nom/Profil/Statut/Accès
  columns; "Gérer les accès" uses one unified per-permission toggle
  (never two independent grant/restrict checkboxes) provably maintaining
  the invariant that a restriction only ever names a role-granted key.

  **Gate 3 — Delegation.** Has zero backing in the approved
  specifications (grep-confirmed across all 10 spec files) — implemented
  because the task's own Gate 3 instructions are explicit (CLAUDE.md §1:
  task instructions outrank specs), kept minimal (one permission per
  delegation) and grounded in the closest real precedent, Spec #4 §7.3's
  dormant `patient_access_grants`. All 4 lifecycle states derive live
  from dates; revocation always wins even mid-window. `caisse.manage`/
  `subscription.manage`/every `access.*` permission is never delegatable
  (physical-custody, WF-74, and privilege-escalation reasoning
  respectively). Creating a delegation validates both the catalog's own
  `delegatable` flag and that the delegator *currently* effectively
  holds the permission — nobody can delegate authority they lack.

  **Gate 4 — Effective Access & Audit.** A compact "what does this
  person actually have, and why" summary sits inside the same drawer,
  reading the identical resolver result the checklist already shows —
  never a second computation. The audit history is a bounded, static,
  read-only fixture where every event traces to a fact the current
  fixture state still holds (never a fabricated log line).
  `cross-governance-integrity.test.ts` proves the full chain end to end.

  No Laravel authorization, no authentication implementation, no
  security claims, no database, no API, no real enforcement across
  existing modules, no LocalStorage/global persistence. 124 net new
  tests (1516 total, up from the UI-011ABC baseline of 1392), typecheck,
  lint and build pass on the first full-suite run. Backend regression
  (10 tests, 26 assertions, clean) unaffected — no backend files
  touched.

- UI-011X-FIX — restore Paramètres navigation hierarchy for Access
  Governance (regression repair, no new functionality). All 5 Access
  feature pages rendered only `AccessGovernanceNav`, silently dropping
  `ParametresNav` — even though `ParametresNav` itself already carried
  its correct 8th "Accès & permissions" tab since UI-011X. Fix: render
  `ParametresNav` immediately above `AccessGovernanceNav` on each of the
  5 pages, restoring the intended three-level hierarchy (main sidebar →
  `ParametresNav`, "Accès & permissions" active → `AccessGovernanceNav`,
  its own tab active) without touching any pre-existing Settings route
  or Access Governance functionality. New `parametres-access-hierarchy.
  test.tsx` (22 targeted tests) proves both nav levels render together
  on every Access route, the 7 pre-existing `ParametresNav` hrefs are
  unchanged, `AccessGovernanceNav` never leaks onto a non-Access
  Settings route, and active-state resolves correctly at both levels
  under both FR and AR/RTL. 22 net new tests (1538 total, up from the
  UI-011X baseline of 1516), typecheck, lint and build pass. Backend
  regression (10 tests, 26 assertions, clean) unaffected — no backend
  files touched.

- UI-FIX — Dead Buttons & Interactive Actions Audit. The topbar's "+
  Créer" (`AppTopbar`) had no `onClick`/`href` at all. Fixed by adding a
  `QuickCreateDialog` (reuses the existing `Dialog` primitive) listing 5
  of the specs' 6 recommended quick-create actions — Rendez-vous/
  Patient/Mouvement de stock/Message/Décaissement — each a pure
  navigation `Link` into that action's own already-built creation
  workflow (`/app/agenda`, `/app/patients`, `/app/stock/movements`,
  `/app/communication`, `/app/finance/expenses`), never a duplicate
  form. "Nouvelle facture"/"Nouvel encaissement" deliberately omitted:
  no manual invoice-creation workflow exists anywhere (invoices only
  ever originate from an appointment/treatment/session), and payment
  capture is hard-scoped to a specific patient+invoice with no safe
  cabinet-wide entry point to deep-link into (ADR-012).

  A static scan of every `<Button`/`<button` JSX tag missing `onClick`/
  `type="submit"`/`htmlFor` across `frontend/src` surfaced 4 more dead
  or mis-disabled controls, all fixed by reusing the codebase's own
  established future-feature `Toast` convention (already used
  pervasively for PDF/print/receipt downloads) instead of staying
  silent: the topbar notification bell and user-account button,
  `MobileNav`'s "Plus" (still a non-navigating placeholder — a
  different, unrelated future feature, never repurposed as Create), and
  `SubscriptionPage`'s Blackout "Contacter le support"/"Se déconnecter"
  (previously hard-`disabled` with no explanation, contradicting
  CLAUDE.md §11's "support/logout... remains accessible" during
  blackout — now active). `AppShell` now owns the Quick Create dialog's
  open state and the shared Toast message, passed to `AppTopbar`/
  `MobileNav` as props — one shared instance, not one per surface.

  Also fixed: Aujourd'hui's "Ouvrir" (`NextAppointmentSection`) had no
  `onClick`/`href` — now a real `Link` to `/app/agenda` (not a specific
  appointment: `TodayAppointment.id` is its own reduced fixture id with
  no reliable join to a real Agenda appointment id, confirmed by
  comparing both fixture sets directly — an unreliable guessed join was
  rejected in favor of the safe, always-correct module-level
  destination). Paramètres/Access Governance navigation hierarchy
  (UI-011X-FIX) verified unaffected. No Laravel/API calls, no
  LocalStorage/persistence, no new subsystem — no Notification Center,
  User Menu or secondary-module sheet was built. 10 net new tests (1548
  total, up from the UI-011X-FIX baseline of 1538), typecheck, lint and
  build pass. Backend regression (10 tests, 26 assertions, clean)
  unaffected — no backend files touched.

- UI-AGENDA-X — Dynamic Cabinet Calendar & Availability Exceptions.
  Additive to the existing weekly `CabinetWorkingHoursDay` (UI-010ABC,
  unchanged) — a new `CabinetCalendarException` model for date-specific
  overrides: public holiday, exceptional closure, rest day, modified
  hours, exceptional opening. Has zero backing in the approved
  specifications (grep-confirmed, same reasoning already applied to
  Delegation, ADR-011 §2) — grounded in the closest real precedent,
  Spec #4 §12.3's practitioner-scoped `availability_exceptions`,
  extended to 5 cabinet-scoped types per the task's own explicit
  instructions (ADR-013).

  New `/app/parametres/horaires/exceptions` route — a real,
  URL-addressable second tab (`HorairesNav`: Horaires habituelles /
  Calendrier & exceptions), nested beneath `ParametresNav` exactly like
  `AccessGovernanceNav`, both navs rendering on every Horaires route —
  directly applying the lesson from the recent UI-011X-FIX regression
  repair. `resolveEffectiveCabinetAvailability` is the single
  centralized pure resolver every consumer reads: an active exception
  always *replaces* the weekly schedule outright, never unions with it.
  At most one active exception per date; editing replaces it in place.
  A date strictly before the prototype's own fixed "today" is past,
  read-only history — no Modifier/Supprimer renders for it; "today"
  itself stays editable.

  Real, never-fabricated appointment-conflict detection
  (`findConflictingAppointments`): filters Agenda's own actual
  appointment fixtures by date and non-terminal status against the
  resolved effective hours, shown as a warning in the Add/Edit dialog —
  never mutates, cancels or reschedules a single appointment.
  `cross-calendar-exceptions-integrity.test.ts` proves the fixtures'
  own conflict claims trace to real Agenda ids, not invented counts.
  Both public-holiday fixtures are real Moroccan national dates (Fête
  du Trône, Marche Verte), correctly ordered past/future.

  The task's own optional Agenda banner (§26, explicitly conditional on
  specification support) was deliberately not implemented — the
  specifications do not support it, so the condition is false; this is
  a documented scope decision, not a gap (ADR-013 §7). No Public
  Booking, no Laravel/API calls, no database, no LocalStorage/
  persistence. 60 net new tests (1608 total, up from the UI-FIX
  baseline of 1548), typecheck, lint and build pass. Backend regression
  (10 tests, 26 assertions, clean) unaffected — no backend files
  touched.

- UI-003C — Patient CIN & Social Coverage. Additive extension of the
  existing patient create/edit form (`PatientFormDialog`, UI-003B),
  from a task-supplied wireframe: a `cin` field and a "Couverture
  sociale" block (covered yes/no + AMO régime — CNSS/CNOPS/TNS/
  TADAMON/ACHAMIL/Étudiants/Autre). Zero specification backing
  (grep-confirmed across all 10 spec files) — implemented as a single
  administrative identifier field, not the "Insurance/AMO workflows"
  CLAUDE.md §50 excludes from V1: no claims, no reimbursement
  calculation, no insurer integration (ADR-014).

  `cin`/`insuranceRegime` are optional and format-unvalidated, mirroring
  `city`'s own no-validation precedent rather than inventing an
  unconfirmed Moroccan CIN format. The new "Couverture sociale" sub-card
  mirrors the existing "Contact d'urgence" sub-card exactly, reusing the
  established radio-group pattern from Agenda's `SchedulingFields`/
  `CancelConfirmDialog` for the Oui/Non toggle; the régime `Select` only
  renders, and is only required, while covered — switching back to
  "Non" clears any already-picked régime before submit, so a stale
  régime can never persist against an uncovered patient. Both fields
  follow the same edit-form-only precedent as `birthDate`/`email`/
  `city`/`address` — never surfaced read-only in Patient 360°'s header
  or overview cards, which stay unchanged. The wireframe's own "Sexe"
  field was deliberately not added — it was not marked new in the
  source wireframe and does not exist anywhere in the current codebase.

  No Laravel/API calls, no database, no persistence (mock data only). 4
  net new tests (1612 total, up from the UI-AGENDA-X baseline of 1608)
  plus 1 existing AR/RTL test extended, typecheck and lint pass. Backend
  regression (10 tests, 26 assertions, clean) unaffected — no backend
  files touched.

- UI-LEAVE-X — Cabinet Leave Agenda. Adds a cabinet-wide "Agenda des
  congés" to the existing Équipe/HR module, at
  `/app/equipe/leave-calendar` — a static route sibling of the dynamic
  `/app/equipe/[id]`, reached from the Équipe directory's own header
  (alongside the existing "Présence du jour" link), never added to the
  main sidebar. The per-employee Congés tab (`TeamMemberLeaveContent`,
  UI-007CDEF) is entirely unchanged and remains the only place a leave
  request is created, approved or rejected.

  The Leave Agenda is a **pure read projection**, never a second
  `LeaveRequest` model or fixture universe: `features/team/leave-
  calendar.ts`'s `LeaveCalendarEvent` is a derived view model built by
  `buildLeaveCalendarEvents` from the existing `LeaveRequest[]`/
  `TeamMember[]` sources, consumed identically by the new Month/Week/
  List views and a read-only detail drawer whose only action ("Voir la
  demande") links back to the existing per-employee workflow. A multi-
  day request correctly repeats across every calendar date it spans
  (`date >= start && date <= end`), not only its start date — proven
  directly with a real 3-day fixture. `getApprovedTeamMembersAway`/
  `countApprovedPractitionersAway` only ever count `status ===
  "approved"`; pending never counts as confirmed absence, rejected is
  hidden by default (the Status filter's restrained "Approuvé + En
  attente" default) but remains reachable explicitly. Practitioner-
  overlap derives from `TeamRole === "practitioner"`, deliberately not
  the narrower Agenda `practitionerId` link Commission eligibility
  requires (ADR-015 §2) — an inactive or not-yet-linked practitioner
  still counts.

  `mock-leave-data.ts`'s existing single fixture array gains two new
  rows, `lr-5`/`lr-6` (Amal Idrissi and Hamza Rifai, both real team
  members, both approved and overlapping on 2026-08-27) — the one
  real-world scenario the prior 4 fixtures never demonstrated: two
  people simultaneously on approved leave, one of them a practitioner.
  Every pre-existing fixture, and the team-4 empty-state guarantee, is
  byte-for-byte unchanged (ADR-015 §1). Dashboard metrics ("En congé
  aujourd'hui"/"Demandes en attente"/"Absences planifiées ce mois") are
  always whole-cabinet and anchored to the real business date, never
  scoped to whichever period the calendar is currently browsing (ADR-015
  §4). Cabinet closure context (task's own explicitly optional
  integration) is surfaced by reusing `resolveEffectiveCabinetAvailability`
  outright — a real `CabinetCalendarException` closure shows a distinct
  "Cabinet fermé" badge, never converted into a per-employee leave
  request; an ordinary non-working weekday from the recurring weekly
  schedule never triggers it (ADR-015 §5).

  Routing regression: `/app/equipe/leave-calendar` and
  `/app/equipe/attendance` are proven to never collide with the dynamic
  `/app/equipe/[id]` route — no real TeamMember id equals either string,
  and `TeamMemberDetailPage` degrades to its own real not-found state
  even in the theoretical case of a collision. No automatic leave
  approval/rejection, no payroll changes, no Laravel/API calls, no
  database, no LocalStorage/persistence. 65 net new tests (1677 total,
  up from the UI-003C baseline of 1612), typecheck and lint pass.
  Backend regression (10 tests, 26 assertions, clean) unaffected — no
  backend files touched.
- UI-DOCS-X — Platform Document Generation, Preview, Download & Print.
  Activates real client-side PDF generation for Invoice, Receipt,
  Prescription and Payslip — the four detail drawers/dialogs that already
  showed "Télécharger PDF"/"Imprimer" as future-feature notices now
  generate and act on a real file. New shared `frontend/src/features/
  documents/` architecture (ADR-016): pure `buildXDocument()` projections
  (one per type, every amount/date read directly off the existing
  `Invoice`/`Payment`+`Receipt`/`Prescription`/`PayrollEntry`, never
  recalculated), shared PDF page chrome (`pdf-shell.tsx`/`pdf-styles.ts`,
  same palette as `design-system/tokens.css`), and a single
  `download.ts` (`generateDocumentBlob`/`triggerBlobDownload`/
  `triggerBlobPrint`) shared by all four document types — no duplicated
  generate/download/print logic per feature. PDF technology:
  `@react-pdf/renderer` 4.9.0, chosen over jsPDF specifically because it
  supports real custom-font glyph embedding (jsPDF has no Arabic
  contextual-shaping engine at all). The existing detail drawers/dialogs
  already serve as the document Preview surface — no separate "Aperçu"
  dialog was added. Filenames follow the task's own exact examples
  (`Facture-FAC-2026-00143.pdf`, `Recu-REC-2026-00383.pdf`,
  `Ordonnance-PAT-00281-2026-08-29.pdf`,
  `Bulletin-Paie-EMP-0003-2026-08.pdf`), sanitized, never an internal id.

  Real end-to-end generation (not just data-model unit tests) is proven
  by `pdf-generation.test.ts` via `renderToBuffer`; the resulting files
  were visually inspected through an independent renderer (poppler
  `pdftoppm`) — French documents render correctly and professionally,
  with money/date/reconciliation all correct on-page.

  Arabic document generation is deliberately gated OFF, not shipped.
  Real visual QA of the rendered PDFs found `@react-pdf/renderer`'s
  Arabic text-shaping pipeline drops or corrupts individual glyphs (a
  leading hamza-bearing letter, or an internal "ف"), reproduced
  identically across two different embedded fonts and even after
  pre-shaping the text into Arabic Presentation Forms to bypass the
  library's own shaper — the task's own explicit "STOP and report the
  limitation rather than shipping broken documents" condition.
  `isDocumentLanguageSupported` (`capabilities.ts`) blocks generation and
  shows a real translated notice instead whenever a cabinet's Document
  language is set to Arabic (default is French) — recorded as RISK-015,
  full technical detail in ADR-016.

  `DocumentDetailDrawer` (clinical uploaded documents) and
  `ExpenseDetailDrawer` (expense justificatifs) are deliberately left
  unchanged — both represent uploaded attachments with no real file
  bytes anywhere in this prototype's fixtures, so no real download is
  possible without inventing file content; both already give explicit
  future-feature feedback, never a silent dead button. No Reports/Caisse
  export control exists in the current UI to activate. No backend
  document storage, no electronic signature, no fiscal certification, no
  provider APIs, no Laravel/API calls, no database, no persistence
  beyond the browser's own download. 38 net new tests (1715 total, up
  from the UI-LEAVE-X baseline of 1677), typecheck/lint/build pass.
  Backend regression (10 tests, 26 assertions, clean) unaffected — no
  backend files touched.
- UI-012ABCDE — Public Booking & Effective Availability. Replaces the
  `/book` visual placeholder with a real, accountless public booking
  journey, built entirely on existing operational configuration and
  scheduling data (Cabinet Services, Cabinet Working Hours, Cabinet
  Calendar Exceptions, Practitioner Work Schedules, approved Practitioner
  Leave, existing Agenda appointments) — no second booking-availability
  fixture universe anywhere.

  New pure, React-free availability engine
  (`frontend/src/features/booking/availability.ts`) resolves, per
  service+practitioner+date: past date, cabinet closure/holiday (reusing
  `resolveEffectiveCabinetAvailability` from UI-AGENDA-X outright),
  approved leave (reusing `doesApprovedLeaveCoverDate` from UI-007CDEF —
  pending/rejected leave never blocks), practitioner `WorkInterval`
  intersection (one centralized `intersectIntervals` helper), service-
  duration-fitting slot generation (never bridges a split-hours/lunch
  closure), and existing-appointment occupancy (reusing `toRange`/
  `overlaps`/`TERMINAL_STATUSES`, newly exported from
  `features/agenda/conflict.ts` — an additive `export` on 3 already-
  shipped pure functions, zero behavior change, rather than a third
  re-implementation of the same overlap math). A schedulable practitioner
  is exactly `TeamMember.role === "practitioner"` AND `status ===
  "active"` AND a real `practitionerId` link to the canonical
  `AgendaPractitioner` — never `role === "practitioner"` alone (Othmane
  Zouiten, a practitioner with no `practitionerId` link, is integrity-
  tested absent).

  Slot-step granularity (30 minutes) is a recorded architectural decision
  (ADR-017) reusing the one real existing precedent in this codebase
  (Agenda's own day-view grid and conflict-suggestion stepping) — no spec
  or `AppointmentSettings` field defines a granularity. No booking
  horizon and no minimum-notice rule are implemented: neither exists
  anywhere in the approved specifications or `AppointmentSettings`; the
  calendar's own month-navigation is separately capped 3 months forward
  as a plain UI convenience, never an engine business rule.

  Every internal `UnavailableReason` collapses to one of 4 public-safe
  labels before ever reaching the UI — a practitioner's approved leave
  and "not scheduled that day" render the exact same generic
  "Indisponible," proven by a dedicated privacy test, so a patient can
  never infer that a specific practitioner is on leave.

  `/book` becomes a real 5-step journey (Service → Praticien → Date &
  heure → Vos informations → Confirmation) with a purpose-built public
  availability calendar (never color-only — unavailable days are also
  disabled and struck through with a safe `aria-label`), a real slot
  grid, and a bounded contact form (Prénom/Nom/Téléphone/Commentaire
  only — no CIN, no social coverage, no clinical data, matching Spec #9
  Screen 51's own exact field list). Submission re-validates the selected
  slot against live sources immediately before creating the local
  booking record; a slot taken in the meantime returns the user to date
  selection with an explicit notice, never a silent failure. The local
  record reuses the canonical `AgendaAppointment` shape outright, always
  created with status `"requested"` (never auto-confirmed, matching Spec
  #9 Screen 52 / WF-04 exactly), with a synthetic `public-*` patient id —
  never a link to a real `PATIENTS` fixture, no probabilistic patient
  matching. Confirmed local bookings accumulate for the browser session
  only (no `localStorage`) and are merged into the engine's own
  appointment source so a just-booked slot cannot be immediately
  double-booked in the same session, without ever mutating Agenda's own
  real appointment array.

  The former placeholder `BookPage`/`FoundationBadge` is removed outright
  — `FoundationBadge` is explicitly documented as "never used on real
  product screens," and `/book` now is one. No Laravel integration, no
  API calls, no database changes, no real SMS/WhatsApp sending, no
  payment gateway, no CAPTCHA, no calendar-provider integration, no real
  persistence. 89 net new tests (1804 total, up from the UI-DOCS-X
  baseline of 1715), typecheck/lint/build pass. Backend regression (10
  tests, 26 assertions, clean) unaffected — no backend files touched.

- **UI-013ABCDE — SaaS Platform Administration.** A new `/admin/*`
  Platform Admin console — a genuinely separate product surface from
  `/app/*` (cabinet) and `/book` (public), its own shell
  (`app/admin/layout.tsx`, never `AppShell`/`AppSidebar`) with a 5-item
  nav (Vue d'ensemble/Cabinets/Abonnements/Utilisateurs/Activité,
  `lib/admin-nav-config.ts`) replacing TASK-003's 8-item placeholder.
  New `features/platform-admin/` module built entirely on real, reused
  sources — a new `Tenant` directory (7 fixtures, all 3 `TenantStatus`
  and all 6 `SubscriptionStatus` values represented at least once) joined
  against the real `Subscription`/`SubscriptionPlan` fixtures UI-011ABC
  already shipped (`tenant-1`'s own subscription is the exact same object
  `/app/abonnement` itself reads, never a duplicate), and a platform-wide
  `PlatformUser`/`PlatformUserTenantMembership` directory whose `tenant-1`
  rows are *derived* from the real Access Governance fixtures
  (`mapAccessUsersToPlatformUsers`) rather than re-authored — proven by
  `cross-platform-admin-integrity.test.ts`. Dashboard KPIs (Cabinets
  actifs/en essai/restreints, Abonnements actifs/à renouveler/expirés,
  Utilisateurs total/actifs) and the attention queue are pure derivations
  over these same arrays — `À renouveler` reuses UI-011ABC's own
  `isExpiringSoon`/D-15 threshold rather than a second invented number.
  Tenant 360° (`/admin/tenants/[id]`) hosts tenant status
  (suspend/reactivate), subscription status (manual renewal/forced
  blackout/cancel, reusing `GRACE_PERIOD_DAYS`) and a read-only
  entitlements/users/history view — bounded actions require a reason
  (Spec #2 §55.2 "controlled and audited") and update local state only
  (task: "NO real tenant suspension... NO real subscription mutation");
  no `/admin/subscriptions/[id]`/`/admin/users/[id]` routes exist (task
  §9), so subscription detail lives on Tenant 360° and user detail is a
  drawer on `/admin/users` (mirrors `UserAccessDrawer`). `/admin/activity`
  covers the Gate 5 audit log and attention queue; a dedicated support/
  impersonation workspace was deliberately not built — both are marked
  conditional-future by the specifications themselves (Spec #1 §27, Spec
  #2 §55.6), not merely unspecified (see ADR-018/RISK-017/RISK-018 for
  the full set of recorded scope decisions and boundaries). No Laravel
  integration, no API calls, no database changes, no real tenant
  suspension/impersonation/subscription mutation, no payment gateway, no
  authentication (task §6: "Frontend Admin UI ≠ Platform authorization"),
  no LocalStorage/persistence. 109 net new tests (1913 total, up from the
  UI-012ABCDE baseline of 1804), typecheck/lint/build clean. Backend
  regression (10 tests, 26 assertions, clean) unaffected — no backend
  files touched.

- **UI-013X — Authentication UX & Cabinet Onboarding.** Replaces the last
  two TASK-003 Foundation/Demo placeholders with real frontend UX.
  **Authentication** (`features/auth/`): Login (`/auth`), Forgot password
  (`/auth/forgot-password`) and Reset password (`/auth/reset-password`) —
  explicitly NOT real authentication (no session/cookie/LocalStorage/JWT
  ever set; a valid Login submission shows a bounded Toast reusing the
  established "future-feature" convention instead, ADR-019 §1, since no
  spec authorizes a demo-credential mechanism). A new `PasswordInput`
  show/hide field (no such pattern existed anywhere before). Forgot
  password never discloses account existence; Reset password never
  verifies a real token (no backend exists to check one against). No
  password-policy invention beyond required + email-format + must-match.
  **Cabinet Onboarding** (`features/onboarding/`): a 6-step wizard —
  Cabinet → Horaires → Services → Équipe → Préférences → Récapitulatif →
  Terminé — composing EXISTING Paramètres form-value types/validators
  outright (`validateCabinetSettingsForm`, `isValidWorkingHoursForm`, the
  literal `ServiceTable`/`ServiceFormDialog` components,
  `validateAppointmentSettingsForm`) rather than a parallel
  Onboarding-prefixed domain (task §14, proven by
  `cross-onboarding-integrity.test.ts`). The step sequence reconciles Spec
  #7 §28's own 5-screen order (Horaires before Services, no Équipe/
  Préférences step) with this task's own explicit Gate 2 checklist —
  recorded in ADR-019. No minimum-one-service requirement (unspecified
  anywhere); Équipe is explicitly optional/non-blocking and never creates
  a `UserAccount`/login credential; Récapitulatif shows every section
  with per-section "Modifier" links; completion never claims a tenant was
  actually provisioned (RISK-020). `app/onboarding/layout.tsx` widened
  `max-w-lg` → `max-w-2xl`, top-aligned instead of centered (mirrors
  UI-012ABCDE's `book/layout.tsx` precedent). No Laravel integration, no
  API calls, no database changes, no credential persistence, no tenant
  provisioning. 55 net new tests (1968 total, up from the UI-013ABCDE
  baseline of 1913), typecheck/lint/build clean. Backend regression (10
  tests, 26 assertions, clean) unaffected — no backend files touched.

- **UI-014 — Final Frontend QA, UX Hardening & Prototype Freeze
  Checkpoint.** A whole-product audit-and-repair pass, not a
  feature-building task: **frontend prototype is now considered
  complete**. All 68 registered routes verified; the Paramètres ↔ Access
  Governance nav hierarchy re-verified intact (22 tests); dead-control
  sweep found zero bugs (the previously-flagged dead global "Créer"
  button is confirmed fixed); the previously-reported Finance
  duplicate-key warning is confirmed already fixed (stable id-based keys
  throughout); the previously-reported Attendance "everyone shows Repos"
  state is confirmed **correct, not a bug** (the mock business date is
  genuinely a Sunday, and the mock schedules intentionally cover
  Monday–Saturday only — traced end to end with existing test coverage
  for both cases). One genuine cross-domain defect found and fixed:
  Agenda's own appointment-creation form read a disconnected local
  `SERVICES` string list instead of Paramètres' real `CabinetService[]`,
  so an inactive service stayed bookable internally and duration was
  disconnected from the selected service — `agenda-page.tsx` and
  `appointment-form-dialog.tsx` now source and filter by the real
  `getCabinetServicesMockData()`, auto-filling duration from the matched
  service (`scheduling-fields.tsx`'s quantized duration options widened
  to include 20 min), with a targeted regression test added. `fr.json`/
  `ar.json` key parity reconfirmed at exactly 2102/2102, no hardcoded
  leaks, no unexpected placeholder language on any completed route.
  Security audit clean (no `fetch`/`axios`/API calls, no
  `dangerouslySetInnerHTML`/`eval`, no `localStorage`/`IndexedDB`
  writes anywhere). RISK-015 (Arabic PDF) reconfirmed still open and
  safely gated, untouched. No real browser-rendered visual QA tooling
  exists in this project — desktop/tablet/mobile pixel-level checks were
  honestly not performed rather than faked via curl/jsdom. 1 net new
  test (1969 total, up from the UI-013X baseline of 1968), full isolated
  regression clean (179 files, 0 failures), typecheck/lint/build clean.
  Backend regression (10 tests, 26 assertions, clean) unaffected — no
  backend files touched.
- AUTH-001 — Real authentication, sessions & password recovery: the first
  full-stack integration task, replacing UI-013X's `/auth/*` prototype
  (RISK-019, now resolved) with a real Laravel `app/Modules/Identity/`
  backend and a real frontend API boundary. See
  `docs/implementation/IMPLEMENTATION_STATUS.md`'s new "Full-Stack
  Integration Sequence" section and `DECISIONS.md` ADR-020 for full
  detail. Summary: Laravel Sanctum stateful-SPA session-cookie
  authentication (not JWT), `SESSION_DRIVER=database`; real
  login/logout/me/forgot-password/reset-password endpoints backed by
  `bcrypt`-hashed passwords, Laravel's own `PasswordBroker` for reset
  tokens, and two-layer login rate limiting; every credential/reset
  failure mode is provably indistinguishable (no account-existence or
  password-vs-unknown-email oracle). A same-request container-singleton
  staleness bug affecting logout's own session bookkeeping was found and
  fixed at the source, not merely worked around in tests. Frontend gained
  its first real network boundary (`src/lib/api-client.ts`,
  `features/auth/api.ts`, `features/auth/session-context.tsx`,
  `components/app/auth-guard.tsx`) — `/app/*` now bootstraps and
  redirects on a real session check, and the topbar/Blackout logout
  controls call the real endpoint, replacing their previous
  future-feature Toast placeholders. Tenant context, permission
  enforcement and onboarding provisioning remain explicitly out of
  scope. 42/42 backend tests (32 new, real PostgreSQL), 1995/1995
  frontend tests (26 new across 2 new files), typecheck/lint/build
  clean, plus a real Playwright-driven browser verification against the
  live dev backend+frontend+PostgreSQL covering the full login/logout/
  guard-redirect/forgot-password/emailed-link/reset/re-login loop.
