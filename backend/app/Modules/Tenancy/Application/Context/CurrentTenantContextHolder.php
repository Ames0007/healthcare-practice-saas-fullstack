<?php

namespace App\Modules\Tenancy\Application\Context;

use App\Modules\Tenancy\Domain\ValueObjects\TenantContext;

/**
 * Per-request holder for the resolved TenantContext (Spec #4 §36 "must be
 * implemented centrally, not manually remembered in every controller").
 * Bound as a container singleton (`AppServiceProvider`) so it lives exactly
 * as long as one request; `EnsureTenantContext` populates it, and
 * `Concerns\BelongsToTenant` reads it — the reusable tenant-scoping
 * mechanism future tenant-owned modules (Patients, Scheduling, ...) build
 * on. No consumer route exists yet (this task creates no business module),
 * so this stays unset in every current request.
 */
final class CurrentTenantContextHolder
{
    private ?TenantContext $context = null;

    public function set(TenantContext $context): void
    {
        $this->context = $context;
    }

    public function get(): ?TenantContext
    {
        return $this->context;
    }
}
