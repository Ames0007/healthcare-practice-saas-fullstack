# Risks and Blockers

Unresolved decisions and open risks tracked across the project. These are not resolved during TASK-001.

Format:

```text
ID
Topic
Status
Affected Tasks
Description
Decision Required Before
```

---

### RISK-001

**Topic:** Morocco-specific health-data/privacy requirements
**Status:** OPEN
**Affected Tasks:** TASK-097–TASK-101, TASK-248
**Description:** Applicable Moroccan legal requirements for storage, retention and handling of patient health data (Loi 09-08 and any sector-specific rules) have not been confirmed.
**Decision Required Before:** Production launch (Phase 18 legal/privacy review).

---

### RISK-002

**Topic:** Morocco-specific invoice/document legal requirements
**Status:** OPEN
**Affected Tasks:** TASK-118, TASK-119
**Description:** Legal/fiscal requirements for invoice numbering, content and format in Morocco have not been confirmed.
**Decision Required Before:** TASK-118/119 production finalization.

---

### RISK-003

**Topic:** Final Owner/Admin access policy to another practitioner's clinical data
**Status:** OPEN
**Affected Tasks:** TASK-056, TASK-096, TASK-220
**Description:** Whether Owner/Admin has any access to clinical data governed by another practitioner is an explicit unresolved product decision. Must not be guessed.
**Decision Required Before:** TASK-096 (clinical permissions).

---

### RISK-004

**Topic:** WhatsApp provider
**Status:** OPEN
**Affected Tasks:** TASK-174, TASK-176–TASK-181
**Description:** No commercial WhatsApp Business API provider has been selected. Provider interface/test adapter to be used until resolved.
**Decision Required Before:** Production communication adapters.

---

### RISK-005

**Topic:** SMS provider
**Status:** OPEN
**Affected Tasks:** TASK-174, TASK-176–TASK-181
**Description:** No SMS provider has been selected for Morocco. Provider interface/test adapter to be used until resolved.
**Decision Required Before:** Production communication adapters.

---

### RISK-006

**Topic:** SaaS subscription payment provider
**Status:** OPEN
**Affected Tasks:** TASK-035, TASK-036
**Description:** No payment provider has been selected for SaaS subscription billing. Provider-neutral abstraction to be used until resolved.
**Decision Required Before:** Real subscription billing.

---

### RISK-007

**Topic:** PostgreSQL Row-Level Security (RLS) decision
**Status:** OPEN
**Affected Tasks:** TASK-020, TASK-021
**Description:** Whether tenant isolation relies on RLS in addition to application-level tenant scoping has not been decided.
**Decision Required Before:** TASK-020 (tenant-scoped persistence).

---

### RISK-008

**Topic:** Caisse concurrency model
**Status:** OPEN
**Affected Tasks:** TASK-133–TASK-145
**Description:** Final locking/concurrency strategy for caisse session open/close and movement posting has not been finalized.
**Decision Required Before:** Final cash hardening.

---

### RISK-009

**Topic:** Negative-stock policy
**Status:** OPEN
**Affected Tasks:** TASK-165
**Description:** Whether stock OUT movements may drive balance negative, and under what authorization, is undecided.
**Decision Required Before:** TASK-165 (Stock OUT).

---

### RISK-010

**Topic:** Trial duration
**Status:** OPEN
**Affected Tasks:** TASK-031, TASK-252
**Description:** Exact trial length in days has not been commercially finalized.
**Decision Required Before:** Commercial subscription configuration.

---

### RISK-011

**Topic:** Final pricing
**Status:** OPEN
**Affected Tasks:** TASK-027, TASK-252
**Description:** Final plan pricing has not been commercially finalized.
**Decision Required Before:** Commercial subscription configuration.

---

### RISK-012

**Topic:** Production hosting/provider/region
**Status:** OPEN
**Affected Tasks:** TASK-237–TASK-239
**Description:** Production infrastructure provider and region have not been selected.
**Decision Required Before:** TASK-237 (production infrastructure).

---

### RISK-013

**Topic:** Backup RPO/RTO
**Status:** OPEN
**Affected Tasks:** TASK-234, TASK-235, TASK-250
**Description:** Target recovery point/time objectives for backup and restore have not been defined.
**Decision Required Before:** TASK-234 (backup procedure).

---

### RISK-014

**Topic:** No Docker/Docker Compose on the primary development machine
**Status:** MITIGATED (TASK-004 native/portable infrastructure, ADR-002)
**Affected Tasks:** TASK-004, any future task that assumes a `compose.yml`
**Description:** Docker and Docker Compose are not installed, and WSL2 is
not confirmed working (checking the underlying Windows feature requires
admin rights unavailable in this environment). TASK-004 therefore runs
PostgreSQL/Redis/MinIO as native/portable processes under the user's
local profile instead of containers (see ADR-002 in DECISIONS.md). No
`compose.yml` exists in the repository. If a developer machine with
working Docker joins the project, a compose file equivalent to
`scripts/dev-*.sh` should be authored and validated then — not before it
can actually be run.
**Decision Required Before:** Any task that assumes Docker Compose is the
local infrastructure mechanism (e.g. authoring CI service containers that
mirror local dev, or onboarding a Docker-equipped developer).

---

### RISK-015

**Topic:** Arabic-language PDF generation produces corrupted glyphs
**Status:** OPEN (mitigated in UI — feature gated off, not shipped broken; ADR-016)
**Affected Tasks:** UI-DOCS-X, any future task that generates PDF/printable
documents
**Description:** `@react-pdf/renderer` 4.9.0's Arabic text-shaping/layout
pipeline intermittently drops or corrupts individual glyphs in real,
visually-inspected generated PDFs (e.g. a leading hamza-bearing letter
rendering as a disconnected floating mark; an internal "ف" vanishing
entirely) — confirmed via an independent renderer (poppler `pdftoppm`),
reproduced identically across two different embedded fonts (Noto Naskh
Arabic, Noto Sans Arabic), and still present after pre-shaping the text
into Arabic Presentation Forms via `arabic-reshaper` to bypass the
library's own shaper. This rules out "wrong font" and "buggy contextual-
substitution table" as the fixable cause and points at the library's
lower-level glyph-positioning/bidi pipeline itself — outside what this
task can fix from application code. UI-DOCS-X therefore ships French PDF
generation only; `Télécharger`/`Imprimer` show a real translated notice
instead of generating a corrupted file whenever
`DocumentSettings.documentLanguage === "ar"` (`isDocumentLanguageSupported`,
`frontend/src/features/documents/capabilities.ts`). The document
builders/PDF components for Arabic are kept fully implemented and tested
(`pdf-generation.test.ts`) so re-enabling is a one-line change once fixed.
**Decision Required Before:** Any commitment to ship Arabic-language PDF
documents to a real cabinet. Candidate next steps: (a) re-test against a
future `@react-pdf/renderer` release, (b) evaluate a HarfBuzz-backed
alternative (e.g. `pdf-lib` + a WASM HarfBuzz shaper) if this remains
unfixed, or (c) move authoritative document rendering server-side
(Laravel) with a more mature Arabic-shaping toolchain — consistent with
the task's own documented "future production architecture may move
authoritative document rendering to the backend" boundary.

---

### RISK-016

**Topic:** Frontend-only public booking slot revalidation is not
concurrency-safe
**Status:** OPEN (documented boundary, not a defect — ADR-017/UI-012ABCDE)
**Affected Tasks:** UI-012ABCDE, any future backend booking-request
endpoint
**Description:** `/book`'s submission flow re-runs the availability engine
against the current in-memory sources immediately before creating a local
booking record (task §47), which correctly protects against a *stale
selection within the same browser session* — but two different browser
sessions booking the same practitioner/date/time concurrently would both
pass this check and both "succeed" locally, since there is no shared
backend state, no database, and no atomic check-and-create anywhere in
this frontend prototype. This is an explicit, task-mandated non-scope
item (task §81: "Frontend slot revalidation is NOT sufficient for
production... Do not claim this frontend prototype guarantees concurrency
safety"), not an oversight.
**Decision Required Before:** Any real backend `POST
/api/v1/public/practices/{slug}/booking-requests` implementation must
perform an atomic availability check + `Appointment`/booking-request
creation (e.g. a database-level unique constraint or row lock on
practitioner+date+time, mirroring CLAUDE.md §45's own "Database
Concurrency" guidance for invoice/receipt numbering and payment posting)
before this can be considered production-safe.

---

### RISK-017

**Topic:** Platform Admin bounded actions are session-local per page, not
synchronized across pages or persisted
**Status:** OPEN (documented boundary, not a defect — ADR-018/UI-013ABCDE)
**Affected Tasks:** UI-013ABCDE, any future backend platform-admin API
**Description:** Tenant 360°'s tenant-status/subscription-status actions
and `/admin/users`' user-status actions (task §15/§20/§25) update only
that page's own local component state and append to that page's own
local history list. Suspending a tenant on Tenant 360° does not update
the dashboard's KPI cards, the tenant/subscription directories, or
`/admin/activity`'s static audit feed until the page is refreshed (at
which point the fixture reverts to its original state, since nothing is
persisted — task §1: "NO real tenant suspension... NO real subscription
mutation... NO LocalStorage/global persistence"). This is an explicit
scope boundary (ADR-018 point 3), not an oversight: building a shared
cross-page store to make a fake action's fake audit trail appear globally
consistent would itself be "a large new subsystem" CLAUDE.md §3 warns
against for actions that were never going to survive a refresh anyway.
**Decision Required Before:** A real backend implementation of tenant/
subscription/user status mutations must write to the actual `audit_events`
table (Spec #4 §30.1) and every admin screen must read live/refetched
state so all surfaces agree — the session-local scoping in this task
should be replaced entirely, not extended.

---

### RISK-018

**Topic:** `/admin/*` has no authentication/authorization gate
**Status:** OPEN (documented boundary, not a defect — task §6/UI-013ABCDE)
**Affected Tasks:** UI-013ABCDE, TASK-202 (SaaS Admin authentication/
authorization, per `06-master-implementation-plan.md` PHASE 15)
**Description:** The Platform Admin console renders at `/admin/*` with no
login/session check of any kind — task §6's own explicit instruction:
"Do NOT implement real authentication in this task... The Admin frontend
may be rendered directly for prototype QA... Future authentication/
authorization must protect `/admin/*`." Anyone who can reach this route
in the deployed prototype can view/act on the tenant, subscription and
user directories built here. This is intentional for a frontend
prototype but must never be mistaken for a security boundary.
**Decision Required Before:** TASK-202 (or equivalent) must implement
real platform-operator authentication and server-side authorization
guarding every `/admin/*` route/API before this console is exposed
anywhere beyond a controlled prototype-review environment.

---

### RISK-019

**Topic:** `/auth` has no real credential verification — Login/Forgot
password/Reset password never authenticate anyone
**Status:** RESOLVED (AUTH-001, 2026-09-01, DECISIONS.md ADR-020)
**Affected Tasks:** UI-013X, `06-master-implementation-plan.md` TASK-014
("Authentication") / TASK-016 ("Login security")
**Description:** `LoginPage` validates form shape only (required fields,
email format) — any well-formed email/password pair "succeeds" in the
sense that a bounded Toast notice appears; no session, cookie,
LocalStorage entry or JWT is ever created, and no backend call is ever
made (task's own explicit instruction). `ForgotPasswordPage` never sends
a real email; its success state is shown for any well-formed email,
matching or not, and is deliberately worded to never disclose whether an
account exists. `ResetPasswordPage` never verifies a real reset token —
it renders and validates the form regardless of any `token` query string
a genuine emailed link would carry, since there is no backend to check it
against. None of this is a defect: it is the explicit "Authentication UX
≠ real authentication" boundary the task itself mandates.
**Resolution:** AUTH-001 replaced all three screens' prototype seams with
real backend calls (`App\Modules\Identity`, Laravel Sanctum stateful-SPA
session cookies) — real credential verification, real
`sessions`-table-backed session establishment, a real
`PasswordBroker`-issued single-use reset token emailed via the `log`
mailer locally, and server-side enforcement (`auth:sanctum` on `/me` and
`/logout`) independent of any frontend state. Verified via 42 backend
feature tests (login/logout/me/forgot/reset, including cross-cutting
enumeration-protection and rate-limiting cases) and a real
Playwright-driven browser run against the live Postgres-backed backend
(login failure/success, logout, `/app` route-guard redirect, the full
forgot->emailed-link->reset->login-with-new-password loop). Tenant
context, permission enforcement and platform-admin authorization remain
entirely out of scope — see the still-open items this created no change
to below (RISK-018) and CLAUDE.md's own Identity/Tenancy phase boundary.
**Decision Required Before:** N/A — resolved. TENANT-001/AUTHZ-001 (or
equivalent) still own tenant context, membership, and permission
enforcement on top of this real authentication foundation.

---

### RISK-020

**Topic:** Cabinet Onboarding never provisions a real tenant — the wizard
draft is session-only and is discarded on refresh
**Status:** OPEN (documented boundary, not a defect — task/UI-013X, ADR-019)
**Affected Tasks:** UI-013X, `06-master-implementation-plan.md` TASK-037
("Cabinet onboarding flow") and its backend-provisioning counterpart
**Description:** `OnboardingWizard` accumulates a Cabinet/Horaires/
Services/Équipe/Préférences draft entirely in local component state — no
`localStorage`, no API call, no database write (task's own explicit
instruction). "Terminer la configuration" moves to a completion screen
that explicitly states no cabinet was actually created and that a real
tenant will only exist once server integration is active; the one
completion action link (`/app`, "Découvrir mon espace (aperçu)") is
labeled as a non-persistent preview, never framed as the real product.
Refreshing at any point in the wizard loses all in-progress input — this
is the expected consequence of "no persistence," not a bug to fix within
this task.
**Decision Required Before:** A future backend-integration task must wire
"Terminer la configuration" to real tenant-provisioning API calls
(Cabinet/Services/WorkingHours/TeamMember/AppointmentSettings creation,
transactionally) before onboarding can be considered functionally
complete — the step components and their reused Paramètres validators
need no rework for that change, only the final submission boundary.
