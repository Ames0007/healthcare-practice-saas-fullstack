<?php

namespace App\Modules\Tenancy\Infrastructure\Persistence;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Modules\Tenancy\Domain\Enums\TenantStatus;
use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * The healthcare cabinet/organization (CLAUDE.md §6, Spec #4 §5.1) — the
 * primary tenant-isolation boundary every future business-module table
 * scopes against. Eloquent model lives in Infrastructure/Persistence,
 * mirroring `Identity\Infrastructure\Persistence\User`'s own established
 * convention (see backend/ARCHITECTURE.md).
 *
 * @property string $id
 * @property string $name
 * @property string $slug
 * @property string $specialty
 * @property string $phone
 * @property string|null $email
 * @property string|null $address
 * @property string|null $city
 * @property string $preferred_language
 * @property string $currency_code
 * @property string $timezone
 * @property TenantStatus $status
 */
class Tenant extends Model
{
    use HasFactory;
    use HasUuidPrimaryKey;

    protected $fillable = [
        'name',
        'slug',
        'specialty',
        'phone',
        'email',
        'address',
        'city',
        'preferred_language',
        'currency_code',
        'timezone',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => TenantStatus::class,
        ];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(TenantMembership::class);
    }

    public function settings(): HasOne
    {
        return $this->hasOne(TenantSettings::class);
    }

    protected static function newFactory(): TenantFactory
    {
        return TenantFactory::new();
    }
}
