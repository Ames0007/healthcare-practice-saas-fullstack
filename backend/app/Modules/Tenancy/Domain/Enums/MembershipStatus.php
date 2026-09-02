<?php

namespace App\Modules\Tenancy\Domain\Enums;

/**
 * Spec #4 §4.2 `tenant_memberships.status`. Only an Active membership
 * resolves a current tenant (`ResolveCurrentTenantContext`) — Invited and
 * Disabled are both treated as "no current tenant" for TENANT-001's
 * purposes (checklist §15).
 */
enum MembershipStatus: string
{
    case Invited = 'invited';
    case Active = 'active';
    case Disabled = 'disabled';
}
