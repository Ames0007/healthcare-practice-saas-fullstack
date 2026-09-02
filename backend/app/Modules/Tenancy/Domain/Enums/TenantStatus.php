<?php

namespace App\Modules\Tenancy\Domain\Enums;

/**
 * Spec #4 §5.1 `tenants.status`. Deliberately distinct from
 * `MembershipStatus`/User `status`/a future `SubscriptionStatus`
 * (CLAUDE.md §7 "Tenant status must NOT be confused with...").
 */
enum TenantStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';
    case Closed = 'closed';
}
