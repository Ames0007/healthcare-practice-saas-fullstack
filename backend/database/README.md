# Database Architecture

PostgreSQL application foundation established by TASK-005. Companion to
`/CLAUDE.md` and `docs/specifications/04-domain-data-architecture.md`
(the authoritative source — this file documents *conventions*, not the
entity catalog; do not duplicate it here).

Identity (AUTH-001) and Tenancy (TENANT-001) are the only business
modules with real schema so far — see `database/migrations/README.md`
for the exact table list. Every other module remains unimplemented.

## PostgreSQL

Version 18.6 locally (TASK-004, native/portable — see ADR-002). Database
`healthcare_practice`; dedicated test database `healthcare_practice_test`
(never the same database — see Testing below). Application code should
target modern, broadly-supported PostgreSQL features rather than
18-specific ones where a choice exists.

## UUID strategy

Primary keys are **application-generated UUIDv7** (RFC 9562), stored as
native PostgreSQL `uuid` columns — never `varchar`.

```php
// Migration
$table->uuid('id')->primary();

// Model
use App\Models\Concerns\HasUuidPrimaryKey;

class Patient extends Model
{
    use HasUuidPrimaryKey;
}
```

`HasUuidPrimaryKey` wraps Laravel's built-in `HasUuids` trait, which
already generates UUIDv7 via `Str::uuid7()` and configures the model as
non-incrementing with a string key type — nothing bespoke was needed.
Domain models use this project-owned trait (not `HasUuids` directly) so
the strategy has one place to change if it's ever revisited.

Why UUIDv7 over UUIDv4: better index locality (time-ordered, unlike
random UUIDv4) while remaining globally unique, hard to enumerate, and
suitable for public/API identifiers (Spec #4 §2.4). Human-facing
references (`PAT-000281`, `FAC-2026-00142`) are a separate, later concern
— never the primary key.

## Timestamps

`created_at`/`updated_at` and any true point-in-time column **must** be
`TIMESTAMPTZ`, via Laravel's tz-aware methods — not the default
`timestamps()`/`timestamp()`, which produce `timestamp without time
zone` on PostgreSQL:

```php
$table->timestampsTz();           // not timestamps()
$table->timestampTz('due_at');    // not timestamp('due_at')
```

The `pgsql` connection (`config/database.php`) sets the session to
**UTC** (`DB_TIMEZONE`, default `UTC`) regardless of server locale, so
absolute instants are stored/read unambiguously. Converting to a
tenant/practice display timezone is an application-layer concern for a
later task — not a database session setting.

Business-semantic dates (birth date, due date) where time-of-day is
irrelevant may remain plain `DATE`.

## Money

Monetary amounts (MAD) use `NUMERIC(14,2)` — never `FLOAT`/`DOUBLE`/`REAL`:

```php
$table->decimal('amount', 14, 2);
```

Store `currency_code CHAR(3) DEFAULT 'MAD'` alongside amounts on records
that may need multi-currency extensibility later (Spec #4 §2.5).

## Tenant-owned tables

Every tenant-owned table conceptually carries:

```php
$table->uuid('id')->primary();
$table->uuid('tenant_id');
```

with tenant-led indexes/uniqueness matching real query/reference
patterns, e.g.:

```php
$table->unique(['tenant_id', 'invoice_number']);
$table->index(['tenant_id', 'patient_id']);
$table->index(['tenant_id', 'status']);
```

`tenant_memberships`/`tenant_settings` (TENANT-001) already follow this —
`tenants` itself does not carry `tenant_id` (it IS the tenant). The first
true *business*-module tenant-owned table (Patients, most likely) is
still pending — see `Tenancy\Infrastructure\Persistence\Concerns\
BelongsToTenant` (backend/ARCHITECTURE.md's "Tenant-context principle")
for the reusable scoping trait it should attach to.

## Tenant-aware referential integrity

A plain UUID foreign key only proves the referenced row *exists* — not
that it belongs to the *same tenant*. Baseline defense (Spec #4 §36/§58),
layered:

1. **Application `TenantContext`** resolved server-side from the
   authenticated membership (never a client-supplied `tenant_id`) —
   TASK-019.
2. **Tenant-scoped repositories** that always filter by the resolved
   tenant.
3. **Database foreign keys** for existence.
4. **Composite tenant-aware constraints** for high-assurance
   relationships (clinical, billing, payments):

   ```php
   Schema::table('patients', function (Blueprint $table) {
       $table->unique(['tenant_id', 'id']);
   });

   Schema::table('appointments', function (Blueprint $table) {
       $table->foreign(['tenant_id', 'patient_id'])
             ->references(['tenant_id', 'id'])->on('patients');
   });
   ```

If Laravel's fluent API makes a given composite FK awkward, use
`DB::statement()` with an explicit, commented `ALTER TABLE ... ADD
CONSTRAINT` inside the migration rather than dropping the constraint.

**PostgreSQL Row-Level Security is not implemented.** It remains an open,
explicitly deferred decision (RISK-007) — application-level tenant
isolation plus the constraints above is the V1 baseline; RLS may be added
as defense-in-depth later, after careful, separately-tested design. Do
not reopen this without an approved ADR.

## PostgreSQL schema strategy

**Single `public` schema for V1** — see ADR-003. Module ownership is an
application-level (modular monolith) concern, not a PostgreSQL schema
boundary. Specification #4 §56 lists per-domain schemas
(`identity.*`, `clinical.*`, ...) as an *optional* organizational device;
given Laravel's migration/model conventions assume `public` by default
and the project's stated goal of avoiding premature complexity, splitting
schemas now would add friction without a concrete benefit at this scale.

## Migration conventions

- Naming: Laravel's standard `YYYY_MM_DD_HHMMSS_verb_table_description.php`
  (e.g. `2026_09_01_120000_create_patients_table.php`). Never vague names
  like `update_table` or `fix_schema`.
- Never manually patch a deployed schema — always a new migration.
- Never rewrite an already-deployed migration's `up()`/`down()`; add a
  new migration instead.
- Prefer expand → migrate data → contract for risky changes across a
  deployment boundary.
- Back up before a high-risk production migration; test `up()`/`down()`
  where realistically safe to do so.
- Keep large data migrations separate from schema-changing migrations.

## Constraint and index conventions

- `NOT NULL` for genuinely required columns — do not rely solely on
  application validation.
- `CHECK` constraints for invariants the database can cheaply enforce
  (e.g. `amount > 0`, `remaining_amount >= 0`).
- `UNIQUE` for identity/reference integrity — tenant-scoped for
  tenant-local references (`UNIQUE(tenant_id, invoice_number)`),
  platform-global where the entity is global (`users.email`,
  `tenants.slug`).
- Real `FOREIGN KEY` constraints for relationships (see tenant-aware
  pattern above).
- Index foreign keys used in common joins; lead tenant-owned composite
  indexes with `tenant_id`; index status/date columns only where a real
  query pattern needs it. Don't index every column.
- State-transition validity belongs in domain/application logic, not
  only a database `ENUM`.

## Soft delete / deactivation

No global `deleted_at` policy. Per Spec #4 §40, the right mechanism
depends on the entity: **deactivate** (users, employees, practitioners,
services, master data), **archive** (patients where permitted, old
treatment plans), or **never hard-delete** (issued invoices, posted
payments, receipts, cash movements, closed caisse sessions, commission
earnings, audit events — corrections are reversal/adjustment, not
deletion). Clinical data deletion/amendment follows formal medical/
privacy policy, not generic CRUD (Spec #4 §9.4, §40).

## JSONB

Allowed only where flexible structured configuration genuinely requires
it (provider configuration, specialty-specific form configuration, safe
snapshots) — never as a substitute for relational modeling of core
entities (Spec #4 §43).

## Text search (future)

Patient/master-data search will likely use `pg_trgm` and/or PostgreSQL
full-text search once that work is scoped. Not installed now — no
concrete need yet (Spec #4 §44); avoid the dependency until it's used.

## Testing

`healthcare_practice_test` is a **separate PostgreSQL database**, never
`healthcare_practice`. `backend/phpunit.xml` hardcodes the test
connection (`DB_CONNECTION=pgsql`, `DB_DATABASE=healthcare_practice_test`,
...) as `<env>` values, which always win during a test run regardless of
`backend/.env` — this is what makes it structurally impossible for
`php artisan test` to reach the development database by accident, not
just a convention. `scripts/dev-up.sh` provisions both databases
identically and idempotently.

Tests exercising real PostgreSQL behavior (native `uuid` round-tripping,
`NUMERIC` precision, future `pg_trgm`/`JSONB`) should run against this
connection rather than SQLite, since SQLite doesn't share these
semantics. See `tests/Feature/Database/DatabaseFoundationTest.php` for
the pattern: a table created in `setUp()` and dropped in `tearDown()` —
never a real migration — proving the conventions above without adding
anything to the production schema (Spec 06 TASK-005 §35).

## What's still open

- PostgreSQL RLS — deferred, RISK-007.
- Owner/other-practitioner clinical access policy, patient sharing
  policy, and the other open items in Spec #4 §75 — none of these are
  resolved by this task.
