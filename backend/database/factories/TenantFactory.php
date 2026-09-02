<?php

namespace Database\Factories;

use App\Modules\Tenancy\Domain\Enums\TenantSpecialty;
use App\Modules\Tenancy\Domain\Enums\TenantStatus;
use App\Modules\Tenancy\Infrastructure\Persistence\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.$this->faker->unique()->numberBetween(1000, 999999),
            'specialty' => TenantSpecialty::GeneralMedicine->value,
            'phone' => '0600000000',
            'email' => null,
            'address' => null,
            'city' => null,
            'preferred_language' => 'fr',
            'currency_code' => 'MAD',
            'timezone' => 'Africa/Casablanca',
            'status' => TenantStatus::Active,
        ];
    }

    public function suspended(): self
    {
        return $this->state(fn () => ['status' => TenantStatus::Suspended]);
    }
}
