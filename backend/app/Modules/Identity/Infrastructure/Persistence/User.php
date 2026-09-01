<?php

namespace App\Modules\Identity\Infrastructure\Persistence;

use App\Models\Concerns\HasUuidPrimaryKey;
use Database\Factories\UserFactory;
use Illuminate\Auth\Authenticatable;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notifiable;

/**
 * The authentication identity (CLAUDE.md §5's `UserAccount`) — an Eloquent
 * model deliberately kept in Infrastructure/Persistence, not Domain: it is
 * inherently a framework/persistence concern (Authenticatable, query
 * builder), while `Domain/Support/EmailNormalizer` and the
 * `Domain/Exceptions/*` carry the framework-independent rules. This is the
 * first model of the Identity module and sets the project's own
 * "Eloquent models live in a module's Infrastructure layer" convention
 * (see backend/ARCHITECTURE.md).
 *
 * Deliberately carries no role, tenant_id, or employment field — those
 * belong to a future TenantMembership/TeamMember, never here (CLAUDE.md §5
 * domain boundary, AUTH-001 §6).
 *
 * @property string $id
 * @property string $email
 * @property string $password
 * @property string $status
 */
class User extends Model implements AuthenticatableContract, CanResetPasswordContract
{
    use Authenticatable;
    use CanResetPassword;
    use HasFactory;
    use HasUuidPrimaryKey;
    use Notifiable;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_DISABLED = 'disabled';

    protected $fillable = [
        'email',
        'password',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }
}
