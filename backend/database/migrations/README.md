# Migrations

Started empty (TASK-005). Laravel 13's default scaffolding migrations
(`users`/`password_reset_tokens`/`sessions`, `cache`/`cache_locks`,
`jobs`/`job_batches`/`failed_jobs`) were reviewed and removed before ever
being run — the database was confirmed empty first. See
`backend/database/README.md` for the disposition reasoning and
`docs/implementation/CHANGELOG.md` (TASK-005) for the full record.

Identity/Tenancy (Phase 1) added the first real migrations, using the
UUID/TIMESTAMPTZ conventions in `backend/database/README.md`:

```text
AUTH-001    users, sessions, password_reset_tokens
TENANT-001  tenants, tenant_memberships, tenant_settings
```

Every other business module (Patients, Clinical, Scheduling, ...) remains
unimplemented — see `backend/app/Modules/README.md`.
