<?php

namespace App\Modules\Tenancy\Domain\Exceptions;

use RuntimeException;

/**
 * Thrown when an authenticated user who already holds a `TenantMembership`
 * (any status, any tenant) attempts to provision another cabinet through
 * onboarding. V1 has no tenant-switching UI/API (checklist §8), so this is
 * a hard stop rather than a silent second membership.
 */
final class TenantAlreadyProvisionedException extends RuntimeException {}
