# Backend Architecture

This document is the backend-local companion to `CLAUDE.md` and
Specifications #4-#6. It records the structural conventions established
by TASK-002 (backend bootstrap), extended by AUTH-001 (real
authentication, the first business module) and TENANT-001 (the tenant
boundary). It is not a source of product/business requirements — see
`docs/specifications/` for those.

**Identity and Tenancy are the only business modules implemented so far**
(AUTH-001, TENANT-001). Patients, clinical, scheduling and every other
module remain unimplemented — see `app/Modules/README.md`.

## Modular-monolith philosophy

One Laravel application, deployed as a single unit, internally organized
into isolated business modules under `app/Modules/` (see
`app/Modules/README.md`). Microservices are explicitly out of scope
(ADR-001; `CLAUDE.md` §4).

Rationale (Specification #4 §63 / #5 §63): one team, heavily
transactional cross-domain workflows, fast market launch, modest initial
scale. A well-structured modular monolith can be extracted into services
later if justified; a premature microservice split would add operational
cost without a corresponding benefit today.

## Module ownership

Each module owns its own business rules and data. Cross-module
interaction happens through explicit application services or domain
events — never by one module directly querying or writing another
module's tables. See `app/Modules/README.md` for the planned module list.

`app/Modules/Identity/` (AUTH-001) is the first real module and sets the
convention future modules follow: Eloquent models live in
`Infrastructure/Persistence/` (not `app/Models/`) since they are
inherently a framework/persistence concern — `Domain/` stays
framework-independent (value objects, domain exceptions only, no
Eloquent). See `App\Modules\Identity\Infrastructure\Persistence\User`'s
own doc comment for the reasoning.

`app/Modules/Tenancy/` (TENANT-001) is the second, and the first to
depend on another module's Application layer rather than only its own:
`Identity\Presentation\Controllers\{LoginController,CurrentUserController}`
inject `Tenancy\Application\Context\ResolveCurrentTenantContext` to
project the current tenant/membership onto the user resource — an
explicit cross-module Application-layer dependency (never Identity
reaching into Tenancy's `Infrastructure/Persistence` directly), exactly
the pattern `CLAUDE.md` §4 asks for.

## Layering

Every module follows:

```text
Domain/           Entities, value objects, domain rules, state
                   transitions, domain events. No framework/HTTP
                   dependency.
Application/       Use cases, commands, queries, transaction
                   orchestration, use-case-specific authorization.
Infrastructure/     Database repositories, Redis, object storage,
                   external provider adapters.
Presentation/       HTTP controllers, request validation, response
                   transformation.
```

Controllers are thin: request validation and response shaping only.
Business logic belongs in Application/Domain, not in controllers.

## API

REST JSON under `/api/v1`. Route loading convention:

```text
routes/api.php        registers the /api/v1 group, currently loading:
routes/api/v1.php     all v1 routes; module route files will be
                       required from here as modules are implemented
```

`/api/v1/health` (TASK-002) is a liveness check only — it proves the
application booted and can serve JSON. It intentionally does not check
PostgreSQL/Redis/object-storage readiness; that is deferred to a later
foundation task, consistent with TASK-002's scope boundary (TASK-005
owns PostgreSQL, TASK-006 owns Redis/queues).

Unknown API routes and other errors render as safe JSON (no stack
trace/file paths) whenever the request is under `api/*` or expects JSON
— configured in `bootstrap/app.php` via `shouldRenderJsonWhen`. The
standardized `{error:{code, message, details, request_id}}` envelope is
implemented (AUTH-001, extended TENANT-001) for Identity's five endpoints
and Tenancy's one (`/tenants/provision`) only — `App\Support\Http\
ApiErrorResponse` (the shared response shape) and
`App\Http\Middleware\AssignRequestId` (a minimal per-request id, not the
full cross-cutting propagation TASK-012 owns). A repository-wide
exception-to-error-code mapping for every module remains TASK-011's
scope; future modules should extend `ApiErrorResponse` rather than invent
a second envelope shape.

## Authentication

Laravel Sanctum, **stateful-SPA session-cookie mode** — not JWT, not API
tokens (`Laravel\Sanctum\PersonalAccessToken`/its migration are
deliberately not published; nothing here ever issues a token). See
`docs/implementation/DECISIONS.md` ADR-021 for the full reasoning.

```text
bootstrap/app.php        $middleware->statefulApi()
config/sanctum.php       stateful domains (localhost:3000/127.0.0.1:8000
                         by default)
config/cors.php          supports_credentials: true; paths include
                         sanctum/csrf-cookie
SESSION_DRIVER=database  see database/README.md's own session note
```

`App\Modules\Identity\Presentation\routes.php` (required from
`routes/api/v1.php`) owns `/api/v1/auth/{login,logout,me,
forgot-password,reset-password}`. `logout`/`me` sit behind `auth:sanctum`
— an unauthenticated request never reaches their controllers.

A same-request gotcha worth knowing before writing a second `auth:<guard>`
protected route: `Illuminate\Auth\Middleware\Authenticate` calls
`Auth::shouldUse($guard)`, which redirects two framework container
singletons (`'auth.driver'`, aliased to the `Guard` contract; separately
`'session.store'`) for the rest of that request. Code that resolves
`Guard::class`/the default guard *after* that middleware ran (e.g.
`DatabaseSessionHandler`'s own `user_id` bookkeeping) can see a stale
value unless explicitly refreshed — see `LogoutUser`'s own doc comment
and ADR-021 §7 for the concrete bug this caused and its fix.

## Tenant-context principle

Implemented (TENANT-001). `users` still carries no `tenant_id`/role/
employment field (CLAUDE.md §5-6) — the relationship lives entirely in
`tenant_memberships`. No request trusts a client-supplied `tenant_id`:
`Tenancy\Application\Context\ResolveCurrentTenantContext` resolves the
authenticated user's one ACTIVE membership server-side and builds
`Tenancy\Domain\ValueObjects\TenantContext` (`tenantId`, `tenantName`,
`tenantSlug`, `tenantStatus`, `membershipId`, `profileType`, `isOwner` —
deliberately no `subscriptionStatus`/`permissions` yet, both belonging to
still-unimplemented modules per Specification #5 §14's own conceptual
shape).

Two consumption paths exist:

1. **Read-only projection** — `GET /api/v1/auth/me` and
   `POST /api/v1/auth/login` both resolve and return the current
   `TenantContext` (`null` for a not-yet-onboarded user) via
   `UserResource`'s `tenant`/`membership` fields. No middleware
   involved — an untenanted user must still get a normal 200, not a 403.
2. **Enforced scoping** — the `tenant.context` middleware alias
   (`Tenancy\Presentation\Middleware\EnsureTenantContext`, registered in
   `bootstrap/app.php`) resolves the context and populates
   `Tenancy\Application\Context\CurrentTenantContextHolder` (a per-request
   container singleton) for the rest of the request;
   `Tenancy\Infrastructure\Persistence\Concerns\BelongsToTenant` — a
   trait future tenant-owned Eloquent models attach via
   `use BelongsToTenant;` — reads that holder to add a global `tenant_id`
   scope and auto-stamp new rows, **failing CLOSED** (throws) if no
   context was resolved, rather than silently scoping to nothing. No
   tenant-owned business route exists yet to attach `tenant.context` to
   (this task builds no such module) — the mechanism is proven directly
   against a disposable test-only table
   (`Tests\Feature\Tenancy\TenantIsolationTest`, mirroring
   `DatabaseFoundationTest`'s established pattern). The first real
   business module (Patients, most likely) should attach
   `['auth:sanctum', 'tenant.context']` to its routes and
   `use BelongsToTenant;` on its Eloquent model rather than inventing a
   new scoping convention.

Tenant provisioning itself (`POST /api/v1/tenants/provision`,
`Tenancy\Application\Onboarding\ProvisionTenant`) sits behind
`auth:sanctum` only, deliberately NOT `tenant.context` — a user with no
tenant yet is exactly who is allowed to call it. See `CLAUDE.md` §6-7,
Specification #5 §14, and `docs/implementation/DECISIONS.md` ADR-022 for
the full reasoning, including why `tenants.specialty` is a plain string
(not the spec's `specialty_id` FK) and why `tenant_settings` carries three
provisional JSONB onboarding-snapshot columns (RISK-021, both tracked as
open migration debt, not silent scope creep).

## Database

`DB_CONNECTION` is set to `pgsql` (matching ADR-001); a real local
PostgreSQL instance is provisioned (TASK-004) with the UUIDv7/
TIMESTAMPTZ/NUMERIC conventions established (TASK-005, see
`database/README.md`). `database/migrations/` now holds six domain
migrations: AUTH-001's `users`/`sessions`/`password_reset_tokens`, and
TENANT-001's `tenants`/`tenant_memberships`/`tenant_settings` (see
`backend/database/migrations/`) — see the Authentication section above
for `SESSION_DRIVER=database` and the Tenant-context principle section
above for the tenancy tables. Cache/queue remain on Laravel's installer
default (`file`/`sync`) for now; they move to Redis in TASK-006 per
ADR-001. `/api/v1/health` uses the stateless `api` middleware group.

## Testing

`phpunit.xml` targets real PostgreSQL (`healthcare_practice_test`, a
dedicated database — see `database/README.md`), not SQLite — see that
file's own comment for why. `SESSION_DRIVER=database` in tests too
(AUTH-001): the Identity/Tenancy feature tests exercise real session
establishment/invalidation, so the test environment matches
development/production rather than the framework's `array` default. A
formal, repository-wide testing-foundation task remains TASK-007's
scope; the shared stateful-session setup both modules' feature tests need
(`Origin` header, `withCredentials()`, `withSessionCookieFrom()`) now
lives in `tests/Support/StatefulApiTestCase.php` (extracted from AUTH-001's
originally Identity-only `IdentityTestCase` once Tenancy needed the exact
same setup) — its own doc comment documents two Laravel-testing-specific
gotchas future authenticated-flow tests should be aware of: the HTTP test
client never sends cookies on `postJson()`/`getJson()` unless
`withCredentials()` is called, and it never forwards a response's
Set-Cookie into the next request automatically (unlike a real browser).
`Tests\Feature\Identity\IdentityTestCase`/`Tests\Feature\Tenancy\
TenancyTestCase` are both thin per-module subclasses of it. TENANT-001's
own `Tests\Feature\Tenancy\TenantIsolationTest` mirrors
`DatabaseFoundationTest`'s established "`Schema::create` in `setUp`,
`Schema::dropIfExists` in `tearDown`" pattern to prove reusable
infrastructure (`BelongsToTenant`) with zero production model consumers
yet.
