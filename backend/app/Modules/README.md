# Modules

This directory holds the business modules of the modular monolith.
`Identity` (AUTH-001) and `Tenancy` (TENANT-001) are implemented — both
Phase 1 per `docs/specifications/06-master-implementation-plan.md`. Every
other module below remains unimplemented.

## Convention

Each module owns its business rules and is structured as:

```text
Modules/
  <ModuleName>/
    Domain/           Entities, value objects, domain rules, state
                       transitions, domain events. No framework/HTTP
                       dependency.
    Application/       Use cases, commands, queries, transaction
                       orchestration, use-case-specific authorization.
    Infrastructure/     Database repositories, Redis, object storage,
                       external provider adapters.
    Presentation/       HTTP controllers, request validation, response
                       transformation. Controllers stay thin.
```

This mirrors `docs/specifications/05-technical-api-security.md` §7-8 and
`CLAUDE.md` §4-5.

## Planned modules

```text
Identity
Tenancy
Patients
Clinical
Scheduling
Treatments
Billing
CashManagement
Team
Commissions
Inventory
Communication
MasterData
Subscriptions
Referrals
Reporting
Audit
```

## Rules

- Modules communicate through explicit application services or domain
  events, never by reaching into another module's persistence directly.
- Do not implement a module's entities/services ahead of the task that
  owns it (see `docs/specifications/06-master-implementation-plan.md`
  for sequencing and dependencies).
- Infrastructure not owned by a specific module (health checks, request
  IDs, error contract, etc.) lives in the conventional Laravel locations
  under `app/Http`, `app/Providers`, not under `app/Modules`.
