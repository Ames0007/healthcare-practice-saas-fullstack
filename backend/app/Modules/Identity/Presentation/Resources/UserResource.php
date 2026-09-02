<?php

namespace App\Modules\Identity\Presentation\Resources;

use App\Modules\Identity\Infrastructure\Persistence\User;
use App\Modules\Tenancy\Domain\ValueObjects\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The safe, frontend-facing UserAccount shape (AUTH-001 §13: never a
 * password hash, reset token, session secret, or other internal security
 * metadata). `tenant`/`membership` (TENANT-001) are both nullable — a user
 * with no active `TenantMembership` yet (not onboarded) gets `null` for
 * both, which is how the frontend decides between `/app` and `/onboarding`
 * (never a 403/error for this ordinary, expected state). The caller
 * resolves the `TenantContext` itself (`ResolveCurrentTenantContext`) —
 * this resource only projects it, it never queries.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    public function __construct(User $user, private readonly ?TenantContext $tenantContext = null)
    {
        parent::__construct($user);
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'status' => $this->status,
            'lastLoginAt' => $this->last_login_at?->toIso8601String(),
            'tenant' => $this->tenantContext ? [
                'id' => $this->tenantContext->tenantId,
                'name' => $this->tenantContext->tenantName,
                'slug' => $this->tenantContext->tenantSlug,
                'status' => $this->tenantContext->tenantStatus->value,
            ] : null,
            'membership' => $this->tenantContext ? [
                'id' => $this->tenantContext->membershipId,
                'profileType' => $this->tenantContext->profileType->value,
                'isOwner' => $this->tenantContext->isOwner,
            ] : null,
        ];
    }
}
