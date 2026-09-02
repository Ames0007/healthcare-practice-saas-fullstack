<?php

namespace App\Modules\Tenancy\Domain\ValueObjects;

use App\Modules\Tenancy\Domain\Enums\MembershipProfileType;
use App\Modules\Tenancy\Domain\Enums\TenantStatus;

/**
 * The one authoritative "which tenant is this request for" object (Spec #5
 * §14, CLAUDE.md §6). Built exclusively from the authenticated user's own
 * active membership — never from a client-supplied tenant identifier.
 *
 * The spec's conceptual shape also lists `subscription_status` and
 * `permissions` — both deliberately absent here: Subscriptions and
 * AUTHZ-001 are separate, not-yet-implemented modules (this task's own
 * explicit boundary). A future task extends this object once those exist,
 * rather than this task guessing their shape now.
 */
final readonly class TenantContext
{
    public function __construct(
        public string $tenantId,
        public string $tenantName,
        public string $tenantSlug,
        public TenantStatus $tenantStatus,
        public string $membershipId,
        public MembershipProfileType $profileType,
        public bool $isOwner,
    ) {}
}
