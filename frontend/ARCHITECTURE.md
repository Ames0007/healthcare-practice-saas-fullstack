# Frontend Architecture

Backend-local companion to `CLAUDE.md` and Specifications #5, #7, #8, #9,
#10. Records the structural conventions established by TASK-003 (frontend
bootstrap) and the graphic-charter alignment applied by TASK-003A.
**No business functionality is implemented yet.**

## Stack

Next.js 16 (App Router, Turbopack by default), React 19.2, TypeScript
(strict), Tailwind CSS v4 (CSS-first `@theme` config, no
`tailwind.config.js`). See `AGENTS.md`/`CLAUDE.md` in this directory —
Next.js auto-generates these to point future agent work at the
version-matched docs bundled in `node_modules/next/dist/docs/`; conventions
here may differ from older Next.js knowledge.

## Route architecture

Five top-level route areas (Spec #5 §5.2), each a real URL prefix (not a
parenthesized Next.js route group, since these must appear in the browser
URL — `/book/{slug}` is referenced directly by `CLAUDE.md` §17):

```text
src/app/
  auth/          /auth        — Login/Forgot/Reset password. Real backend auth (AUTH-001).
  onboarding/    /onboarding  — Cabinet Onboarding wizard (UI-013X). Real tenant provisioning (TENANT-001), guarded by OnboardingGuard.
  app/           /app         — the tenant practice application (AppShell), session- and tenant-guarded (AUTH-001, TENANT-001).
  book/          /book        — mobile-first public booking layout.
  admin/         /admin       — SaaS Platform Admin console (UI-013ABCDE).
  page.tsx       /            — route-architecture index (not a marketing page).
```

`src/app/app/[...slug]/page.tsx` is a catch-all: every real nav destination
under `/app` (Agenda, Patients, Finance, ...) resolves to a shared "not
implemented yet" placeholder until its task lands, instead of a bare 404.

`/app` (`src/app/app/page.tsx`) is the real Aujourd'hui dashboard (UI-001),
composed from `src/features/today/`. It replaces the TASK-003 foundation/
demo page — the `<FoundationBadge />` component and `foundation.*`
dictionary keys still exist (unused by any route) as a record of the
original component/token proof, but no longer back a page.

`src/app/app/patients/[id]/` (UI-004A) has 6 real routes — `page.tsx`
(Aperçu) plus `health/`, `appointments/`, `treatments/`, `invoices/`,
`payments/` — each a thin client page that reads the `id` param, runs the
same simulated-loading transition as every other feature page, and
renders `features/patients/patient-detail-page.tsx` with a fixed
`activeTab`. Chosen over a shared `layout.tsx` wrapping `{children}` so
the composition root stays a single, directly-testable component (see
`features/patients/` below) rather than splitting testable logic across
Next.js layout/page boundaries that are awkward to unit-test outside a
real App Router runtime.

`/app/*` (`src/app/app/layout.tsx`) is wrapped in `AuthGuard`
(`components/app/auth-guard.tsx`, AUTH-001, extended TENANT-001) — real
session-cookie authentication (`SessionProvider`/`useSession`,
`features/auth/session-context.tsx`), scoped to `/app/*` only via that
layout (`/auth`/`/book`/`/admin` render no `SessionProvider` and have no
use for one). This is UX only: the backend independently enforces
`auth:sanctum` on every protected endpoint regardless of what this
component renders — never treat client-side routing here as the real
security boundary. `/onboarding` is wrapped the same way by
`OnboardingGuard` (`components/app/onboarding-guard.tsx`, TENANT-001) —
the mirror image of `AuthGuard`: authenticated-but-no-tenant is sent to
`/onboarding`, authenticated-with-a-tenant is sent to `/app`, both share
the loading/unreachable fallback UI (`session-gate-fallback.tsx`). No
permission/role checks exist yet — that remains AUTHZ-001's scope
(CLAUDE.md §9-10); `/admin` remains deliberately unauthenticated
(RISK-018, unchanged).

## Component layers

```text
src/components/
  ui/       Generic primitives: Button, Input, Textarea (mirrors Input's
            label/error/describedby pattern, added UI-005A for Dossier
            Santé's notes field), Select, Combobox, Card, StatusBadge,
            Skeleton, EmptyState, MetricCard, AttentionItem, Dialog (one
            focus-trapped, portal-rendered implementation backing drawer/
            modal/alert variants — see UI-002), ConfirmDialog, Toast
            (single-slot, not a global provider), Avatar (initials-
            fallback, no photo support), Pagination (compact prev/next, no
            numbered list — see UI-003A), Tabs (real
            `<nav>`/`aria-current="page"` navigation for URL-addressable
            sections — not the ARIA `tablist` pattern, which is reserved
            for JS-only panel switching with no URL change, see UI-004A).
            No business knowledge.
  app/      Shell/domain-agnostic app components: AppShell, AppSidebar,
            AppTopbar, MobileNav, PageHeader, LanguageSwitcher,
            FoundationBadge, AreaPlaceholder, QuickCreateDialog
            (UI-FIX — the global "+ Créer" launcher, reuses `Dialog`
            `variant="modal"`; a pure navigation menu into each action's
            own already-built creation workflow at `/app/agenda`,
            `/app/patients`, `/app/stock/movements`,
            `/app/communication`, `/app/finance/expenses` — never a
            duplicate form, and deliberately omits "Nouvelle facture"/
            "Nouvel encaissement" since neither has a reusable, context-
            free existing workflow to link into, ADR-012). `AppShell`
            owns the Quick Create dialog's open state and a single
            shared future-feature `Toast` message, passed down to
            `AppTopbar` (Créer/notifications/user-account) and
            `MobileNav` (Plus) as callback props — one shared instance
            of each across route navigation, not one per surface.
  domain/   Reusable components that know about one business concept but
            not about a specific screen (Spec #8 §85), e.g.
            `domain/appointments/` — `types.ts` (the full 11-state
            AppointmentStatus/AppointmentSchedulingType machine, Spec #2
            §57.1/#3 §3.1), `appointment-status.ts` (the central status →
            tone/label registry), `appointment-card.tsx` (row/prominent/
            calendar variants; `showPatientName` — default `true` — lets a
            patient-context caller suppress the redundant identity line and
            show the practitioner instead, see Patient Rendez-vous below,
            UI-004B). Both Aujourd'hui (UI-001) and Agenda (UI-002) depend
            on this layer, not the other way around.
            `domain/patients/` (UI-004A) — `types.ts` (`PatientOverview`/
            `PatientActiveTreatment`/`PatientNextInstallment`/
            `PatientActivityItem`/`PatientTabKey`, kept separate from
            `features/patients/types.ts`'s administrative `Patient` type
            per CLAUDE.md §12), `patient-header.tsx` (persistent identity/
            context header) and `patient-activity-timeline.tsx` (the
            unified activity list). Both take only pre-resolved display
            strings/typed data from their caller — no dependency on
            `features/*` mock-data or formatting code, keeping the domain
            layer's isolation intact the same way `appointment-card.tsx`
            does. `domain/treatments/` (UI-004C) — `types.ts`
            (`TreatmentPlan`/`TreatmentSession`, simplified from Spec #4
            §14's backend ENUMs to this task's own status lists),
            `treatment-status.ts`/`session-status.ts` (two separate small
            registries — a session's lifecycle has different semantics
            from an appointment's, so this does not reuse
            `appointment-status.ts`), `session-progress.tsx` (Spec #8 §97
            `SessionProgress` — completed/scheduled/remaining always
            spelled out as text, a real `role="progressbar"`),
            `session-tracker.tsx` (the compact accessible session grid,
            Spec #9 Screen 22 — each cell a labeled button opening that
            session's detail), `treatment-plan-card.tsx`
            (`TreatmentPlanCard`, an "active"/"completed" `variant` plus
            `actions`/`onSelect` — deliberately mirrors
            `appointment-card.tsx`'s own API for consistency).
            `domain/finance/` (UI-004D) — `types.ts` (`Invoice`/
            `InvoiceLine`/`Installment`; money is a plain whole-MAD
            `number` — never a separate minor-units/×100 representation —
            matching `Patient.outstandingBalance`/`formatMad`'s existing
            convention exactly, since no wireframe in this product ever
            shows centimes; introducing a second money model would force
            a wide refactor this task's own instructions explicitly warn
            against), `invoice-status.ts`/`installment-status.ts` (two
            separate small registries, same reasoning as
            `treatment-status.ts`/`session-status.ts`), `invoice-card.tsx`
            (`InvoiceCard`) and `installment-row.tsx` (`InstallmentRow` —
            icon + text + tone, never color alone). No separate money
            formatter was added — `formatMad` (already re-exported by
            `features/patients/format.ts`) remains the one shared
            formatter. UI-004E adds `Payment`/`PaymentAllocation`/`Receipt`
            to the same `types.ts` (still the one whole-MAD `MoneyAmount`,
            no second representation), `payment-status.ts` (its own small
            posted/reversed registry — a payment's lifecycle is not an
            invoice's or an installment's) and `payment-row.tsx`
            (`PaymentRow`, a dense clickable history row mirroring
            `TreatmentPlanCard`'s "completed" variant rather than a full
            `Card`).
            `features/patients/components/invoice-detail-drawer.tsx`'s
            `InvoiceDetailDrawer` (UI-004D) became a genuinely shared
            component in UI-006B — reused unmodified by both Patient
            360°'s Factures tab and Global Finance
            (`/app/finance/invoices`) — because it only ever took
            pre-resolved props to begin with, never assuming Patient
            360° page composition. The one change was a small additive
            `showPatientNavigation` prop (default `false`, so the
            existing Patient 360° caller's behavior is byte-for-byte
            unchanged) that renders two extra quick-navigation links for
            the global context. This is the pattern future cabinet-level
            screens reusing a Patient-360°-owned detail component should
            follow: inspect first, add one additive opt-in prop, never
            fork a second implementation.
            `CashSession`/`CashMovementDirection`/`CashMovementType`/
            `CashMovement` (UI-006C) — simplified from Spec #4 §18's
            `cash_register_sessions`/`cash_movements`. `cash-session-
            status.ts` (`CASH_SESSION_STATUS_MAP` — closed/open) mirrors
            `invoice-status.ts`'s registry pattern exactly. A
            `CashMovement` is always derived from an existing `Payment`
            or `CabinetExpense` record (`features/caisse/
            calculations.ts`) — never independently authored, the same
            "read model, not a second source of truth" discipline as
            `features/finance/aggregations.ts`'s own receivables/
            activity builders.
            `CashSession` gained 7 optional closing fields in UI-006E —
            `expectedClosingBalance`/`physicalClosingBalance`/
            `differenceAmount`/`differenceType`/`discrepancyReason`/
            `closedAt`/`closedBy` — plus a new sibling `CashDifferenceType`
            ("balanced"/"shortage"/"overage") and its own registry,
            `cash-difference-type.ts` (`CASH_DIFFERENCE_TYPE_MAP`,
            mirroring `cash-session-status.ts`'s exact pattern; overage
            maps to `warning`, deliberately not `success` — a positive
            discrepancy is still an anomaly). `CashSessionStatus` itself
            was NOT extended with a third value: `session === null`
            still means "not yet opened today," while a genuinely closed
            session is `status: "closed"` with `closedAt` set — the two
            "not open" states are distinguished by that field's
            presence, not by the status enum (UI-006E §8's own explicit
            decision, documented in `CaissePage`'s own doc comment).
            `CabinetExpense` (UI-006A) gained three optional fields in
            UI-006D — `time`, `createdBy`, `supportingDocument` (a new
            `ExpenseSupportingDocument` metadata-only type: `fileName`/
            `mimeType`/`sizeBytes`, mirroring `ClinicalDocument`'s own
            shape, never `File`/`Blob`/base64/an `ObjectURL`) — rather
            than a second expense-entry type, so UI-006A's original
            fixtures stay untouched (all three are optional; a fixture
            without them renders exactly as before).
            `domain/clinical/` (UI-005A) — the first real clinical
            prototype, deliberately separate from `domain/patients/`'s
            administrative `PatientOverview` and from
            `features/patients/types.ts`'s administrative `Patient`
            (CLAUDE.md §8/§12): `types.ts` (`MedicalProfile`/
            `MedicalProfileEntry`, Spec #4 §9.3 `patient_health_flags`
            simplified to this task's own bounded shape),
            `clinical-summary-section.tsx` (`ClinicalSummarySection`, one
            restrained card per category — allergies/history/medications/
            notes all reuse it — with an inline empty sentence rather than
            a full `EmptyState` per category, and a small "Important"
            `StatusBadge` on one entry at a time, never coloring the whole
            card) and `entry-chip.tsx` (`EntryChip`, the removable
            selected-value pill used inside the edit drawer).
            UI-005B adds `ClinicalEncounter` to the same `types.ts` (Spec
            #4 §9.1 `clinical_encounters` simplified — bounded to
            `consultation`/`session`, no amendment entity) and
            `clinical-timeline.tsx` (`ClinicalTimeline`) — a purpose-built
            chronology component rather than a reuse of
            `domain/patients/patient-activity-timeline.tsx`
            (`PatientActivityTimeline`, UI-004A): that component only
            renders one-line translated activity strings and explicitly
            excludes clinical note/diagnosis text, so it cannot represent
            structured motif/session detail or the "Voir la
            consultation"/"Voir le traitement" interactions the Historique
            clinique section needs. Both timelines coexist deliberately —
            Aperçu keeps its concise cross-domain activity feed
            (appointment/payment/document/treatment/consultation, one line
            each), while Dossier Santé gets its own richer, clinical-only
            chronology.
            UI-005C adds `ActiveConsultation`/`ConsultationStatus` to the
            same `types.ts` (Spec #4 §9.1's `status` column narrowed
            further still to `draft`/`completed` only — not the domain
            spec's full draft/active/completed/amended set), deliberately
            shaped so a completed consultation is a near-direct match for
            `ClinicalEncounter`'s own consultation fields (see
            `features/patients/active-consultation.ts`'s
            `toClinicalEncounter`), `consultation-status.ts`
            (`CONSULTATION_STATUS_MAP` — `draft` → `neutral`, mirroring
            `invoice-status.ts`'s own restrained `draft` tone; `completed`
            → `success`, matching every other domain's "completed" tone),
            and two small pieces extracted specifically to avoid
            duplicating UI-005B's own read-only presentation a second time
            (§30 of the task): `consultation-structured-detail.tsx`
            (`ConsultationStructuredDetail`, the four labeled Motif/
            Observations/Évaluation/Plan blocks) and `related-appointment-
            note.tsx` (`RelatedAppointmentNote`, the "Rendez-vous associé"
            block). Both are now shared by UI-005B's
            `ConsultationDetailDrawer` (refactored to consume them instead
            of its own inline copies — its existing tests pass unchanged,
            confirming the refactor is behavior-preserving) and UI-005C's
            completed-consultation view.
            UI-005D adds `ClinicalDocument`/`ClinicalDocumentCategory` and
            `Prescription`/`PrescriptionItem`/`PrescriptionStatus` to the
            same `types.ts` — the last clinical models in the Patient
            360° prototype sequence, completing Dossier Santé alongside
            `MedicalProfile`/`ClinicalEncounter`/`ActiveConsultation`
            above. `document-category.ts` (`DOCUMENT_CATEGORY_MAP` —
            analysis/imaging/report/prescription/other, each with its own
            Lucide icon, never hardcoded per card, never emoji, never a
            per-category color treatment — a document's category is
            informational, not a status). `PrescriptionStatus` keeps
            `"cancelled"` for shape-fidelity with a real future backend
            (matching the task's own two-value model sketch) without any
            UI ever reaching it — every fixture and every prototype
            creation only ever produces `"issued"` (the task's own §31
            explicitly forbids building a cancellation workflow here).
            `Prescription`'s structured `items[]` is a deliberate,
            documented extension of Spec #4 §10.3's generic
            `generated_documents` shape (which treats a prescription as
            just one more `document_kind` with no item-level structure) —
            required by this task's own explicit model, not a
            contradiction of the domain spec; a future generated PDF
            would still be recorded as one `generated_documents` row
            referencing this record (§42, not implemented).
            `domain/team/` (UI-007A) — the first cabinet HR domain layer.
            `types.ts` (`TeamMember`/`TeamRole`/`TeamMemberStatus`)
            deliberately carries no authentication field (password/MFA/
            session/permission) anywhere — a `TeamMember` is a person
            working in the cabinet, a future auth `User` is a separate,
            unbuilt concept (CLAUDE.md §9-10, task §7). An optional
            `practitionerId` links to Agenda/Patients/Caisse's own
            existing lightweight `AgendaPractitioner` fixture
            (`features/agenda/mock-data.ts`'s `PRACTITIONERS`) for the
            subset of members who are also schedulable practitioners —
            deliberately not a refactor of those existing selectors to
            consume `TeamMember` instead (§8: the two representations
            coexist until a later task decides otherwise).
            `team-role.ts` (`TEAM_ROLE_MAP`) mirrors
            `expense-category.ts`'s label/icon registry pattern exactly
            — no `StatusTone`, since role is a functional category, not
            a status (§12). `team-member-status.ts`
            (`TEAM_MEMBER_STATUS_MAP`) mirrors `cash-session-status.ts`'s
            tone/label registry instead — active/inactive only;
            suspended/on-leave states are deliberately not part of
            `TeamMemberStatus`'s literal union, since UI-007D owns leave
            state (§13).
            UI-007B adds two new, deliberately separate types to the same
            `types.ts` — `TeamMember` itself gained no new field (§10).
            `EmploymentContract` (id/teamMemberId/contractNumber?/
            contractType/status/startDate/endDate?/jobTitle/
            weeklyHours?/notes?) — no remuneration field anywhere (§20),
            grep- and test-confirmed. `ContractType` ("permanent"/
            "fixed_term"/"part_time"/"internship"/"other") is this
            task's own explicit vocabulary — the domain-data spec only
            defines a free-text `employees.employment_type` column, no
            enum. `ContractStatus` stays to "active"/"ended". Both get
            their own registry (`contract-type.ts`/`contract-status.ts`)
            mirroring `team-role.ts`/`team-member-status.ts`'s own
            split — `ContractType`'s registry carries no `StatusTone` at
            all (a contract type is not a status, §13), mirroring how
            `team-role.ts` itself carries none. `WorkInterval` mirrors
            Spec #4 §20.1's `employee_work_schedules` 1:1 — one row per
            interval, several rows sharing a `weekday` model a split
            shift (§7), no separate list field; `active` is kept for
            shape-fidelity with the spec column but no UI ever toggles
            it (same precedent as `PrescriptionStatus`'s `"cancelled"`,
            UI-005D). `Weekday` is its own small abstract 7-value enum,
            deliberately not derived from Agenda's date-based
            `formatWeekdayShort` (`features/agenda/format.ts`) — that
            needs a concrete ISO date, and manufacturing a fake
            "reference week" purely to borrow day-name labels would be
            exactly the appointment-scheduling coupling the task's own
            §4 warns against.
            UI-007CDEF (Gates 1-4) completes the HR domain layer with four
            more, still deliberately separate, types in the same
            `types.ts` — `TeamMember`/`EmploymentContract`/`WorkInterval`
            remain exactly as UI-007A/B left them. `AttendanceRecord`
            (PRESENCE — what actually happened, vs. `WorkInterval`'s own
            PLANNING) stores only raw `checkIn?`/`checkOut?`; every
            status/worked/late/overtime figure is *derived*, never a
            duplicated stored field (`features/team/attendance.ts`,
            below) — the same discipline UI-006E already established for
            Caisse's own theoretical balance. It is a deliberate
            frontend-only prototype running ahead of the approved backend
            scope (`docs/implementation/DECISIONS.md` ADR-005) — Spec #4
            §20 and Spec #3 §39/WF-36 both say clock-in/out is not a
            required V1 *backend* entity/workflow, which this type does
            not create (no API, no persistence). `LeaveRequest`/
            `LeaveBalance` mirror Spec #4 §20.2's `leave_requests` fields,
            narrowed to this prototype's own bounded `LeaveType`
            (annual/sick/unpaid/other) and 3-value `LeaveRequestStatus`
            (pending/approved/rejected). `PayrollPeriod`/`PayrollEntry`/
            `PayrollAdjustment` are an explicitly cabinet-*operational*
            prototype — no statutory Moroccan tax/CNSS/AMO/IR field
            exists on any of them; `baseAmount` is a payroll-specific
            synthetic figure, never added to `EmploymentContract`, which
            UI-007B deliberately kept salary-free. `CommissionRule`'s
            `basis` is fixed to the single literal type
            `"collected_payments"` — the only basis the approved specs
            actually demonstrate with a worked example. Four new
            registries (`attendance-status.ts`, `leave-type.ts`,
            `leave-status.ts`, `payroll-status.ts`) mirror
            `team-role.ts`/`team-member-status.ts`'s exact split pattern.
            `domain/stock/` (UI-008ABCD) — the healthcare inventory
            domain layer, replacing the generic Stock placeholder.
            `types.ts`'s `InventoryItem`/`InventoryLot`/`StockMovement`
            deliberately carry **no balance field anywhere** — every
            item/lot balance is always derived from `StockMovement[]`
            (`features/stock/stock.ts`/`lots.ts`, below), the same
            discipline UI-006E/UI-007CDEF already established for
            Caisse's expected balance and Attendance's worked minutes.
            A single 10-value `InventoryCategory` doubles as the
            item-type axis the task's own §14 proposed as a second,
            separate field — judged unnecessary duplication rather than
            a genuinely distinct concept (§14's own "avoid unnecessary
            complexity" caution), since the category values already
            encode handling semantics as granularly as a separate
            `itemType` would. `StockPolicy` layers optional
            `safetyStock`/`reorderPoint`/`maximumStock`/
            `reorderQuantity`/`leadTimeDays` planning metadata on top of
            the approved schema's mandatory `minimumStock` (Spec #4
            §23.1 defines only that one field) — a deliberate,
            non-persisted enrichment recorded as
            `docs/implementation/DECISIONS.md` ADR-006, not a silent
            contradiction. `expirationTracking` is only ever `true`
            alongside `lotTracking` (`isValidItemTrackingFlags`), since
            expiration dates live on lots, not items (Spec #2 §37).
            Six registries (`category.ts`, `unit.ts`,
            `attention-status.ts`, `expiry-status.ts`,
            `movement-type.ts`, `movement-reason.ts`) mirror
            `expense-category.ts`/`cash-session-status.ts`'s exact
            label/icon/tone-registry split pattern.
            `domain/communication/` (UI-009ABC) — the Communication Center
            domain layer, replacing the generic Communication placeholder.
            `types.ts`'s `CommunicationMessage` mirrors Spec #4 §24.2's
            `communication_messages` row field-for-field, including its
            own `queued`/`sent`/`delivered`/`failed` status ENUM — the
            task's own model only hedged "pending" as a "Potential"
            label and deferred to "the approved workflow." It
            deliberately carries **no `direction` field**: the spec's
            schema has none, every field it does define is inherently
            outbound-shaped, and every message here is outbound by
            construction (`docs/implementation/DECISIONS.md` ADR-007).
            `patientId`/`appointmentId`/`invoiceId`/`installmentId` are
            soft references resolved at render time by
            `features/communication/messages.ts` against the *existing*
            Patients/Agenda/Invoices fixtures — never a duplicate
            universe. `CommunicationPurpose` (11 values, the union of
            Spec #2 §39.1's template categories) is shared by both
            `CommunicationMessage.purpose` and `MessageTemplate.purpose`
            — one bounded vocabulary, not two independently drifting
            ones. `MessageTemplate`/`CommunicationVariableKey` (a strict
            10-key allowlist) back the pure `renderTemplate` function
            (`features/communication/templates.ts`) — no `eval`, no
            `dangerouslySetInnerHTML`; `MessageTemplate.variables` is
            *derived* from `body`, never independently authored.
            `AutomationRule` (7 fixed canonical `CommunicationEventType`s,
            one per Spec #2 §40's own V1 rule list) exposes only an
            active/inactive toggle in this prototype — the literal
            reading of §40's own closing line, not a rule builder
            (CLAUDE.md §3). Six registries (`channel.ts`,
            `message-status.ts`, `purpose.ts`, `locale.ts`,
            `variable.ts`, `event-type.ts`) mirror
            `expense-category.ts`/`cash-session-status.ts`'s exact
            label/icon/tone-registry split pattern.
            `domain/reports/` (UI-010ABC) — deliberately thin: Reports
            projects existing domain types rather than owning new
            business entities, so `types.ts` holds only read-model row
            shapes (`ActivityReportKpis`, `AppointmentStatusBreakdownRow`,
            `PractitionerActivityRow`, `FinanceReportSummary`,
            `HrReportKpis`, `StockReportKpis`, `ReportsOverview`) — no
            registry files, since none of these are bounded-vocabulary
            fields needing a label/tone map. `StockReportKpis`
            deliberately does not reuse `features/stock/dashboard.ts`'s
            own `StockKpis` shape: it partitions the same
            `StockAttentionStatus` rows differently (out-of-stock split
            from critical/low) to match the task's own two-number
            wireframe (`docs/implementation/DECISIONS.md` ADR-008) — the
            underlying rows are still `buildItemRows`'s, never a second
            derivation.
            `domain/settings/` (UI-010ABC) — Cabinet Settings/Services/
            Working Hours/Numbering. `CabinetProfile` narrows Spec #4
            §5.1's `tenants` schema (no `slug`, no `logo_file_id` — see
            `features/parametres/`, below); `currencyCode`/`timezone`
            are fixed, non-editable fields. `CabinetService.schedulingMode`
            reuses `AppointmentSchedulingType` from `domain/appointments/`
            verbatim rather than a second exact/window enum.
            `CabinetWorkingHoursDay.weekday` reuses `Weekday` from
            `domain/team/` verbatim — its own doc comment already
            anticipated this exact "abstract calendar-independent weekly
            pattern" reuse. `NumberingSequenceRow` is read-only by
            design (ADR-008: concurrency-safe allocation is a backend
            concern this prototype does not implement). One registry
            (`specialty.ts`) mirrors the established label-registry
            pattern for `CabinetSpecialty`'s 7 values (CLAUDE.md's own
            "Primary initial specialties" list verbatim).
            UI-010BC adds three narrow types to the same file:
            `AppointmentSettings` (bounded to
            `defaultSchedulingMode`/`defaultDurationMinutes` — the only
            two concerns Spec #2 §46 names for Rendez-vous, ADR-009 §3);
            `PaymentMethodRow` reuses `PaymentMethod` from
            `domain/finance/` verbatim (typed as exactly `"cash"`) rather
            than an invented broader method list (ADR-009 §2);
            `DocumentSettings` (`footerText`/`headerNote`/
            `documentLanguage` — deliberately no template-selection or
            tax-display field, ADR-009 §4). No new registries: none of
            the three introduces a bounded-vocabulary field beyond types
            already covered elsewhere (`AppointmentSchedulingType`,
            `PaymentMethod`, `PreferredLanguage`).
            UI-AGENDA-X adds `CabinetCalendarException` — deliberately
            **separate** from `CabinetWorkingHoursDay` (recurring weekly
            pattern) and from `domain/team/`'s `WorkInterval`
            (per-employee) and `LeaveRequest` (employee-specific
            absence): a `CabinetCalendarException` is a one-off,
            date-specific override to the *cabinet's* own availability,
            never merged with either. Has zero backing in the approved
            specifications (ADR-013) — grounded in Spec #4 §12.3's
            practitioner-scoped `availability_exceptions` shape, extended
            cabinet-scoped to 5 types (`calendar-exception-type.ts`'s
            `CALENDAR_EXCEPTION_TYPE_MAP`: `public_holiday`/
            `exceptional_closure`/`rest_day` always closed,
            `modified_hours`/`exceptional_opening` always carry ≥1
            interval — no separate `allDay` field, closed-ness is always
            derived from `type`).
            `domain/subscription/` (UI-011ABC) — `Subscription`
            (6-status lifecycle, CLAUDE.md §11/Spec #4 §28.4 verbatim),
            `SubscriptionPlan`/`PlanPrice`/`PlanEntitlement` (Spec #4
            §28.1-28.3). Deliberately separate from `domain/settings/`:
            Subscription is the platform-tenant commercial relationship,
            never operational cabinet configuration (task §8). Only two
            `PlanCode` values exist (`solo`/`cabinet` — no invented
            "Cabinet+" tier, ADR-010 §1); `PlanPrice.amount` is always
            `undefined` (pricing is an explicitly deferred commercial
            decision, ADR-010 §2). `SubscriptionHistoryEvent` is a
            read-model row bounded to 5 event types — deliberately
            excludes Spec #4 §28.5 `subscription_payments` (ADR-010 §5).
            `domain/referral/` (UI-011ABC) — `Referral`/`ReferralReward`
            (Spec #4 §29, all 6 `ReferralStatus` values). A separate
            SaaS-domain concept from `domain/subscription/`, related only
            through `ReferralReward` feeding one `SubscriptionHistoryEvent`
            (proven by `cross-subscription-integrity.test.ts`, never a
            shared entity). `ReferralRewardType` has exactly one value
            anywhere in the approved specifications
            (`free_subscription_time`) — never an invented cash/discount
            type. `Referral.referredTenantName` is a frontend read-model
            enrichment (no second-tenant record exists to join against in
            this prototype), documented as such in its own doc comment.
            `domain/access/` (UI-011X) — `PermissionDefinition`/
            `AccessRole`/`UserAccount`/`TenantMembership`/`Delegation`/
            `AccessAuditEvent`. Deliberately distinct from `domain/team/`
            `TeamMember` (a person employed by the cabinet — may exist
            with no `UserAccount` at all), `domain/subscription/`
            `PlanEntitlement` (tenant-purchased capability, never
            per-user), and real authentication (no password/MFA/session
            fields on `UserAccount`). `PERMISSION_CATALOG`'s 16 core keys
            (`permission-catalog.ts`) are copied verbatim from two
            independently-confirming sources — Spec #4 §4.3
            `membership_permissions` and CLAUDE.md §9's identical list —
            rather than a deeper scheme; 7 keys extend it for modules
            that postdate that list (Communication/Subscription/Access
            Governance itself). `Delegation` has zero backing in the
            approved specifications (grep-confirmed) — implemented per
            the task's own explicit Gate 3 instructions, grounded in
            Spec #4 §7.3's dormant `patient_access_grants` as the closest
            real precedent (`docs/implementation/DECISIONS.md` ADR-011).
            `EffectivePermissionEntry`/`PermissionSource` are a read-model
            projection (mirrors `ActivityReportKpis`'s own precedent,
            `features/rapports/`), never a fifth persisted entity.

src/features/
  today/    Aujourd'hui screen composition (UI-001): `types.ts` (mock
            data shape — re-exports `AppointmentStatus` from the domain
            layer), `mock-data.ts` (synthetic data — the seam a future
            `TodayDashboardQuery`/API call replaces), `today-dashboard.tsx`
            (loading/loaded/empty/error states), `components/` (page-local
            presentational panels: KpiRow, NextAppointmentSection,
            AgendaPanel, AttentionPanel, FinancePanel,
            TodayDashboardSkeleton).
  agenda/   Agenda & appointment screen composition (UI-002):
            `types.ts`/`mock-data.ts` (practitioners/patients/services/
            appointments — the same mock "today" anchor date as
            `today/mock-data.ts`), `format.ts` (UTC-consistent date-only
            arithmetic — see note below, plus time-slot generation/
            bucketing), `conflict.ts` (frontend-only overlap check +
            nearby-slot suggestions — UX demonstration, not real
            enforcement), `status-actions.ts` (the state-aware primary-
            action registry shared by the drawer and Waiting Room),
            `agenda-page.tsx` (owns the single appointment array all
            views/dialogs read and write), `components/` (AgendaHeader,
            DayView, WeekView, AppointmentDrawer, AppointmentFormDialog,
            RescheduleDialog, CancelConfirmDialog, NoShowConfirmDialog,
            WaitingRoom, AgendaSkeleton, SchedulingFields — the exact-time/
            arrival-window fields shared by create and reschedule).
            `AppointmentDrawer`'s lifecycle callbacks (`onPrimaryAction`/
            `onEdit`/`onReschedule`/`onCancel`/`onNoShow`) are optional —
            a caller that doesn't own Agenda's mutable state (Patient
            Rendez-vous, UI-004B) omits them and the corresponding controls
            simply don't render, instead of a second detail drawer; a
            `patientLinkHref`/`patientLinkLabel` pair overrides the bottom
            identity link for that same caller. Agenda's own usage is
            unchanged (still passes every callback).
            A `features/<name>/` folder is the convention for screen-
            specific composition that isn't a reusable `components/ui` or
            `components/domain` piece. `mock-data.ts`'s own `SERVICES`
            array is now only the name-literal source Paramètres'
            `getCabinetServicesMockData()` builds from (UI-010ABC) — the
            live appointment-creation form itself (`AppointmentFormDialog`)
            was found during UI-014 QA to still be reading that raw name
            array directly, letting an inactive service stay bookable
            internally and duration go disconnected from the service's
            real `durationMinutes`. Fixed: `agenda-page.tsx` now passes
            `services={getCabinetServicesMockData()}` (the real
            `CabinetService[]`), the dialog filters its options to
            `active` (while still showing an already-selected-but-now-
            inactive service so editing a pre-existing "Suivi" appointment
            never loses data), and selecting a service auto-fills
            duration from the matched fixture (`SchedulingFields`'
            quantized `DURATION_OPTIONS` widened to include 20 min so
            Contrôle/Suivi's real duration is an exact, selectable value).
  patients/ Patients list (UI-003A) plus create/edit (UI-003B):
            `types.ts`/`mock-data.ts` (16 synthetic patients — optional
            administrative fields only, no clinical data, see CLAUDE.md
            §13), `format.ts` (date/money formatting via `toIntlLocale`
            from `@/i18n/intl-locale`), `filter-patients.ts` (pure local
            search + practitioner + next-appointment filtering, no
            backend query), `normalize.ts` (phone/name normalization for
            comparison only — the visible field keeps what the user
            typed), `duplicate-detection.ts` (probable-duplicate check,
            Spec #4 §8 — never merges, never blocks), `patient-number.ts`
            (prototype-only sequential `PAT-000NN` generator, no real
            concurrency), `patient-form-validation.ts`,
            `patients-page.tsx` (owns the single mutable `Patient[]` that
            search/filter/pagination and create/edit all read from and
            write to — the same centralized-state pattern as Agenda's
            appointment array, UI-002), `components/` (PatientsFilters,
            PatientTable, PatientCardList — the same desktop-table/
            mobile-card dual-render pattern as Agenda's Waiting Room —
            PatientsSkeleton, PatientFormDialog: the shared create/edit
            drawer with its own inline duplicate-warning UX). Row actions
            are "Ouvrir" and "Modifier" (opens PatientFormDialog in edit
            mode, prefilled). Patient 360° (UI-004A):
            `mock-overview-data.ts` (treatment/installment/activity
            fixtures per patient id, falling back to an explicit empty
            overview), `patient-detail-page.tsx` (the composition root —
            not-found is derived from a real seed-dataset lookup miss,
            not a simulated `state` value), `components/`
            (PatientOverviewContent, PatientSummaryCard — a restrained
            empty-state rendering distinct from MetricCard's bold
            treatment — PatientTabPlaceholder, PatientDetailSkeleton).
            **Prototype limitation (UI-004A §7):** UI-003B's create/edit
            changes live only in `/app/patients`'s own component state;
            `patient-detail-page.tsx` always looks the patient up in the
            centralized seed dataset (`mock-data.ts`), so a patient
            created in the list is not yet visible at its own `/{id}`
            route. Real cross-page consistency is a backend-integration
            concern, not a frontend state-management one — no Redux/
            Zustand/global store was introduced to paper over it.
            Rendez-vous tab (UI-004B): `patient-appointments.ts` (pure
            derivation — filter Agenda's own `getAgendaMockAppointments()`
            by `patientId`, no second appointment dataset; the upcoming/
            history split and the five status-group filters share one
            status-aware classification rule: a terminal-outcome
            appointment, completed/cancelled/no-show/rescheduled, is
            always history even with a future date, so a future
            cancellation never reads as an upcoming visit),
            `components/patient-appointments-content.tsx` (the tab's
            composition — reuses `AppointmentCard` with
            `showPatientName={false}`, `variant="prominent"` for upcoming
            with per-card "Voir le rendez-vous"/"Ouvrir dans l'agenda"
            actions, the denser `variant="row"` for history; opens the
            shared `AppointmentDrawer` read-only, no lifecycle mutation),
            `components/patient-appointment-filters.tsx` (Tous/À venir/
            Terminés/Annulés/Absents, the same segmented-toggle visual as
            Agenda's Day/Week switch, plus a live result count).
            **Prototype limitation (UI-004B §9):** Agenda owns the one
            mutable appointment array (UI-002); this tab only reads the
            seed fixtures, so a status change made in Agenda during a
            session does not appear here and vice versa — real
            synchronization is a backend-integration concern, same
            reasoning as the create/edit limitation above. "+ Nouveau RDV"
            and "Ouvrir dans l'agenda" are plain links to `/app/agenda`, no
            query-param prefill — UI-002's `AppointmentFormDialog` remains
            the only appointment-creation UX. Traitements/Séances tab
            (UI-004C): `mock-treatments-data.ts` (centralized synthetic
            treatment-plan fixtures — pat-1's active 20-session plan,
            pat-3's completed plan, pat-2 has none), `treatments.ts`
            (filter-by-patientId, active/completed split, session-status
            counts, "prochaine séance" lookup, `getActiveTreatmentSummary`),
            `components/patient-treatments-content.tsx` (the tab
            composition), `components/treatment-detail-drawer.tsx` (one
            `Dialog` instance with two internal views — treatment and a
            selected session — rather than a second nested drawer; the
            parent increments a `key` on every open to reset the internal
            session-selection state, mirroring Agenda's `formDialogKey`
            pattern, instead of a reset effect). **Overview consistency
            (UI-004C §33):** `mock-overview-data.ts`'s
            `getPatientOverview` derives `activeTreatment` from these same
            treatment fixtures (`getActiveTreatmentSummary`) instead of a
            hand-typed number, so the Aperçu card and the Treatments tab
            can never disagree. "+ Nouveau traitement" and a completed
            session's "Voir la consultation" both show a future-feature
            notice rather than a real workflow; "Voir la facturation" is a
            real link to the `/invoices` tab, with no finance figures
            anywhere in the treatment drawer. Factures/Installments tab
            (UI-004D): `mock-invoices-data.ts` (centralized synthetic
            invoice fixtures — pat-1's partial invoice carries the full
            six-installment staged-payment schedule plus a paid and a
            cancelled invoice, pat-4 is fully paid, pat-9 has one overdue
            invoice, pat-2 has none), `finance.ts` (filter-by-patientId,
            the four-group filter, `getFinancialSummary` — excludes
            cancelled invoices from the aggregate — `findNextInstallment`,
            `getPatientFinancialSummary`), `components/patient-invoices-content.tsx`
            (the tab composition), `components/invoice-detail-drawer.tsx`
            (one `Dialog` instance, unmodified drawer width; looks its
            linked `TreatmentPlan` up by id from UI-004C's own fixtures
            rather than duplicating a title). **Overview/header
            consistency (UI-004D §15-16):** `getPatientFinancialSummary`
            returns `null` for any patient with no invoice fixtures, so
            `PatientDetailPage`'s header balance and
            `mock-overview-data.ts`'s next-installment fall back to the
            existing per-patient values unchanged for every seed patient
            this task didn't add invoices for — only the 4 patients that
            actually have invoice fixtures get a derived balance, avoiding
            a wide refactor of the other 12. "+ Nouvelle facture" and
            "Télécharger PDF"/"Imprimer" show a future-feature notice;
            "Encaisser" only navigates to the `/payments` tab and never
            renders for a paid or cancelled invoice. Paiements tab
            (UI-004E): `mock-payments-data.ts` (centralized synthetic
            payment/allocation/receipt fixtures — every posted payment's
            allocations reconcile exactly with UI-004D's own invoice
            `paidAmount`/paid-installment fixtures; pat-9 carries one
            deliberately reversed payment, which is why its invoice still
            shows the full amount overdue rather than an oversight),
            `payments.ts` (filter-by-patientId, `getPaymentSummary` and
            `getEffectivePaidAmount` — both exclude reversed payments,
            `computeEffectiveRemaining`/`getAllocatableInvoices`/
            `getPayableInstallments` — pure functions the capture dialog
            uses to compute an allocatable balance without mutating any
            invoice), `components/patient-payments-content.tsx` (the tab
            composition), `components/patient-payment-capture-dialog.tsx`
            (the Encaisser prototype — an installment target locks the
            amount to its exact value, no partial-installment lifecycle;
            only an invoice with no installment schedule of its own allows
            a free amount up to its remaining balance),
            `components/payment-detail-drawer.tsx` (read-only — no
            edit/delete anywhere, a posted payment is financially
            historical per CLAUDE.md §24). **Local-session payment state
            (UI-004E §33-34):** a captured payment is appended only to
            `PatientPaymentsContent`'s own `localPayments` state, never
            written back into the UI-004D invoice fixtures — invoices stay
            the authoritative prototype balance schedule, payments are
            historical evidence explaining them. This is the same
            "no global store to paper over a prototype seam" principle as
            UI-004A §7/UI-004B §9 above, applied to a same-route local
            mutation instead of a cross-route read: navigating away from
            Paiements and back resets to the seed state. Dossier Santé tab
            (UI-005A): `mock-medical-profiles-data.ts` (centralized
            synthetic profile fixtures — pat-1/Ahmed fully populated
            including one "important" allergy, pat-3/Fatima partially
            populated — some history, no allergies/medications, pat-2/Sara
            has no fixture at all), `medical-profile.ts`
            (`getMedicalProfileForPatient`, `isMedicalProfileEmpty` — `null`
            and "every section empty" are treated identically),
            `components/patient-health-content.tsx` (the tab composition —
            important information only, no active consultation/
            prescriptions/documents, those are UI-005C/D),
            `components/medical-profile-edit-drawer.tsx` (the edit surface
            — see the `clinical/master-data.ts` note below for how its
            three category pickers reuse `Combobox`). Edits are kept only
            in `PatientHealthContent`'s own local state — the same
            local-session-state convention as UI-004E's payment capture
            immediately above, and for the same reason: no LocalStorage/
            IndexedDB/cookie ever holds this clinical data (CLAUDE.md §7).
            **Clinical history (UI-005B):** below the important-information
            cards, the same tab renders `components/clinical-history-
            section.tsx` (`ClinicalHistorySection`) — `mock-clinical-
            encounters-data.ts` (centralized synthetic `ClinicalEncounter`
            fixtures: pat-1/Ahmed has two completed consultations plus one
            completed treatment session that intentionally reuses the exact
            date/practitioner/appointment reference of the "Rééducation
            genou" plan's 6th completed session rather than inventing a
            contradicting duplicate, Spec §12; pat-3/Fatima has a populated
            `MedicalProfile` but no clinical-history fixture at all,
            demonstrating "profile without history"; pat-2/Sara has neither,
            demonstrating the fully empty Dossier Santé), `clinical-
            history.ts` (`getEncountersForPatient`/`sortEncountersDesc`/
            `matchesClinicalHistoryFilter`/`groupEncountersByDate` — pure
            derivation, mirrors `patient-appointments.ts`'s own shape),
            `components/consultation-detail-drawer.tsx` (read-only — no
            edit/delete/reopen anywhere; a completed clinical record is not
            ordinary CRUD, CLAUDE.md §24). A session encounter never opens
            a second detail drawer — it links to `/app/patients/{id}/
            treatments` instead ("Voir le traitement"), reusing UI-004C's
            own treatment/session detail rather than duplicating it (§25-26
            of the task). Loading/error stay a single unified state for the
            whole Dossier Santé tab (both the medical profile and the
            clinical history are the same frontend-only prototype fixture
            read, so there is no real network boundary to split them on).
            **Active consultation workspace (UI-005C):** a dedicated
            route, `app/app/patients/[id]/consultations/[consultationId]/
            page.tsx`, composed from `consultation-workspace-page.tsx`
            (`ConsultationWorkspacePage`) — independently addressable
            rather than a sixth Patient 360° tab, since it is a focused
            clinical task surface, not a browsing view. It deliberately
            does not reuse `PatientHeader`/`Tabs` (that shell shows the
            patient's financial balance, forbidden here by CLAUDE.md §40)
            or UI-005A's `MedicalProfileEditDrawer` (context here is
            strictly read-only — the existing Dossier Santé editor remains
            the sole place to edit a MedicalProfile). New
            `mock-active-consultations-data.ts` (cons-1/pat-1 draft,
            cons-2/pat-4 completed — kept on a different patient than the
            draft to avoid narrative overlap) and `active-
            consultation.ts` (`isConsultationCompletionValid`,
            `isConsultationDirty`, `toClinicalEncounter` — see the
            `domain/clinical/` note above for the shared read-only
            pieces this reuses). **Prototype lifecycle boundary,
            deliberately not engineered around:** completing a
            consultation only changes this component's own local state —
            it is never written back into UI-005B's
            `mock-clinical-encounters-data.ts`, no `/health` navigation or
            Agenda appointment status is touched, and no global store
            (Redux/Zustand/localStorage) was introduced purely to fake any
            of that cross-route effect; `toClinicalEncounter` and its
            tests are the proof the transformation itself is correct, real
            cross-route persistence waits for the backend. **Unsaved-
            changes warning, kept intentionally minimal:** the back link
            to Dossier Santé is a plain, unguarded `Link` — no
            `beforeunload`/router-interception was added (no precedent for
            programmatic `useRouter` navigation exists anywhere else in
            this codebase); a persistent "Modifications non enregistrées"
            indicator is the chosen bounded warning instead, visible
            before the practitioner navigates away.
            **Documents & Ordonnances (UI-005D):** the last two Dossier
            Santé sections, both below Historique clinique — never a
            seventh Patient 360° tab (§6). `mock-clinical-documents-
            data.ts` (pat-1/Ahmed has four documents, three cross-
            referencing UI-005B's own `enc-1`/`enc-2`/`enc-3`
            `ClinicalEncounter` fixtures rather than inventing
            contradicting consultation references, plus one externally-
            scanned `"prescription"`-category document with no
            consultation reference — demonstrating that document
            category exists independently of the structured
            `Prescription` records below; the two are never auto-
            synchronized, §42) and `clinical-documents.ts` (pure
            filter/sort derivation, mirrors `clinical-history.ts`'s own
            shape). `components/documents-section.tsx`
            (`DocumentsSection`): the exact same filter-tab architecture
            as `ClinicalHistorySection` (Tous/Analyses/Imagerie/Comptes-
            rendus/Ordonnances/Autres, its own filtered-empty state and
            result count), `document-upload-dialog.tsx`
            (`DocumentUploadDialog` — a native `<input type="file">`, no
            new FileUpload infrastructure, §18) whose `onChange` reads
            only `file.name`/`file.type`/`file.size`; the file's contents
            are never accessed anywhere (no `FileReader`, no Base64, no
            `ObjectURL`, §19 — verified by a dedicated test asserting
            every stored fixture field is a string/number/undefined,
            never a `Blob`/`File`). No numeric file-size limit was
            invented: Spec #5 §29 names file size as a validation concern
            only in the abstract, with no concrete number anywhere in the
            specifications, and this task's own §21 explicitly forbids
            inventing production security policy without a documented
            basis — so only the MIME allowlist
            (`application/pdf`/`image/jpeg`/`image/png`) is enforced.
            `document-detail-drawer.tsx` (`DocumentDetailDrawer`) is
            read-only — "Télécharger" only ever shows a future-feature
            Toast, never a real file access (§15); no delete anywhere
            (§24). `mock-prescriptions-data.ts`/`prescriptions.ts`
            (`generatePrescriptionNumber` mirrors `generatePaymentNumber`'s
            own illustrative sequential-numbering convention, `ORD-2026-
            ####`) and `components/prescriptions-section.tsx`
            (`PrescriptionsSection`): newest-first history,
            `prescription-form-dialog.tsx` (`PrescriptionFormDialog`) — a
            dynamic medication-item list (add/remove any row, including
            down to zero — removal is never restricted; a clear "at least
            one medication required" error appears on submit instead,
            §34), each item validated for medication/dosage/frequency
            only, duration/instructions staying optional (§35). **No drug
            database, no autocomplete, no dosage/interaction/
            contraindication checking anywhere in this diff** — the
            task's own mandatory §27 constraint, and the most important
            boundary in this task. `prescription-detail-drawer.tsx`
            (`PrescriptionDetailDrawer`) is read-only — no Modifier/
            Supprimer anywhere; "Télécharger PDF"/"Imprimer" are
            prototype affordances only (§40); an optional "Consultation
            associée" section resolves the prescription's
            `consultationId` against UI-005B's own `ClinicalEncounter`
            fixtures, read-only, never mutating that historical record
            (§38). A newly uploaded document and a newly created
            prescription both live only in their own section's local
            component state — the same "local session state, not a
            global store" convention as every prior Dossier Santé
            prototype interaction. This completes the Patient 360°
            clinical frontend prototype sequence (UI-005A/B/C/D).

  clinical/ Bounded prototype clinical master-data catalog (UI-005A §12-14,
            Spec #2 §17.2's "search by keyword / select predefined / add
            custom" form philosophy) — not a database-backed master-data
            management module. `master-data.ts`: `getClinicalMasterData()`
            (6 allergies / 6 history items / 5 medications, FR+AR labels),
            `searchClinicalMasterData` (case- and accent-insensitive via
            NFD normalization — no fuzzy/AI matching), `getMasterDataLabel`
            (locale-resolved display label). **Multi-select via a
            single-select primitive:** each of the edit drawer's three
            category pickers is a `Combobox` (`components/ui/combobox.tsx`)
            whose own committed `value` is always kept `null` by the
            caller — a selection is immediately appended to a local chip
            list and the field clears for the next search, instead of the
            combobox holding one committed value. This reuses `Combobox`
            entirely unmodified for the search/select/keyboard-navigation
            mechanics; the only change to the shared primitive itself is
            that `onCreate` now receives the current query text (a small,
            backward-compatible extension — the one pre-existing caller,
            Agenda's quick-create-patient action, ignores the argument),
            which is what lets a caller create a custom entry from
            whatever the practitioner actually typed (§15) without a
            second, separate multi-select autocomplete system (§27).
            Already-selected master-data items are filtered out of the
            next search's suggestion list by the caller, which is also
            what prevents a duplicate predefined selection (§50) — no
            extra bookkeeping inside `Combobox` itself.

  finance/  Cabinet Finance dashboard composition (UI-006A) — deliberately
            separate from `features/patients/`'s own Factures/Paiements
            tab code, even though both read the same underlying
            `Invoice`/`Payment` fixtures (CLAUDE.md §12/§19: cabinet
            Finance and Patient 360° are different views of shared
            records, never a duplicated dataset). `aggregations.ts` is
            the reuse boundary and the convention future UI-006B/C/D/E
            tasks should follow: `computeReceivableAndOverdue` calls
            `getFinancialSummary` (`features/patients/finance.ts`,
            UI-004D) unmodified, and `computeCollected` calls
            `getEffectivePaidAmount` (`features/patients/payments.ts`,
            UI-004E) unmodified after period-filtering — cabinet KPIs can
            never independently drift from Patient 360°'s own numbers.
            À encaisser/En retard are deliberately not period-scoped
            (current balances, not a period activity flow) while
            Encaissé/Décaissements do recompute per period — documented
            directly in `aggregations.ts`, not left implicit.
            `getPeriodRange` resolves Aujourd'hui/Cette
            semaine/Ce mois against the same fixed `MOCK_BUSINESS_DATE`
            convention as Aujourd'hui/Agenda, reusing Agenda's own
            `getWeekStart` (`features/agenda/format.ts`) for the week
            boundary rather than a second week rule. `mock-expenses-
            data.ts` is a small, read-only, cabinet-only synthetic
            `CabinetExpense` fixture set (type added to `components/
            domain/finance/types.ts`, alongside the existing Invoice/
            Payment) — it exists solely to give the Décaissements KPI/
            activity something real to aggregate; no expense-entry UI
            reads or writes it (UI-006D's own scope). `finance-dashboard.tsx`
            (loading/loaded/error states, mirroring every other
            top-level screen's own `state` prop convention) composes
            `components/` (FinanceNav, PeriodSelector, KpiSummary,
            DashboardCaisseSection, ReceivablesSection,
            RecentActivitySection, FinanceDashboardSkeleton). Receivables
            navigate to the existing `/app/patients/{id}/invoices` route
            instead of a duplicate detail drawer (§24); "Voir toutes les
            factures" now navigates to `/app/finance/invoices` (UI-006B —
            it was a future-feature Toast notice until that screen
            existed).
            UI-006X removed the dashboard's own "Position caisse"
            projection entirely (it was a documented prototype-only
            formula — opening 500 MAD + period collected − period
            disbursed, never a real Caisse session result) once a real
            one existed to show instead: `DashboardCaisseSection` reuses
            `getDefaultOpenSessionMockData`/`buildCashMovements`/
            `computeIncomingTotal`/`computeOutgoingTotal`/
            `computeTheoreticalBalance`/`CaisseSummary` verbatim from
            `features/caisse/` (below) — never a second cash-position
            formula. `computeCashPosition`/`OPENING_CASH_POSITION` were
            removed from `aggregations.ts` along with it (and
            `cashPosition` from `FinanceKpis`); `computeCashBalance` (the
            actually-shared arithmetic) stays, now with exactly one
            caller — Caisse's own `computeTheoreticalBalance`.
            `ReceivablesSection`'s heading became "À traiter" with an
            overdue-vs-to-collect summary line computed by
            filtering/summing the already-built `receivables` array in
            the component itself — not a new total, not rebuilt priority
            logic. `RecentActivitySection` rows became real navigation
            (payment → the patient's own Paiements route, expense →
            `/app/finance/expenses`), mirroring `CaisseMovementList`'s own
            navigable-row convention exactly.
            `features/finance/components/finance-nav.tsx` (`FinanceNav`,
            UI-006X) is the shared Finance workspace section nav —
            Vue d'ensemble/Factures/Caisse/Décaissements, integrated
            identically into all four Finance routes right after each
            page's own `PageHeader`. It is a thin wrapper around the
            existing generic `Tabs` primitive (Spec #8 §48, already
            backing Patient 360°'s own tab bar) rather than a new nav
            component — real `<Link>`s, `aria-current`, mobile
            horizontal-scroll and RTL-safe logical-property spacing all
            came from `Tabs` unmodified. Active-state resolution
            (`resolveActiveSection`) is exact/path-aware: `/app/finance`
            matches only the literal route via equality, everything else
            via `startsWith` on its own sub-path — never a blanket
            `startsWith("/app/finance")` that would keep "Vue d'ensemble"
            active on every nested route. Only four of Spec #9 Screen
            24's own six wireframed tabs are included (Échéances/
            Encaissements have no route yet — including them would link
            to nothing); this is the task's own explicit instruction
            taking priority over the wireframe (CLAUDE.md §1). Does not
            appear in the main sidebar (`lib/nav-config.ts`) — Finance
            stays one sidebar module; `FinanceNav` is purely the
            workspace's own internal chrome, reused across
            `features/finance/`'s and `features/caisse/`'s own page
            components (the same cross-feature-directory import pattern
            already established by UI-006C/D reusing `features/finance/
            format.ts`/`mock-expenses-data.ts`).
            UI-006B adds `global-invoices.ts` and
            `global-invoices-page.tsx` alongside the dashboard code
            above, for `/app/finance/invoices` — the cabinet-wide
            operational invoice workspace, distinct from both the
            dashboard's compact Receivables list and Patient 360°'s own
            Factures tab. `buildGlobalInvoiceRows` resolves every cabinet
            invoice (not just one patient's) into a `GlobalInvoiceRow`
            that keeps the full `Invoice` embedded rather than
            flattening total/paid/remaining onto the row — the same
            "derive, never duplicate" discipline as `aggregations.ts`
            above. Its own five-value status filter
            (`GlobalInvoiceFilterGroup`) is a second, deliberately
            distinct taxonomy from `features/patients/finance.ts`'s own
            patient-scoped `InvoiceFilterGroup` (documented in both
            files) — the task's own instructions required splitting
            issued/partially_paid into two separate filters here, so
            reusing the patient-scoped one outright was not an option;
            reproducing its underlying `InvoiceStatus` switch instead of
            a same-shaped copy was.
            `GlobalInvoiceTable`/`GlobalInvoiceCardList` mirror
            `features/patients/components/patient-table.tsx`'s/
            `patient-card-list.tsx`'s exact `hidden overflow-x-auto
            md:block` / `divide-y ... md:hidden` dual-render convention
            — the established responsive pattern for any tabular data in
            this codebase, not reinvented here.
            UI-006D adds `expenses.ts` and `expenses-page.tsx` for
            `/app/finance/expenses` — the cabinet cash-expense capture
            workspace, scoped to `MOCK_BUSINESS_DATE` only (like
            `caisse/` itself below) rather than a broader filterable
            ledger, since a décaissement is a cash-register operation
            tied to the currently open session, not an accounting
            history browser (documented deviation from Spec #9 Screen
            32's own Période/Catégorie filters). `createExpenseAndMovement`
            is the reuse-and-integrity boundary: a pure function
            returning a matching `CabinetExpense` + `CashMovement` OUT
            pair whose direction/type/`expenseId`/amount are consistent
            by construction, applied to local state together in the
            page's one create handler (never an intermediate render
            where one exists without the other). It never renders
            Caisse's own theoretical-balance summary (`caisse/`'s own
            scope) — the balance-decrease relationship is instead proven
            directly against `features/caisse/calculations.ts`'s
            exported functions in `expenses.test.ts`, and a persistent
            "Voir la caisse" link is the only cross-page connection
            (cross-route prototype state is not expected to survive
            navigation, same as UI-006C's own documented boundary). The
            supporting-document file input reuses the exact PDF/JPEG/PNG
            allowlist and metadata-only discipline UI-005D's clinical-
            document upload already established, rather than a second
            policy.

  caisse/   Today's cash register (UI-006C), at `/app/finance/caisse`
            (Spec #2's own IA sitemap nests Caisse under Finance — not a
            standalone top-level route). `calculations.ts`'s
            `buildCashMovements` is the reuse boundary: it derives every
            movement from the *existing* posted/cash-method Payment
            fixtures (UI-004E) and posted CabinetExpense fixtures
            (UI-006A) matching the session's own business date —
            reversed payments and cancelled expenses excluded by the
            same filters those modules already established, never a
            second movement-authoring path. Since neither source fixture
            tracks a real time-of-day, a small deterministic
            synthetic-time generator (stable sort key → index → `HH:MM`)
            gives each derived movement a reproducible display time
            without hand-mapping specific fixture ids. Theoretical
            balance reuses `computeCashBalance`
            (`features/finance/aggregations.ts`, `opening + in − out`) —
            the one arithmetic primitive shared with the Finance
            dashboard's own `DashboardCaisseSection` (UI-006X); no second
            copy of the formula anywhere.
            `caisse-page.tsx` takes an `initialSession: CashSession |
            null` prop — omitted for the live default (already open, so
            movement history is inspectable immediately), or `null` to
            exercise the closed/opening-workflow path — mirroring every
            other top-level screen's own `state`/data prop-seam
            convention. `components/` (ClosedCaissePanel, CaisseSummary
            — Spec #8 §69's own named component, CaisseMovementList,
            CaisseSkeleton).
            UI-006E adds the closing/reconciliation half of the
            lifecycle, entirely inside this same route (no
            `/app/finance/caisse/closing`, per the task's own explicit
            instruction). `CaissePage` now branches on three states
            instead of two: `session === null` (opening panel), `session.
            status === "open"` (unchanged), `session.status === "closed"`
            (new — `ClosedCaisseSummary`, read-only, no path back to the
            opening panel — no Caisse reopening in this prototype). The
            movement-history section was hoisted out of the open-only
            branch so it renders for both open and closed sessions,
            using the exact same `buildCashMovements` call, now gated on
            `session !== null` instead of `isOpen`.
            `calculations.ts` gains `computeCashDifference` (physical
            minus expected — the task's own explicitly-flagged-critical
            operand order, never reversed) and `resolveCashDifferenceType`.
            Physical-count validation reuses `isValidOpeningBalance`
            as-is rather than a new function — the rule (whole-MAD,
            `>= 0`) is genuinely identical, not just similarly shaped.
            The closing flow is two dialogs in sequence, mirroring
            Agenda's own `CancelConfirmDialog` form-then-confirm
            convention: `CashCountDialog` (recap + physical-count input +
            live écart + a reason `Textarea` that only appears once the
            difference is non-zero) hands its validated result to
            `CloseConfirmDialog` (a thin wrapper around the existing
            `ConfirmDialog` primitive) for an explicit second
            confirmation before the actual mutation — "Continuer" alone
            never closes the register. `ClosedCaisseSummary` shows
            opening/incoming/outgoing derived live from the same
            immutable movement history, but théorique/compté/écart from
            the session's own *frozen* closing fields — never
            recomputed after closing (CLAUDE.md §24: closed-session
            figures are financial history). `mock-data.ts` adds one
            deterministic constant, `SESSION_CLOSED_AT`; `closedBy`
            reuses the session's own `openedBy` rather than a second
            identity constant (this prototype has no multi-shift/handoff
            concept).

  team/     Équipe team directory + employee profile (UI-007A), at
            `/app/equipe` and nested `/app/equipe/[id]` — the sidebar's
            pre-existing "Équipe" link (unchanged since TASK-003) now
            resolves here instead of the `[...slug]` catch-all; no
            `nav-config.ts` change was needed. `team-page.tsx` mirrors
            `features/patients/patients-page.tsx`'s architecture: one
            centralized `TeamMember[]` array backs search (name/employee
            number/phone/email — phone normalized via
            `features/patients/normalize.ts`'s `normalizePhoneDigits`,
            reused rather than reimplemented), a role filter (built only
            from roles actually present, never a permanently-empty
            option) and a status filter, composing together and reset by
            "Effacer les filtres." No `Pagination` — `filter-team-
            members.ts` operates over the full ~8-member fixture set
            directly, a documented decision (task §25), not an omission.
            `components/` (`TeamTable`/`TeamCardList` — desktop table +
            mobile card dual-render, mirroring `PatientTable`/
            `PatientCardList`'s exact convention including which columns
            hide first on tablet; `TeamFilters`; `TeamMemberFormDialog` —
            bounded create/edit, mirroring `PatientFormDialog`'s drawer/
            validate/submit shape and reusing `isValidEmail`/
            `isValidMoroccanPhone` from `features/patients/patient-form-
            validation.ts` unmodified, deliberately with no duplicate-
            detection and no contract/schedule/payroll/document fields;
            `TeamSkeleton`/`TeamMemberDetailSkeleton`).
            `employee-number.ts`'s `generateEmployeeNumber` mirrors
            `features/patients/patient-number.ts`'s
            `generatePatientNumber` exactly, producing `EMP-####`.
            `mock-data.ts`'s 8 synthetic fixtures were chosen to share no
            first/last-name fragment with any seeded patient
            (`features/patients/mock-data.ts`) — except the two team
            members who are also existing practitioner identities
            (Youssef Benali/`pr-1`, Amal Idrissi/`pr-2`), which
            deliberately reuse Agenda's own established names/ids
            instead of inventing new ones not to contradict them
            (task §16), proven by a dedicated fixture-integrity test
            (`mock-data.test.ts`) rather than left to accidental
            agreement.
            `team-member-detail-page.tsx` (Spec #9 Screen 34) rendered
            only the "Profil" surface in UI-007A — no tab bar. UI-007B
            evolves it into the Employee 360° shell: header (extracted,
            unchanged, into `team-member-header.tsx`) + `team-member-
            nav.tsx`'s `TeamMemberNav` (Profil/Contrat/Planning, real
            per-member links + `aria-current`, mirroring
            `PatientDetailPage`'s own explicit-`activeTab`-prop `Tabs`
            usage rather than `FinanceNav`'s `usePathname`-prefix
            pattern — that pattern only works for non-parameterized
            routes, and this nav sits under a per-member `[id]`) + one
            of three sibling content components switched on `activeTab`.
            Présence/Congés/Paie/Commissions (Screen 34's later tabs)
            are not shown at all — no route exists yet, and the task's
            own §7 default is "otherwise show only currently implemented
            items," not disabled placeholders. Two new nested routes:
            `/app/equipe/[id]/contract`, `/app/equipe/[id]/schedule`.
            `team-member-profile-content.tsx` is UI-007A's own former
            body, moved verbatim (the pre-existing UI-007A test suite
            passes byte-for-byte unmodified — a behavior-preserving
            refactor, not a rewrite) — still reuses the same
            `TeamMemberFormDialog` for its own "Modifier" action, edits
            still page-local only (UI-004A §7's documented limitation).
            `team-member-contract-content.tsx` — read-only contract
            summary (or a restrained empty state for a member with none,
            §21D, no "create a contract" action) + bounded edit via
            `contract-form-dialog.tsx`'s `ContractFormDialog`
            (edit-only, mirrors `TeamMemberFormDialog`'s shape).
            `features/team/contracts.ts`'s `getCurrentContract` prefers
            the active contract, falling back to the most recently
            started historical one, then `null` (§22 — no contract-
            versioning UI). `mock-contracts-data.ts` (7 fixtures) covers
            all four required scenarios (§21 A-D), teamMemberId
            integrity-tested.
            `team-member-schedule-content.tsx` — a read-only weekly grid
            (`Repos` for a day with no intervals; comma-joined times for
            a split-shift day) + bounded edit via `work-schedule-form-
            dialog.tsx`'s `WorkScheduleFormDialog` — a "Travaillé"/
            "Repos" `Select` per weekday (reusing the existing `Select`
            rather than introducing a Checkbox primitive the codebase
            doesn't have), up to 2 time intervals when worked, validated
            for individual validity and same-day non-overlap. Submit
            always replaces the member's *entire* interval set for that
            weekday's own model — never a per-interval CRUD surface,
            mirroring `CashCountDialog`'s own "one validated result
            object" shape (UI-006E). `features/team/schedule.ts` reuses
            `parseTimeToMinutes` from `features/agenda/format.ts` (a
            genuinely generic time-of-day primitive, not appointment-
            specific) for `computeWeeklyScheduledHours`/
            `isValidWorkInterval`/`intervalsAreSequential`, plus a
            round-trip pair (`buildInitialWorkWeekFormValues` /
            `buildIntervalsFromWorkWeekFormValues`) between the current
            interval list and the editor's own bounded per-weekday form
            state. `mock-schedule-data.ts` gives the two practitioners
            (team-1/2) a realistic split shift (morning + afternoon
            across a lunch break, plus a shorter Saturday) demonstrating
            §7; four other members get one interval per weekday; two
            deliberately have no schedule at all (the same two members
            who already have no/ended contracts, rather than a new
            fixture just for that state) — every scheduled member's own
            `computeWeeklyScheduledHours` matches their own contract's
            `weeklyHours` exactly, integrity-tested rather than left to
            accidental agreement between the two fixture files.

            UI-007CDEF adds the four remaining Employee 360° tabs —
            Présence/Congés/Paie/Commissions — across `features/team/`'s
            own `attendance.ts`/`leave.ts`/`payroll.ts`/`commissions.ts`
            (pure functions) and their matching `mock-*-data.ts` fixture
            files, `components/team-member-attendance-content.tsx`/
            `team-member-leave-content.tsx`/`team-member-payroll-content.tsx`/
            `team-member-commissions-content.tsx` (the four tab bodies),
            plus a new cabinet-level `team-attendance-page.tsx` at
            `/app/equipe/attendance` (reached from the Équipe directory's
            own header, §66 — no new main-sidebar entry). `TeamMemberNav`
            grew a `showCommissions` prop (§8/§52/§62) — the tab is
            omitted entirely, never shown disabled, for anyone without
            `role === "practitioner"` and a real `practitionerId`.

            **The required cross-HR source-of-truth chain (§64)**,
            enforced by construction and proven end to end by
            `cross-hr-integrity.test.ts`:

            ```text
            EmploymentContract (UI-007B)
                    |
                    +-- employment context (jobTitle, dates)

            WorkInterval (UI-007B)
                    |
                    v
            attendance.ts: getExpectedIntervalsForDate
                    |
                    v
            AttendanceRecord (checkIn?/checkOut?)
                    |
                    v
            attendance.ts: computeAttendance
              (workedMinutes/lateMinutes/overtimeMinutes — derived, never stored)
                    |
                    v
            payroll.ts: computePeriodOvertimeMinutes
                    |
                    v
            PayrollEntry.overtimeMinutes (duration only, never monetized, §43)

            LeaveRequest (status === "approved")
                    |
                    v
            leave.ts: doesApprovedLeaveCoverDate
                    |
                    v
            TeamMemberAttendanceContent's "En congé" presentation (§33)

            features/patients/mock-invoices-data.ts + mock-payments-data.ts
              (existing UI-004D/E fixtures, never duplicated)
                    |
                    v
            commissions.ts: getEligibleCommissionActivity
              (practitionerId -> Agenda PRACTITIONERS -> Invoice.practitionerName)
                    |
                    v
            commissions.ts: computeCommissionAmount
                    |
                    v
            PayrollEntry.commissionAmount (§61 — reconciled, never a second figure)
            ```

            `attendance.ts`'s `computeWorkedMinutes` is the one
            non-obvious calculation: for a split-shift day it subtracts
            only the *unpaid gap between* the day's own two expected
            intervals (the lunch break) from the raw check-in/check-out
            span — never a naive "checkout minus checkin," which would
            silently count the break as worked time (the task's own
            explicit warning, §18). `resolveCabinetBucket` is a second,
            deliberately different view of the same `AttendanceStatus`
            for the cabinet workspace's own 4-bucket summary (PRÉSENTS/EN
            RETARD/ABSENTS/NON POINTÉS) — a late-then-completed day stays
            "En retard" there even though the per-employee Présence tab
            itself still shows the richer "Terminé" lifecycle status; a
            self-caught bug where the cabinet table's own row badge
            originally used the ungrouped 5-value status (silently
            contradicting its own summary counts) was fixed by reusing
            `resolveCabinetBucket` for the row too, not just the totals.
            `leave.ts`'s `applyApprovedLeaveToBalance` only ever runs on
            approval — a pending or rejected request never touches
            `available`/`used` (§35). `payroll.ts`'s `computeGrossPayable`
            deliberately never reads `overtimeMinutes` — no monetary
            overtime rate is defined by the approved specifications, so
            overtime duration is shown but never paid in this prototype
            (§43). `commissions.ts`'s `getEligibleCommissionActivity`
            sums each payment's own *allocation* amount (not the whole
            payment), so a hypothetical multi-invoice payment could never
            be double-counted onto one practitioner (Spec #3 WF-40's own
            acceptance criterion).

            UI-LEAVE-X adds a cabinet-wide Leave Agenda,
            `team-leave-calendar-page.tsx` at `/app/equipe/leave-calendar`
            (a static route sibling of `/app/equipe/[id]`, mirroring
            `team-attendance-page.tsx`'s exact precedent; reached from the
            Équipe directory's own header, alongside "Présence du jour" —
            no new main-sidebar entry, ADR-015). It is a **pure read
            projection** over the existing `LeaveRequest[]`/`TeamMember[]`
            — `features/team/leave-calendar.ts`'s `LeaveCalendarEvent` is
            a derived view model (one per `LeaveRequest`, never a second
            authoritative record) built by `buildLeaveCalendarEvents`,
            which the Month/Week/List views (`components/leave-calendar-
            {month,week,list}-view.tsx`) and the read-only
            `leave-event-drawer.tsx` all consume identically — "Voir la
            demande" only ever links to the existing per-employee Congés
            tab (`TeamMemberLeaveContent`), never a second create/approve/
            reject surface. A multi-day request repeats across every date
            it spans (`doesEventCoverDate`, `date >= start && date <=
            end`) — never only its start date. `getApprovedTeamMembersAway`/
            `countApprovedPractitionersAway` only ever count
            `status === "approved"` — pending/rejected never contribute to
            confirmed-absence visibility, independent of whatever the
            page's own Status filter is currently showing (ADR-015 §3-4).
            Practitioner-overlap derives from `TeamRole === "practitioner"`,
            deliberately not the narrower Agenda `practitionerId` link that
            Commission eligibility (Gate 4, above) requires (ADR-015 §2).
            Dashboard metrics (`En congé aujourd'hui`/`Demandes en
            attente`/`Absences planifiées ce mois`) are always whole-
            cabinet and anchored to the real business date, never scoped
            to the currently browsed period (ADR-015 §4). Cabinet-level
            closure context (`getCabinetClosureForDate`) reuses
            `features/parametres/calendar-exceptions.ts`'s
            `resolveEffectiveCabinetAvailability` outright — a genuine
            `CabinetCalendarException` closure surfaces as a distinct
            "Cabinet fermé" badge, never converted into a per-employee
            `LeaveRequest` (ADR-015 §5): Cabinet closure and Employee
            leave remain two separate concepts that can independently
            co-occur on the same date (`cal-exc-3`'s 2026-08-26 closure
            and Amal Idrissi's own approved leave both real, both shown).
            `lr-5`/`lr-6` extend `mock-leave-data.ts`'s existing single
            `LeaveRequest[]` fixture array (never a second fixture
            universe, ADR-015 §1) with the one real scenario the prior 4
            fixtures never demonstrated: two team members simultaneously
            on approved leave.

  documents/
            Shared document-generation architecture (UI-DOCS-X, ADR-016)
            — activates real client-side PDF generation for the Invoice,
            Receipt, Prescription and Payslip detail drawers/dialogs,
            which previously only showed a future-feature toast for
            "Télécharger PDF"/"Imprimer". A `GeneratedDocumentBase` shape
            (`types.ts`) is projected from the existing domain record by
            one pure `buildXDocument()` function per type
            (`invoice-document.ts`/`receipt-document.ts`/
            `prescription-document.ts`/`payslip-document.ts`) — every
            amount/date is read directly off the existing `Invoice`/
            `Payment`+`Receipt`/`Prescription`/`PayrollEntry`, never
            recalculated with a second formula (proven by direct
            reconciliation assertions in each builder's own test file).
            One `<XDocumentPdf>` render component per type shares
            `pdf-shell.tsx` (cabinet-identity header/footer) and
            `pdf-styles.ts` (same hex palette as `design-system/
            tokens.css`) — the calling drawer/dialog already IS the
            document's Preview surface (task's own §9), so no second
            "Aperçu" dialog exists anywhere. `download.ts` is the single
            generate/download/print mechanism
            (`generateDocumentBlob`/`triggerBlobDownload`/
            `triggerBlobPrint`) every one of the four document types
            shares — no per-feature duplication. `filename.ts` builds
            sanitized, human-facing filenames (e.g.
            `Facture-FAC-2026-00143.pdf`), never an internal id.

            PDF technology is `@react-pdf/renderer` 4.9.0 (ADR-016) — it
            renders structured primitives via `pdfkit`, not an HTML
            rasterization shortcut, and is the only realistic option that
            supports real embedded-font glyph shaping (jsPDF has no
            Arabic contextual-shaping engine at all). Real end-to-end
            generation is proven by `pdf-generation.test.ts` via
            `renderToBuffer`, not just data-model unit tests, and the
            resulting files were visually inspected through an
            independent renderer (poppler `pdftoppm`) per the task's own
            explicit visual-QA requirement.

            **Arabic document generation is deliberately gated off, not
            shipped** — `capabilities.ts`'s `isDocumentLanguageSupported`
            blocks `Télécharger`/`Imprimer` whenever a cabinet's Document
            language (`DocumentSettings.documentLanguage`, Paramètres →
            Documents) is Arabic, showing a real translated notice
            instead. Real visual QA of the rendered PDFs found
            `@react-pdf/renderer`'s Arabic text-shaping pipeline drops or
            corrupts individual glyphs, reproduced across two different
            embedded fonts and even after pre-shaping into Arabic
            Presentation Forms — the task's own explicit STOP-and-report
            condition for an unfixable Arabic/RTL rendering defect (full
            detail: ADR-016, RISK-015). The builder/PDF-component code
            for Arabic is kept fully implemented and tested so
            re-enabling it is a one-line change once the upstream defect
            is fixed. `DocumentDetailDrawer`/`ExpenseDetailDrawer`
            (uploaded attachments, not generated documents) are
            deliberately untouched — no real file bytes exist anywhere in
            this prototype's fixtures for them to download.

  stock/    Pharmacie & Stock (UI-008ABCD), replacing the generic Stock
            placeholder at `/app/stock` — Vue d'ensemble/Articles/
            Mouvements/Lots & expirations, executed as four gates
            against one shared 24-item fixture universe (`mock-items-
            data.ts`/`mock-lots-data.ts`/`mock-movements-data.ts`,
            fixture-integrity tested for internal consistency). `stock.ts`
            (item balance/attention-status/CRUD helpers), `lots.ts`
            (lot balance/expiry-status/cabinet-row builders), `movements.ts`
            (movement history/running balance/negative-stock validation),
            `dashboard.ts` (KPI/attention-list derivation) are the pure
            function layer every screen composes — no component computes
            a balance or status inline. `StockNav` (Vue d'ensemble/
            Articles/Mouvements/Lots & expirations) mirrors `FinanceNav`'s
            exact `usePathname`-prefix `Tabs` usage (non-parameterized
            routes); `ItemNav` (Aperçu/Lots/Mouvements) mirrors
            `TeamMemberNav`'s own per-id explicit-`activeTab`-prop
            pattern instead, since it sits under a per-item `[id]`.
            `items-page.tsx` (`/app/stock/items`) mirrors
            `GlobalInvoicesPage`'s search/filter/table/card-list
            architecture; `item-detail-page.tsx` (`/app/stock/items/[id]`)
            mirrors `TeamMemberDetailPage`'s header-then-tabs-then-
            switched-content shell — editing an article happens on its
            own detail page's Aperçu tab (`ItemOverviewContent`), never
            from the list, the same edit-on-detail convention Team
            established. `stock-movements-page.tsx`
            (`/app/stock/movements`) starts with an article `Select`
            (movements are always scoped to one item) then reuses the
            exact same `ItemMovementsContent` component the item's own
            Mouvements tab renders — no duplicate movement-table
            implementation. `stock-lots-page.tsx` (`/app/stock/lots`) and
            `stock-dashboard.tsx` (`/app/stock`) are both purely derived
            read views composed from the same pure functions above.

            **The required cross-inventory chain**, enforced by
            construction and proven end to end by
            `cross-inventory-integrity.test.ts`:

            ```text
            StockMovement[] (source of truth, Spec #4 §23.3)
                    |
                    +-----------------------------+
                    v                              v
            stock.ts: computeItemStockBalance   lots.ts: computeLotBalance
              (sum per itemId)                    (sum per lotId)
                    |                              |
                    | <---- always reconcile ----> |
                    v                              v
            InventoryItem.stockPolicy           InventoryLot.expirationDate
                    |                              |
                    v                              v
            stock.ts: resolveStockAttentionStatus   lots.ts: resolveLotExpiryStatus
              (out_of_stock/critical/low/             (expired/expiring_soon/valid,
               reorder/available)                      EXPIRY_WARNING_HORIZON_DAYS)
                    |                              |
                    v                              v
            items.ts: buildItemRows             lots.ts: getExpiryAttentionLots
                    |                              |
                    +-------------+  +-------------+
                                  v  v
                       dashboard.ts: computeStockKpis /
                       getAttentionItems / getExpiryAttentionForDashboard
                       (never a second, independent derivation)
            ```

            `computeItemStockBalance`/`computeLotBalance` are the only
            two functions in this module that ever read `direction` —
            everything downstream (attention status, expiry status, KPI
            counts, both attention lists) is a pure function of their
            own output, so a movement recorded through any of the three
            entry points (item detail, cabinet Movements page, or a
            future API) updates every screen identically with no
            reconciliation step required. `wouldCauseNegativeItemBalance`/
            `wouldCauseNegativeLotBalance` (`movements.ts`) are the one
            place negative stock is actively prevented rather than
            merely computed (ADR-006) — checked before submit, never
            clamped after the fact. `getExpiryAttentionLots` (the
            dashboard's actionable subset) deliberately excludes a
            depleted lot even if expired, while `buildLotRows` (the
            cabinet Lots & Expirations browsing list) deliberately keeps
            it visible — two different, intentional views of the same
            underlying rows, not an inconsistency.

  communication/
            Communication Center (UI-009ABC), replacing the generic
            Communication placeholder at `/app/communication` — Vue
            d'ensemble/Messages/Modèles/Automatisations, executed as
            three gates against one shared 14-message/10-template/
            7-rule fixture universe (`mock-messages-data.ts`/
            `mock-templates-data.ts`/`mock-automation-rules-data.ts`,
            fixture-integrity tested for internal consistency and
            cross-referenced against the *existing* Patients/Agenda/
            Invoices fixtures — never a duplicate patient/appointment/
            invoice universe). `communication.ts` (status-semantics
            validity, channel/status filter matchers, newest-first
            sort), `messages.ts` (patient/appointment/invoice row
            resolution, search matching), `templates.ts` (variable
            extraction, the pure `renderTemplate` substitution
            function), `automations.ts` (rule sort/resolve/toggle),
            `dashboard.ts` (KPI/attention-row derivation), `operations.ts`
            (retry/send-message pure functions) are the pure function
            layer every screen composes — no component computes a
            status, a rendered message body, or a KPI inline.
            `CommunicationNav` (Vue d'ensemble/Messages/Modèles/
            Automatisations) mirrors `StockNav`'s exact
            `usePathname`-prefix `Tabs` usage, grown one tab per gate
            (Gate 1 shipped only "Messages"; Gate 2 added
            Modèles/Automatisations; Gate 3 added Vue d'ensemble last,
            once its own dashboard route existed — a nav never lists a
            tab whose route doesn't exist yet). `messages-page.tsx`
            (`/app/communication/messages`) opens a read-only
            `MessageDetailDrawer` (`Dialog variant="drawer"`, mirrors
            `PaymentDetailDrawer`) rather than navigating to a separate
            detail page — its own Retry button stays dormant (no
            `onRetry` handler) until Gate 3 wires it up, deliberately
            matching the task's own "Retry becomes operational in Gate
            3" instruction. `templates-page.tsx`
            (`/app/communication/templates`) reproduces Spec #9 Screen
            42's editor exactly (Nom/Canal/Langue/Message/VARIABLES/
            APERÇU); its Add and Edit dialogs are two separate
            `TemplateFormDialog` instances (only one ever has `open`
            true), and the Edit instance is `key`-ed by the target
            template's id so switching rows always remounts with fresh
            `useState` initial values instead of leaking the
            previously-selected template's own form state — a real bug caught by
            the edit-flow test, not merely anticipated.
            `automations-page.tsx` (`/app/communication/automations`)
            renders the seven fixed `AutomationRule` rows with only an
            active/inactive toggle editable. `communication-dashboard.tsx`
            (`/app/communication`) composes the three KPIs, the
            Failed/Pending attention sections, and the bounded Send
            Message `Combobox`-driven compose dialog.

            **The required cross-communication chain**, enforced by
            construction and proven end to end by
            `cross-communication-integrity.test.ts`:

            ```text
            CommunicationMessage[] (source of truth, Spec #4 §24.2)
                    |
                    +---------------------------+
                    v                            v
            dashboard.ts: computeCommunicationKpis   messages.ts: buildMessageRows
              (failed/queued/recentVolume counts)       (patient/appointment/invoice
                    |                                    resolution, shared by every
                    v                                    screen — Messages workspace,
            dashboard.ts: getFailedMessageRows /         dashboard attention sections)
              getQueuedMessageRows
              (same filter+sort as the KPI counts,
               never a second derivation)
                    |
                    v
            operations.ts: retryMessage / buildSentMessage
              (the only two functions that ever mutate a message's own
               status — retry re-queues, never fabricates "delivered";
               a manual send always records "sent," never "delivered")
                    |
                    v
            dashboard.ts: computeCommunicationKpis (recomputed)
              (every KPI/attention-list update flows from the same
               source array — no reconciliation step required)
            ```

            `MessageTemplate.purpose` and `CommunicationMessage.purpose`
            share the single `CommunicationPurpose` vocabulary
            (`components/domain/communication/purpose.ts`) rather than
            two independently drifting enums — a message composed from
            a template always inherits that template's own purpose
            (`buildSentMessage`'s `template?.purpose ?? "custom_operational"`
            fallback), and `AutomationRule.templateId` is proven, by a
            dedicated integrity test, to always resolve to a real
            template whose own `channel` matches the rule's `channel`
            and whose own `active` flag agrees whenever the rule itself
            is active.

  rapports/
            Reports (UI-010ABC Gate 1), replacing the generic Rapports
            placeholder at `/app/rapports` — Vue d'ensemble/Activité/
            Finance/Équipe/Stock. No `mock-*-data.ts` file exists in this
            directory at all — every KPI is a pure function over
            fixtures owned by other, already-shipped feature directories
            (`activity-report.ts` reads Agenda's `AgendaAppointment[]`
            and Finance's `Invoice[]`/`Payment[]`; `finance-report.ts`
            reuses `features/finance/aggregations.ts`'s own
            `computeFinanceKpis` unmodified; `hr-report.ts` reuses
            Équipe's own `computeAttendance`/`computePeriodOvertimeMinutes`;
            `stock-report.ts` reuses Stock's own `buildItemRows`/
            `getExpiryAttentionLots`). `overview.ts`'s
            `computeReportsOverview` takes one `ReportsSources` bundle
            (every fixture array passed straight through) and calls each
            detail report's own function — the Overview page and the
            four detail pages can never independently disagree, proven
            by `cross-reporting-integrity.test.ts`. `ReportsNav` mirrors
            `StockNav`/`CommunicationNav`'s exact `usePathname`-prefix
            `Tabs` pattern. Each detail page reuses Finance's own
            `PeriodSelector`/`getPeriodRange` (UI-006A) rather than a
            second period-toggle — except `stock-report-page.tsx`, which
            deliberately omits the period selector since none of its
            three KPIs are period-scoped (showing a selector that
            changes nothing would be misleading, not merely decorative).

  parametres/
            Cabinet Settings & Operational Configuration (UI-010ABC Gates
            2-3, extended by UI-010BC Gate 2), replacing the generic
            Paramètres placeholder at `/app/parametres` — Cabinet/
            Services & tarifs/Horaires/Rendez-vous/Paiements/
            Numérotation/Documents. `ParametresNav` grew one or more tabs
            per gate exactly like `CommunicationNav` (UI-010ABC Gate 2
            shipped only "Cabinet"; Gate 3 added Services/Horaires/
            Numérotation; UI-010BC Gate 2 added Rendez-vous/Paiements/
            Documents to reach the full 7-tab IA list). `cabinet-
            settings-page.tsx`, `working-hours-page.tsx`, `appointment-
            settings-page.tsx` and `document-settings-page.tsx` are all
            single-record view/edit toggles (a "Modifier" button reveals
            an inline form; there is exactly one record of each kind, so
            none needed a list+dialog pattern). `services-page.tsx`
            is the one list+dialog surface in this directory —
            `ServiceFormDialog`'s Add instance stays permanently mounted
            (`open={isAddDialogOpen}`) while its Edit instance is
            conditionally rendered with `key={editingService.id}`,
            mirroring `TemplateFormDialog`'s own documented stale-
            `useState` fix (UI-009ABC) rather than reintroducing the same
            bug. `numbering-page.tsx` and `payment-methods-page.tsx`
            both render read-only tables with no interactive controls at
            all (`domain/settings/`'s own `NumberingSequenceRow`/
            `PaymentMethodRow` doc comments explain why — the latter
            because Finance's own `PaymentMethod` type supports only
            `"cash"`, ADR-009 §2). Every page's edits are local
            `useState` only — `mock-cabinet-profile-data.ts`,
            `mock-cabinet-services-data.ts`, `mock-cabinet-working-hours-
            data.ts`, `mock-appointment-settings-data.ts`,
            `mock-payment-methods-data.ts` and `mock-document-settings-
            data.ts` are the `mock-*-data.ts` files in this directory,
            one per genuinely new fixture; `numbering.ts` and the
            Activité/Finance report modules deliberately have none,
            reading other directories' fixtures instead.
            `mock-document-settings-data.ts` is the one fixture that
            reads *another* fixture in this same directory
            (`getCabinetProfileMockData`) rather than inventing its own
            footer text — `buildDefaultDocumentFooter`
            (`document-settings.ts`) derives it live. `cross-
            configuration-integrity.test.ts` proves `CabinetService.name`
            values trace back to Agenda's own `SERVICES` array, that
            `computeNumberingSummary`'s PAT/EMP rows reconcile exactly
            with `generatePatientNumber`/`generateEmployeeNumber` (the
            same generators Patients'/Équipe's own create flows already
            call), that Rendez-vous' default scheduling mode matches
            Services' own majority mode, that the Paiements row's
            `method` matches Finance's own payment fixtures' `method`,
            and that the Documents footer derives live from the Cabinet
            profile fixture.
            UI-AGENDA-X extends Horaires only, additively: a second real
            route `/app/parametres/horaires/exceptions` ("Calendrier &
            exceptions") alongside the unchanged `/app/parametres/
            horaires` ("Horaires habituelles"), both rendering
            `HorairesNav` beneath `ParametresNav` — mirrors
            `AccessGovernanceNav` exactly, both navs on both routes
            (applying the UI-011X-FIX lesson). `calendar-exceptions.ts`
            holds every pure function: `resolveEffectiveCabinetAvailability`
            (the single centralized resolver — an exception always
            *replaces* the weekly schedule outright, never a union,
            ADR-013 §3), `findConflictingAppointments` (real, never
            fabricated — reads Agenda's own `getAgendaMockAppointments()`
            directly, never mutates a single appointment),
            `validateCalendarExceptionForm`/`hasActiveExceptionForDate`
            (at most one active exception per date, ADR-013 §4),
            `isPastException` (a date strictly before `MOCK_BUSINESS_DATE`
            is read-only history; the business date itself stays
            editable), and `groupExceptionsByMonth` (the month-grouped
            list presentation, task's own explicit "do not install a
            large calendar dependency" — no calendar library added).
            `mock-calendar-exceptions-data.ts`'s conflict-relevant
            fixtures reuse Agenda's own real appointment ids rather than
            an invented count (`cross-calendar-exceptions-integrity.test.ts`
            proves the reconciliation); both `public_holiday` fixtures
            are real Moroccan national dates. The task's own optional
            Agenda banner (§26) was not implemented — conditional on
            specification support that does not exist (ADR-013 §7).

            **Future availability engine (documented, not implemented,
            task §25):** the eventual production chain this task's own
            cabinet layer feeds into is `CabinetWorkingHoursDay` →
            `CabinetCalendarException` → effective cabinet hours →
            practitioner `WorkInterval` → practitioner `LeaveRequest`/
            absence → existing `Appointment`s → service duration →
            bookable slots. This task implements only the first three
            links (`resolveEffectiveCabinetAvailability`); Public
            Booking (UI-012) is the eventual consumer and remains
            entirely unimplemented here (no public booking page, no
            public availability API, no slot reservation).

  subscription/
            SaaS Subscription Lifecycle & Plans/Entitlements (UI-011ABC
            Gates 1-2), replacing the generic catch-all placeholder at
            `/app/abonnement` (already a real sidebar entry,
            `lib/nav-config.ts` — never a competing route). `SubscriptionNav`
            (Abonnement/Plans/Parrainage) is never added to the global
            sidebar itself (task §45) — mirrors `ParametresNav`'s own
            one-sidebar-entry-many-internal-tabs shape.
            `mock-subscription-data.ts`'s `buildSubscriptionFixture`
            builds every one of the 6 lifecycle states from one base plus
            `addDaysIso` offsets — never an independently typed date
            literal — so e.g. the grace fixture's own
            `graceEndsAt = currentPeriodEnd + GRACE_PERIOD_DAYS` is
            provably consistent with `subscription-lifecycle.ts`'s own
            spec-derived constant, proven by `mock-subscription-data.test.ts`.
            `entitlements.ts` (`hasEntitlement`/`getEntitlementLimit`/
            `getUsageState`) is the *only* place any component reads plan
            access — no component compares a plan code/name string
            directly (Spec #5 §39). `usage.ts` derives real usage from
            Équipe's own `TeamMember` fixtures (`countActivePractitioners`/
            `countActiveStaff`) rather than hardcoding a numerator (task
            §27). `subscription-page.tsx` renders Screen 49's Blackout
            takeover as one of its own conditional branches (no
            `PageHeader`/nav/Usage/History) — a page-scoped presentational
            state, not a global app-shell gate (ADR-010 §6).
            `plans-page.tsx`'s `EntitlementLimitNotice`
            (`components/entitlement-limit-notice.tsx`) has one real,
            non-fabricated case to render: Solo's own 1-practitioner limit
            against the real fixture's 2 active practitioners. Both
            "Renouveler" and "Choisir ce plan" open the same informational
            `ConfirmDialog` — neither ever mutates `Subscription` state
            (task §20/§29: no fake payment, no local checkout simulation).

  referral/
            Parrainage (UI-011ABC Gate 3), `/app/abonnement/parrainage`.
            `referral-code.ts`'s `buildReferralCode`/`buildReferralLink`
            are deterministic (not cryptographically random — a real
            backend generator is a future concern) and reproduce Spec #9
            Screen 50's own `app.ma/r/{code}` format exactly.
            `mock-referral-data.ts`'s referral code derives from the same
            Cabinet profile fixture Cabinet Settings/Documents already
            read (`getCabinetProfileMockData`) — never an independently
            invented code. `rewards.ts`'s `computeAppliedRewardMonths`/
            `findRewardForReferral` are the only functions that read
            `ReferralReward` — `referral-page.tsx` composes a qualified
            referral's status badge with its own real applied reward's
            "+N mois" rather than inventing a 7th status label for
            "qualified and rewarded." The page's Copy action uses the real
            Clipboard API (`navigator.clipboard.writeText`) with a `Toast`
            confirmation — no tracking network call, no fake share flow.

  access/
            Access Governance, Roles, Permissions & Delegation of
            Authority (UI-011X), `/app/parametres/access` — Utilisateurs/
            Rôles/Permissions/Délégations/Historique via its own nested
            `AccessGovernanceNav` (rendered alongside `ParametresNav`,
            which shows "Accès & permissions" as its 8th tab — mirrors
            `TeamMemberDetailPage`'s own stacked-nav shape: Main App Nav
            -> Paramètres -> `ParametresNav` -> Accès & permissions ->
            `AccessGovernanceNav`). Each of the 5 Access page components
            renders both navs directly, one above the other — there is
            no `layout.tsx` nesting anywhere in this app below the app
            shell, so this follows the same inline-per-page convention
            every other Paramètres page already uses, rather than
            introducing a new architecture. (UI-011X's first landing
            omitted `ParametresNav` from all 5 Access pages — fixed by
            UI-011X-FIX with no functional change to Access Governance
            itself.) Utilisateurs
            is the module's own root even though Rôles/Permissions were
            built first (Gate 1) — the task's own nav order, not build
            order, exactly like `ParametresNav`'s UI-010BC growth.
            `effective-access.ts`'s `computeEffectivePermissions` (Role ∪
            Grants ∪ active Delegations, minus Restrictions — restrictions
            always win even over a delegation on the same key) is the
            single resolver every consumer reads: the Rôles/Permissions
            pages read the catalog directly, `UserAccessDrawer`'s
            checklist and its own `EffectiveAccessSummary` (Gate 4's
            "explanation UI") both read this same result, never a second
            computation. `membership-access.ts`'s `toggleMembershipPermission`
            is the sole mutation path for individual grants/restrictions —
            one checkbox per permission (never two independent grant/
            restrict controls) that maintains a provable invariant:
            `individualRestrictions` only ever names a permission the
            membership's own role actually grants (`docs/implementation/
            DECISIONS.md` ADR-011 §4). `delegation-lifecycle.ts`'s
            `resolveDelegationStatus` is a deliberate leaf module (no
            other feature imports) so `effective-access.ts` can depend on
            it without ever forming a cycle with `delegation-constraints.ts`
            (which depends on `effective-access.ts` to enforce "the
            delegator must currently hold what they're delegating").
            `mock-audit-data.ts`'s events are static but every one traces
            to a fact the current fixture state still holds — Meryem
            Bakkali's own grant/restriction events name exactly the keys
            her real `TenantMembership` still carries, and the
            delegation-linked events reference real `Delegation` ids
            whose own `createdAt`/`revokedAt` match exactly — proven by
            `cross-governance-integrity.test.ts`, mirroring
            `cross-subscription-integrity.test.ts`'s own discipline.

  booking/  Public Booking & Effective Availability (UI-012ABCDE),
            replacing the `/book` visual placeholder with a real,
            accountless patient-facing booking journey (ADR-017). Every
            input — services, cabinet hours, calendar exceptions,
            practitioner schedules, approved leave, existing appointments
            — is read from the same real fixture sources
            Paramètres/Équipe/Agenda already own; no second booking-
            availability fixture universe exists anywhere.

            `availability.ts` is a pure, React-free engine
            (`getDayAvailability`/`getMonthAvailability`) resolving, per
            service+practitioner+date: past date -> cabinet closure/
            holiday (`resolveEffectiveCabinetAvailability`, reused
            outright from `features/parametres/calendar-exceptions.ts`)
            -> approved leave (`doesApprovedLeaveCoverDate`, reused
            outright from `features/team/leave.ts` — pending/rejected
            never block) -> practitioner `WorkInterval` intersection
            (`intersectIntervals`, the one centralized interval-
            intersection helper) -> duration-fitting slot generation
            (`generateCandidateSlots`, each effective interval walked
            independently so a slot can never bridge a split-hours/lunch
            closure) -> existing-appointment occupancy
            (`computeOccupiedIntervals`/`isSlotFree`, reusing `toRange`/
            `overlaps`/`TERMINAL_STATUSES` newly exported from
            `features/agenda/conflict.ts` rather than a third
            re-implementation of the same overlap math).
            `getSchedulablePractitioners` is the canonical schedulable-
            practitioner projection — `TeamMember.role === "practitioner"`
            AND `status === "active"` AND a real `practitionerId` link to
            `AgendaPractitioner`, never `role === "practitioner"` alone
            (Othmane Zouiten, a practitioner with no `practitionerId`
            link, is integrity-tested absent). Every internal
            `UnavailableReason` (`past_date`/`cabinet_closed`/`holiday`/
            `practitioner_not_scheduled`/`practitioner_on_leave`/
            `fully_booked`) collapses to one of 4 public-safe labels via
            `labels.ts`'s `getUnavailableReasonLabelKey` before ever
            reaching the UI — `practitioner_on_leave` and
            `practitioner_not_scheduled` deliberately render the exact
            same generic "Indisponible," so a patient can never infer
            that a specific practitioner is on leave (task §38/§66).
            Slot-step granularity (30 minutes) and the deliberate absence
            of any booking-horizon/minimum-notice rule are both recorded
            architectural decisions (ADR-017) — neither concept exists
            anywhere in `AppointmentSettings` or the approved
            specifications.

            `booking-state.ts`'s `bookingReducer` drives the 5-step
            wizard (Service -> Praticien -> Date & heure -> Vos
            informations -> Confirmation, `components/booking-
            progress.tsx`) — a documented, deliberate extension of Spec
            #9 Screen 51's older single-form wireframe (no practitioner
            field) into a stepped flow with explicit practitioner
            selection, per this task's own explicit instructions (ADR-017
            §3). Changing an earlier selection invalidates only the
            steps that actually depend on it, and only when the
            selection genuinely changes — re-confirming the same
            service/practitioner (e.g. via Review's "Modifier") never
            silently wipes an already-picked date/slot.
            `components/availability-calendar.tsx` is a purpose-built
            month grid (never `<input type=date>`, which has no per-day
            availability to visualize) — unavailable days are disabled,
            struck through, and carry a safe `aria-label` reason, never
            color-only (task §33). The contact form
            (`components/patient-details-step.tsx`) is bounded to Spec #9
            Screen 51's own exact field list (Prénom/Nom/Téléphone/
            Commentaire) — no CIN, no social coverage, no clinical data
            (task §42/§43); its `<form>` carries `noValidate` so the
            app's own custom validation messages (not the browser's
            native required-field tooltip) are what patients actually
            see.

            Submission (`public-booking-page.tsx`'s `handleConfirm`)
            re-validates the exact selected slot against live sources
            immediately before creating the local record (task §47) — a
            slot taken in the meantime returns the user to date
            selection with `slotUnavailableNotice`, never a silent
            failure. The local booking record reuses the canonical
            `AgendaAppointment` shape outright (`buildLocalBookingAppointment`),
            always created with `status: "requested"` (never
            auto-confirmed, matching Spec #9 Screen 52 / WF-04 §5
            exactly) and a synthetic `public-*` `patientId` — never a
            link to a real `PATIENTS` fixture id, no probabilistic
            patient matching (task §45). A deterministic `DEM-{date}-
            {seq}` reference (`buildBookingReference`) is a recorded
            prototype-local convention, distinct from the backend's own
            `NumberingSequenceRow` registry (PAT/EMP/FAC/REC only —
            appointments were never part of it). Confirmed bookings
            accumulate in `sessionBookings` (component state only, no
            `localStorage`) and are merged into the engine's own
            appointment source for the rest of the browser session, so a
            just-booked slot cannot be immediately double-booked locally
            — without ever mutating Agenda's own real appointment array.
            Production concurrency safety (two different sessions
            booking the same slot simultaneously) is explicitly out of
            scope for this frontend-only revalidation and is recorded as
            RISK-016 — a future backend booking endpoint must perform an
            atomic check-and-create.

            The former placeholder `BookPage`/`FoundationBadge` is
            removed outright — `FoundationBadge` is explicitly documented
            as "never used on real product screens," and `/book` now is
            one; `app/book/layout.tsx`'s max width grew from `max-w-sm`
            to `max-w-xl` to fit the calendar/slot grid, still bounded
            well short of a full admin layout (task §73).

  platform-admin/
            SaaS Platform Administration (UI-013ABCDE) — a genuinely
            separate product surface at `/admin/*` from `/app/*`
            (cabinet) and `/book` (public patient). `app/admin/layout.tsx`
            is its own shell (never `AppShell`/`AppSidebar`), with a
            5-item nav (`lib/admin-nav-config.ts`: Vue d'ensemble/
            Cabinets/Abonnements/Utilisateurs/Activité) replacing
            TASK-003's 8-item placeholder — trimmed to exactly this
            task's own Gate scope (ADR-018 §2). No authentication gates
            `/admin/*` (task §6: "Frontend Admin UI ≠ Platform
            authorization," RISK-018) — a future task must add one.

            `Tenant` (`components/domain/platform-admin/types.ts`) is a
            new type built from scratch — no `Tenant` entity existed
            anywhere in this codebase before this task (`CabinetProfile`
            represents only the single prototype tenant, has no `id`/
            `status`). 7 fixture tenants (`mock-tenants-data.ts`) cover
            every `TenantStatus` and every `SubscriptionStatus` at least
            once; `tenant-1`'s own `name`/`specialty` read directly from
            the real `CabinetProfile`, and its subscription
            (`mock-platform-subscriptions-data.ts`) is the exact same
            object `/app/abonnement` itself reads via
            `getSubscriptionMockData()` — never a duplicate. The other 6
            subscriptions reuse UI-011ABC's own status-variant builders
            (`getTrialingSubscriptionMockData()`, etc.) with only
            `id`/`tenantId` overridden, so every internal date
            relationship those builders already prove consistent
            (grace = expiry + `GRACE_PERIOD_DAYS`) is inherited, never
            recomputed by hand.

            The platform user directory
            (`platform-users.ts`/`mock-platform-users-data.ts`) answers
            Gate 4's "platform user administration" from Spec #4 §4.1
            `users`/§4.2 `tenant_memberships`, genuinely spanning
            multiple tenants — never the SaaS operator's own
            `platform_admin_users` login identity, which has zero field
            specification anywhere and stays inside task §6's deferred
            authentication boundary (ADR-018 §1). `tenant-1`'s 5 rows are
            *derived* from the real Access Governance fixtures
            (`mapAccessUsersToPlatformUsers`, mapping
            `role-owner-admin`/`role-practitioner`/`role-receptionist` to
            Spec #4 §4.2's own `profile_type` ENUM) rather than
            re-authored — Othmane Zouiten (`user-5`) stays `disabled` at
            the platform level too, proven by
            `cross-platform-admin-integrity.test.ts`. The other 6 tenants
            get genuinely new fixtures, deliberately covering all 4
            `UserAccountStatus` values (an `invited` owner who has never
            logged in, a `locked` owner, a `disabled` owner) that
            `tenant-1`'s own real data alone does not exercise.

            Dashboard KPIs and the attention queue
            (`tenants.ts`'s `computeTenantKpis`, `subscriptions.ts`'s
            `computeSubscriptionKpis`, `platform-users.ts`'s
            `computePlatformUserKpis`, `attention.ts`'s
            `computeAttentionItems`) are pure re-derivations over the
            same `Tenant[]`/`Subscription[]`/`PlatformUser[]` arrays every
            other admin screen reads — never an independently authored
            dashboard-only number. "À renouveler" reuses UI-011ABC's own
            `isExpiringSoon`/`EXPIRING_SOON_THRESHOLD_DAYS` (D-15) rather
            than a second invented threshold; "Restreints" is the union
            of `tenant.status === "suspended"` OR
            `subscription.status === "blackout"`, counting a tenant once
            even when both independently hold (Spec #4 §57.7: "never
            infer one domain status solely from another").

            Tenant 360° (`/admin/tenants/[id]`) is a local JS-only
            tablist (`role="tablist"`, not the shared href-based `Tabs`
            component — task §9's "do not invent unnecessarily deep
            routing" rules out per-tab routes) with 4 panels: Aperçu,
            Abonnement (plan/dates/entitlements, reusing the exact
            `abonnement.usage.*`/`abonnement.plans.row.*` translation
            keys `/app/abonnement` already ships, never a new
            entitlement-label namespace), Utilisateurs (read-only — every
            tenant relationship for this tenant) and Historique. Bounded
            status actions (`tenants.ts`'s `getAvailableTenantActions`/
            `applyTenantAction`, `subscriptions.ts`'s
            `getAvailableSubscriptionActions`/`applySubscriptionAction`)
            are offered only from the states they make sense from (e.g. a
            `closed` tenant offers none — terminal, task §1: "NO
            destructive tenant deletion"), require a reason
            (`ConfirmDialog` + `Textarea`, Spec #2 §55.2 "controlled and
            audited"), and update local component state only — task §1:
            "NO real tenant suspension... NO real subscription mutation."
            User-status actions (`getAvailableUserActions`/
            `applyUserAction`) follow the identical pattern on
            `/admin/users`' `PlatformUserDrawer` (mirrors
            `UserAccessDrawer`'s established drawer pattern). None of
            these bounded actions propagate to other pages or to
            `/admin/activity`'s own static feed — a deliberate,
            documented boundary (ADR-018 §3, RISK-017), not an oversight;
            no `/admin/subscriptions/[id]` or `/admin/users/[id]` routes
            exist, so subscription detail lives on Tenant 360° and user
            detail is a drawer (ADR-018 §4).

            `/admin/activity` covers Gate 5's audit log
            (`mock-platform-audit-data.ts` — 5 static events, every one
            traceable to a real fixture fact, e.g. `paudit-1` mirrors
            Access Governance's own real `audit-7` deactivation event
            exactly) and attention queue. No dedicated support/
            tenant-context workspace or impersonation surface was built —
            both are marked conditional-future by the specifications
            themselves (Spec #1 §27, Spec #2 §55.6 "Future/controlled"),
            not merely unspecified (ADR-018 §5).

  auth/     Authentication — Login (`/auth`), Forgot password
            (`/auth/forgot-password`), Reset password
            (`/auth/reset-password`). Real backend integration since
            AUTH-001 (RISK-019, resolved) — previously UI-013X's
            explicitly-non-authenticating prototype (ADR-019), now calling
            `features/auth/api.ts` (built on the shared `src/lib/
            api-client.ts` fetch boundary — `credentials:"include"`,
            CSRF-cookie bootstrap, the `{data}`/`{error}` envelope parsed
            once) against the real Laravel Identity module. `LoginPage`
            handles real invalid-credentials/rate-limited/server-
            unavailable states and never calls `useSession()` itself — a
            successful submission just navigates to `/app`/`?from=`, and
            that route's own `AuthGuard` (below) discovers the
            just-established session cookie fresh, the same way any direct
            navigation would. `PasswordInput`
            (`components/password-input.tsx`) is unchanged from its
            original UI-013X implementation — a from-scratch show/hide
            field mirroring `Input`'s own label/error/describedby
            structure. `ForgotPasswordPage` now calls the real
            `forgot-password` endpoint; its generic success message is
            unchanged (the backend's own response is equally generic —
            CLAUDE.md §17's patient-existence-disclosure rule applied to
            accounts, now enforced server-side too, not just in copy).
            `ResetPasswordPage` now reads `token`/`email` from the URL
            query string and calls the real `reset-password` endpoint —
            a missing token/email or a backend `INVALID_RESET_TOKEN`
            response are new, real states the prototype never had (no
            backend existed to reject anything). `validateLoginForm`
            still deliberately invents no password-policy rule for login
            (task §7 — an existing account's password must keep working
            even under a later policy change); `validateResetPasswordForm`
            now mirrors the backend's own `Password::min(8)` policy
            (AUTH-001 §22 — "frontend should reflect backend
            requirements, backend remains authoritative", `validation.ts`'s
            `RESET_PASSWORD_MIN_LENGTH`). Both still reuse `isValidEmail`
            (`features/patients/patient-form-validation.ts`) outright.
            `AuthenticatedUser` (`features/auth/api.ts`) grew `tenant`/
            `membership` (TENANT-001 §14) — both `null` for an
            authenticated-but-not-yet-onboarded account, the signal
            `AuthGuard`/`OnboardingGuard` branch on.

  tenancy/  `provisionTenant` (`features/tenancy/api.ts`, TENANT-001 Gate
            4) — the one function that POSTs the Onboarding wizard's
            accumulated draft to `/api/v1/tenants/provision`, built on the
            same shared `apiFetch` boundary every `features/<module>/api.ts`
            uses. Returns the same `AuthenticatedUser` shape as
            `getCurrentUser()`/`login()`.

  onboarding/
            Cabinet Onboarding wizard (UI-013X Gate 2), replacing the
            `/onboarding` Foundation/Demo placeholder; real tenant
            provisioning since TENANT-001 (RISK-020, resolved). Composes
            EXISTING Paramètres form-value types outright
            (`CabinetProfileFormValues`/`CabinetService`/
            `CabinetWorkingHoursFormValues`/`AppointmentSettingsFormValues`,
            task §14) — there is no `OnboardingCabinet`/`OnboardingService`/
            `OnboardingWorkingHours` type anywhere. Step sequence (ADR-019
            §2): Cabinet -> Horaires -> Services -> Équipe -> Préférences
            -> Récapitulatif -> Terminé — reconciling Spec #7 §28's own
            5-screen sequence (which orders Horaires before Services, and
            has no Équipe/Préférences step at all) with this task's own
            explicit Gate 2 checklist, rather than picking one source
            wholesale. Each step manages its own local form state and
            only reports upward via `onChange`/`onContinue`
            (`OnboardingWizard` just holds the accumulated draft plus
            which step is active) — the Cabinet step reuses
            `validateCabinetSettingsForm`/`CABINET_SPECIALTY_MAP` outright,
            the Horaires step reuses `isValidWorkingHoursForm` outright,
            the Services step reuses `ServiceTable`/`ServiceFormDialog`
            outright (the literal same components Paramètres → Services &
            tarifs renders), and the Préférences step reuses
            `validateAppointmentSettingsForm` outright — never a second
            Cabinet/Service/WorkingHours/Preferences vocabulary (task
            §30-34, proven by `cross-onboarding-integrity.test.ts`). No
            minimum-one-active-service requirement exists anywhere in the
            approved specifications (grep-confirmed) — Continue from
            Services is never blocked on an empty list (task §19). The
            Équipe step is explicitly optional/non-blocking (Spec #2
            §6.6's own framing) and captures only a bounded
            `OnboardingDraftTeamMember` (first/last name, professional
            title, role, phone, email) — never a full `TeamMemberFormValues`
            reused wholesale, and never a `UserAccount`/login credential
            (task §22-23: a Cabinet owner/TeamMember/UserAccount/
            Practitioner are never automatically conflated). Récapitulatif
            shows every section read directly from the wizard's own
            accumulated state with per-section "Modifier" links back to
            that step (task §25) — no approved wireframe defines this
            review-before-completion pattern (Spec #9 Screen 07 goes
            straight to completion), so it is this task's own explicit
            addition, not a spec contradiction (ADR-019). "Terminer la
            configuration" (`OnboardingWizard.handleFinish`, TENANT-001)
            now POSTs the accumulated draft via `provisionTenant` — a real
            Tenant + owner TenantMembership are created transactionally
            before the completion screen ever renders; a failure shows an
            inline `submitError` and keeps the user on Récapitulatif
            (never a silent failure). Deliberately does NOT call
            `useSession().refresh()` on success — that would flip
            `OnboardingGuard`'s "already onboarded" check mid-flow and
            bounce the user to `/app` before they see the completion
            screen; `/app`'s own `AuthGuard` discovers the new
            tenant/membership fresh when the completion link is actually
            followed, mirroring `LoginPage`'s own established reasoning.
            `app/onboarding/layout.tsx`'s max width grew from `max-w-lg`
            to `max-w-2xl` and switched from vertically-centered to
            top-aligned, mirroring UI-012ABCDE's own `book/layout.tsx`
            widening precedent — the real wizard (services table, weekly
            hours grid, review sections) needs more room than a single
            centered form.

Date-only arithmetic (`addDaysIso` in `features/agenda/format.ts`) must
stay entirely UTC-based end to end (`Date.UTC()` construction,
`setUTCDate`/`getUTCDate`, `toISOString()`) — mixing local-time `Date`
parsing with UTC serialization silently shifts the result by a day on any
machine whose timezone is ahead of UTC. Discovered via a real test failure
(a "tomorrow" mock appointment collapsing onto "today"), not by inspection.

src/design-system/
  tokens.css   Semantic CSS custom properties (--ds-color-*, --ds-space-*,
               --ds-radius-*, --ds-shadow-*, breakpoints) mapped into
               Tailwind's `@theme` block, so components use ordinary
               Tailwind utilities (`bg-primary`, `text-text-muted`,
               `rounded-lg`, ...) that resolve to the tokens. Feature code
               must not hardcode hex colors or arbitrary spacing.

src/lib/
  cn.ts           Minimal conditional className joiner (no dependency).
  nav-config.ts   Single source of truth for sidebar/mobile-nav items —
                  future permission/entitlement/specialty filtering wraps
                  this array; do not fork the sidebar per role (Spec #8 §76).
  api-client.ts   AUTH-001: the one shared fetch boundary to the real
                  Laravel backend — `apiFetch`/`ApiError`/
                  `ApiUnavailableError`. Always `credentials:"include"`
                  (first-party session-cookie auth, no token anywhere),
                  bootstraps the Sanctum CSRF cookie before any mutating
                  request, parses the `{data}`/`{error}` envelope once.
                  Every future `features/<module>/api.ts` should build on
                  this rather than calling `fetch` directly — see
                  `features/auth/api.ts` for the established pattern.
```

Only the components a landed task needs exist. The remaining components
listed in Specification #8 §97 (Calendar, ClinicalTimeline, HealthFlag,
SessionProgress, InvoiceSummary, PaymentModal, ...) are created by the
tasks that first need them.

## Design tokens

`src/design-system/tokens.css` is the single authoritative token source —
feature code must consume the semantic Tailwind utilities it generates
(`bg-primary`, `text-text-muted`, `bg-success-soft`, ...) and must not
hardcode hex colors. Values are frozen by **Specification #10 (Visual
Identity & Graphic Charter)**, applied by TASK-003A:

```text
primary          #0F766E   primary-hover     #115E59
primary-strong   #134E4A   primary-support   #0D9488
primary-soft     #F0FDFA   primary-foreground #FFFFFF

background       #F8FAFC   surface           #FFFFFF
surface-subtle   #F1F5F9

text             #0F172A   text-secondary    #475569
text-muted       #64748B   text-disabled     #94A3B8

border           #E2E8F0   border-strong     #CBD5E1

success  #15803D / success-soft #F0FDF4
warning  #B45309 / warning-soft #FFFBEB
danger   #B91C1C / danger-soft  #FEF2F2
info     #1D4ED8 / info-soft    #EFF6FF
```

Radii (small 6px / medium 8px / large 12px / xl 16px — buttons/inputs
~8px, cards ~12px) were already Spec #10-compliant since TASK-003 and were
not changed. StatusBadge additionally exposes a `primary` tone (restrained
teal, Spec #10 §6 — e.g. appointment "In consultation") alongside
success/warning/danger/info/neutral.

Dark mode is explicitly not a V1 requirement (Spec #8 §90) — light tokens
only, no `prefers-color-scheme` branching.

## Internationalization (FR/AR)

```text
src/i18n/
  config.ts            Locale list, default locale, dir-per-locale map,
                        bootstrap cookie name.
  intl-locale.ts        `toIntlLocale()` — maps our two locales to full ICU
                        tags (`ar-MA`/`fr-FR`) for `Intl.*` APIs. Shared by
                        every feature that formats dates/money (Today,
                        Agenda, Patients); moved here in UI-003B once a
                        third feature needed it — Agenda had independently
                        redefined the same two-line function during UI-002,
                        so the move also removed a real duplicate, not just
                        a Today-specific export.
  locales/fr.json       Dictionaries. Nested keys, dot-path lookup.
  locales/ar.json
  dictionary.ts         translate(messages, key, params) — dot-path
                        lookup + {{param}} interpolation. Missing keys warn
                        in development and fall back to the key itself.
  get-locale.ts (server) Reads the locale cookie via next/headers cookies()
                        (async in Next.js 16) so the root layout renders
                        the correct <html lang/dir> on the very first
                        response — no language/direction flash.
  locale-provider.tsx (client) React context: current locale, t(), and
                        setLocale() (updates state, the cookie, and
                        document.documentElement.lang/dir immediately).
```

This is a genuine, extensible foundation, not a throwaway shim — TASK-010
("FR/AR localization foundation") builds on it rather than replacing it,
adding whatever this bootstrap intentionally defers: persistence tied to
an authenticated user's account (this cookie is bootstrap-only, per
TASK-003 §25), and a full audit of every future feature string. No
hardcoded user-facing strings exist in components; everything routes
through `t()`.

A full i18n library (next-intl, react-i18next, ...) was deliberately not
adopted for this bootstrap-sized dictionary — hand-rolled dot-path lookup
is sufficient today and avoids a library decision that Specification #6
§40 flags as ADR-worthy before it's actually needed. Revisit if/when
TASK-010 needs pluralization, ICU message format, or per-namespace
splitting that outgrows this.

## RTL

`dir="rtl"`/`dir="ltr"` is set on `<html>` from the resolved locale — real
browser bidi layout, not a cosmetic `text-align`. Components consistently
use Tailwind's logical-property utilities (`ps-*`/`pe-*`, `ms-*`/`me-*`,
`start-*`/`end-*`, `border-e`) instead of physical `left`/`right`
utilities, so spacing/alignment/borders flip automatically under RTL with
no `rtl:` variant needed. Flex-row layouts (e.g. AppShell's
sidebar/content split) rely on the browser's native bidi reversal of row
direction under `dir="rtl"`. The few genuinely directional icons (e.g. the
"back to home" arrow in `AreaPlaceholder`) explicitly mirror via
`rtl:rotate-180` rather than being assumed symmetric.

## Typography

Latin: **Inter** (Spec #10 §7). Arabic: **Noto Sans Arabic** (Spec #10
§8). Both loaded via `next/font/google`
(self-hosted at build time, no runtime request to Google, no font files
committed to the repo) as CSS variables (`--font-latin`, `--font-arabic`)
consumed by `globals.css`; `:lang(ar)` swaps the font stack order so
Arabic text always renders in the Arabic-appropriate face regardless of
which locale's layout wraps it (Spec #7 §40: generated/embedded content
language is independent of current UI language).

## Responsive shell

```text
< md   (mobile)   Bottom nav (Aujourd'hui/Agenda/Patients/Plus). No sidebar.
md–lg  (tablet)   Icon-only collapsed sidebar rail.
>= lg  (desktop)  Full expanded sidebar with labels.
```

## Icons

`lucide-react` — one consistent stroke-based icon library, used
everywhere an icon appears (nav, topbar, StatusBadge tones, directional
indicators). Confirmed as the approved family by Spec #10 §25. Not an
ADR-worthy decision (Spec #6 §40 examples an icon library is not among
them) but recorded here for traceability.

## Server-state strategy (future)

No API integration exists yet (TASK-003 is backend-independent by
design). When backend integration begins, follow Specification #5 §6:
server state (patients, appointments, invoices, ...) through a
query/cache library at the boundary; local UI state (open modal, selected
tab, in-progress form) stays local. Do not duplicate server business
state into ad hoc global stores.

## Testing

`vitest` + `@testing-library/react` (jsdom environment) — a minimal,
justified addition for TASK-003's required component-level checks (shell
renders, language switch FR→AR, dir LTR→RTL, Button behavior, mobile nav
structure). This is not the full testing architecture: no Playwright/E2E,
no CI wiring — that remains TASK-007's scope. Real viewport/visual
responsive behavior is validated manually against the dev server, not in
jsdom (jsdom has no real CSS layout engine).
