<?php

namespace Database\Factories;

use App\Modules\Identity\Domain\Support\EmailNormalizer;
use App\Modules\Identity\Infrastructure\Persistence\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'email' => EmailNormalizer::normalize($this->faker->unique()->safeEmail()),
            'password' => Hash::make('Password123!'),
            'status' => User::STATUS_ACTIVE,
            'email_verified_at' => now(),
            'last_login_at' => null,
            'remember_token' => null,
        ];
    }

    public function disabled(): self
    {
        return $this->state(fn () => ['status' => User::STATUS_DISABLED]);
    }

    public function unverified(): self
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }
}
