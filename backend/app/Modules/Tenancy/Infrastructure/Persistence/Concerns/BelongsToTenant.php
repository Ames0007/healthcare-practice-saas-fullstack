<?php

namespace App\Modules\Tenancy\Infrastructure\Persistence\Concerns;

use App\Modules\Tenancy\Application\Context\CurrentTenantContextHolder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

/**
 * The reusable tenant-scoping mechanism (Spec #4 §36, checklist Gate 3
 * §17) future tenant-owned business models (Patients, Appointments,
 * Invoices, ...) attach via `use BelongsToTenant;`. Every query against a
 * model using this trait is automatically filtered to the current
 * `CurrentTenantContextHolder`'s tenant, and every new row is
 * automatically stamped with it on create — a controller/repository can
 * never "forget" the `WHERE tenant_id = ...` clause (Spec #4 §36's own
 * instruction: "must be implemented centrally, not manually remembered in
 * every controller").
 *
 * Fails CLOSED, not open: querying a `BelongsToTenant` model with no
 * TenantContext resolved for the current request throws rather than
 * silently returning every tenant's rows — a missing `tenant.context`
 * middleware on a future route becomes a 500, never a cross-tenant leak.
 *
 * No production model uses this trait yet — this task creates no
 * tenant-owned business table (Patients/Agenda/Clinical/Finance/HR/Stock/
 * Communication persistence are all explicitly out of scope). It is proven
 * directly against a disposable test-only table, mirroring
 * `Tests\Feature\Database\DatabaseFoundationTest`'s own established
 * "Schema::create in setUp, drop in tearDown" pattern — see
 * `Tests\Feature\Tenancy\TenantIsolationTest`.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $builder->where(
                $builder->getModel()->getTable().'.tenant_id',
                self::currentTenantId(),
            );
        });

        static::creating(function (Model $model) {
            if (! $model->getAttribute('tenant_id')) {
                $model->setAttribute('tenant_id', self::currentTenantId());
            }
        });
    }

    private static function currentTenantId(): string
    {
        $context = app(CurrentTenantContextHolder::class)->get();

        if (! $context) {
            throw new RuntimeException(
                static::class.' was queried without a resolved TenantContext — '.
                'ensure the route runs behind the "tenant.context" middleware.',
            );
        }

        return $context->tenantId;
    }
}
