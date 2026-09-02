<?php

namespace App\Modules\Tenancy\Domain\Enums;

/**
 * Spec #4 §4.2 `tenant_memberships.profile_type`. This is deliberately NOT
 * a permission/role system — fine-grained permission grants belong to a
 * future `membership_permissions` table (AUTHZ-001's scope, CLAUDE.md §5/§8;
 * see `TenantMembership`'s own doc comment).
 */
enum MembershipProfileType: string
{
    case OwnerAdmin = 'owner_admin';
    case Practitioner = 'practitioner';
    case Staff = 'staff';
}
