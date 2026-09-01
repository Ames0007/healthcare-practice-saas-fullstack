# Backend Architecture

This document is the backend-local companion to `CLAUDE.md` and
Specifications #4-#6. It records the structural conventions established
by TASK-002 (backend bootstrap) and extended by AUTH-001 (real
authentication, the first business module). It is not a source of
product/business requirements — see `docs/specifications/` for those.

**Identity (authentication) is the only business module implemented so
far** (AUTH-001). Tenancy, patients, clinical, scheduling and every other
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
implemented (AUTH-001) for the Identity module's own five endpoints only
— `App\Support\Http\ApiErrorResponse` (the shared response shape) and
`App\Http\Middleware\AssignRequestId` (a minimal per-request id, not the
full cross-cutting propagation TASK-012 owns). A repository-wide
exception-to-error-code mapping for every module remains TASK-011's
scope; future modules should extend `ApiErrorResponse` rather than invent
a second envelope shape.

## Authentication

Laravel Sanctum, **stateful-SPA session-cookie mode** — not JWT, not API
tokens (`Laravel\Sanctum\PersonalAccessToken`/its migration are
deliberately not published; nothing here ever issues a token). See
`docs/implementation/DECISIONS.md` ADR-020 for the full reasoning.

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
and ADR-020 §7 for the concrete bug this caused and its fix.

## Tenant-context principle

Not implemented yet (Tenancy is a later phase than AUTH-001). `users`
(AUTH-001) deliberately carries no `tenant_id`/role/employment field —
see CLAUDE.md §5-6. When Tenancy lands, no request may trust a
client-supplied `tenant_id`. Tenant is resolved server-side from the
authenticated session's active membership and injected into the
application layer as `TenantContext`; repositories scope every
tenant-owned query from it. See `CLAUDE.md` §6-7 and Specification #5
§14.

## Database

`DB_CONNECTION` is set to `pgsql` (matching ADR-001); a real local
PostgreSQL instance is provisioned (TASK-004) with the UUIDv7/
TIMESTAMPTZ/NUMERIC conventions established (TASK-005, see
`database/README.md`). `database/migrations/` is no longer empty:
AUTH-001 added the first three domain migrations (`users`, `sessions`,
`password_reset_tokens`, see `backend/database/migrations/`) — see the
Authentication section above for `SESSION_DRIVER=database`.
Cache/queue remain on Laravel's installer default (`file`/`sync`) for
now; they move to Redis in TASK-006 per ADR-001. `/api/v1/health` uses
the stateless `api` middleware group.

## Testing

`phpunit.xml` targets real PostgreSQL (`healthcare_practice_test`, a
dedicated database — see `database/README.md`), not SQLite — see that
file's own comment for why. `SESSION_DRIVER=database` in tests too
(AUTH-001): the Identity feature tests exercise real session
establishment/invalidation, so the test environment matches
development/production rather than the framework's `array` default. A
formal, repository-wide testing-foundation task remains TASK-007's
scope; AUTH-001's own `tests/Feature/Identity/IdentityTestCase.php`
documents two Laravel-testing-specific gotchas future authenticated-flow
tests should be aware of: the HTTP test client never sends cookies on
`postJson()`/`getJson()` unless `withCredentials()` is called, and it
never forwards a response's Set-Cookie into the next request
automatically (unlike a real browser) — both handled there.
