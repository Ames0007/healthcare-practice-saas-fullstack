<?php

namespace App\Modules\Tenancy\Application\Context;

use App\Modules\Identity\Infrastructure\Persistence\User;
use App\Modules\Tenancy\Domain\Enums\MembershipStatus;
use App\Modules\Tenancy\Domain\ValueObjects\TenantContext;
use App\Modules\Tenancy\Infrastructure\Persistence\TenantMembership;

/**
 * Authentication lifecycle step 5 (Spec #5 §13): "Resolve memberships ->
 * Select/current tenant". A user has at most one ACTIVE membership in this
 * V1 implementation (checklist §8: no tenant-switching UI/API is built —
 * the schema still allows multiple membership rows per user for a future
 * task; this resolver just never needs to choose between them yet). An
 * invited/disabled-only membership set resolves to no current tenant, the
 * same as having none at all (checklist §15's "missing/inactive-membership
 * behavior").
 */
final class ResolveCurrentTenantContext
{
    public function handle(User $user): ?TenantContext
    {
        $membership = TenantMembership::query()
            ->with('tenant')
            ->where('user_id', $user->id)
            ->where('status', MembershipStatus::Active->value)
            ->orderBy('joined_at')
            ->orderBy('created_at')
            ->first();

        if (! $membership || ! $membership->tenant) {
            return null;
        }

        $tenant = $membership->tenant;

        return new TenantContext(
            tenantId: $tenant->id,
            tenantName: $tenant->name,
            tenantSlug: $tenant->slug,
            tenantStatus: $tenant->status,
            membershipId: $membership->id,
            profileType: $membership->profile_type,
            isOwner: $membership->is_owner,
        );
    }
}
