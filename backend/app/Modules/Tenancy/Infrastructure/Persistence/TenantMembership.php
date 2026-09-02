<?php

namespace App\Modules\Tenancy\Infrastructure\Persistence;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Modules\Identity\Infrastructure\Persistence\User;
use App\Modules\Tenancy\Domain\Enums\MembershipProfileType;
use App\Modules\Tenancy\Domain\Enums\MembershipStatus;
use Database\Factories\TenantMembershipFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Connects a User to a Tenant (Spec #4 §4.2). `profile_type`/`is_owner` are
 * deliberately the ONLY role-like fields here — fine-grained permission
 * grants belong to a future `membership_permissions` table (AUTHZ-001's
 * scope, CLAUDE.md §5/§8, this task's own explicit boundary).
 *
 * Deliberately NOT `use BelongsToTenant` (Infrastructure/Persistence/
 * Concerns): resolving "which tenant is current" (`ResolveCurrentTenant
 * Context`) requires querying a user's OWN memberships across whichever
 * tenant(s) they belong to, before any tenant is known — auto-scoping this
 * model to "the current tenant" would make that very query impossible.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $user_id
 * @property MembershipProfileType $profile_type
 * @property MembershipStatus $status
 * @property bool $is_owner
 * @property Carbon|null $joined_at
 */
class TenantMembership extends Model
{
    use HasFactory;
    use HasUuidPrimaryKey;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'profile_type',
        'status',
        'is_owner',
        'joined_at',
    ];

    protected function casts(): array
    {
        return [
            'profile_type' => MembershipProfileType::class,
            'status' => MembershipStatus::class,
            'is_owner' => 'boolean',
            'joined_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function newFactory(): TenantMembershipFactory
    {
        return TenantMembershipFactory::new();
    }
}
