<?php

namespace Database\Factories;

use App\Modules\Identity\Infrastructure\Persistence\User;
use App\Modules\Tenancy\Domain\Enums\MembershipProfileType;
use App\Modules\Tenancy\Domain\Enums\MembershipStatus;
use App\Modules\Tenancy\Infrastructure\Persistence\Tenant;
use App\Modules\Tenancy\Infrastructure\Persistence\TenantMembership;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TenantMembership>
 */
class TenantMembershipFactory extends Factory
{
    protected $model = TenantMembership::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'user_id' => User::factory(),
            'profile_type' => MembershipProfileType::OwnerAdmin,
            'status' => MembershipStatus::Active,
            'is_owner' => true,
            'joined_at' => now(),
        ];
    }

    public function owner(): self
    {
        return $this->state(fn () => ['profile_type' => MembershipProfileType::OwnerAdmin, 'is_owner' => true]);
    }

    public function staff(): self
    {
        return $this->state(fn () => ['profile_type' => MembershipProfileType::Staff, 'is_owner' => false]);
    }

    public function disabled(): self
    {
        return $this->state(fn () => ['status' => MembershipStatus::Disabled]);
    }

    public function invited(): self
    {
        return $this->state(fn () => ['status' => MembershipStatus::Invited, 'joined_at' => null]);
    }
}
