<?php

namespace App\Modules\Identity\Presentation\Resources;

use App\Modules\Identity\Infrastructure\Persistence\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The safe, frontend-facing UserAccount shape (AUTH-001 §13: never a
 * password hash, reset token, session secret, or other internal security
 * metadata). No tenant/membership field — Tenancy is out of this task's
 * scope (CLAUDE.md's explicit boundary); `TenantMembership` will project
 * its own resource once that module exists.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'status' => $this->status,
            'lastLoginAt' => $this->last_login_at?->toIso8601String(),
        ];
    }
}
