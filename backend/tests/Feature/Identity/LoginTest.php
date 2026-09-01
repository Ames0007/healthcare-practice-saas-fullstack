<?php

namespace Tests\Feature\Identity;

use App\Modules\Identity\Infrastructure\Persistence\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class LoginTest extends IdentityTestCase
{
    public function test_login_with_valid_credentials_succeeds(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery')]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token');
    }

    public function test_login_never_exposes_the_password_hash(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery')]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ]);

        $this->assertStringNotContainsString($user->password, $response->getContent());
    }

    public function test_login_establishes_a_database_session(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery')]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertStatus(200);

        $this->assertSame(1, DB::table('sessions')->where('user_id', $user->id)->count());
    }

    public function test_login_updates_last_login_at(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery'), 'last_login_at' => null]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertStatus(200);

        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_login_with_wrong_password_is_rejected(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery')]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_login_with_unknown_email_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'nobody@example.test',
            'password' => 'whatever-password',
        ]);

        $response->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_unknown_email_and_wrong_password_are_indistinguishable(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery')]);

        $wrongPassword = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $unknownEmail = $this->postJson('/api/v1/auth/login', [
            'email' => 'nobody@example.test',
            'password' => 'whatever-password',
        ]);

        $this->assertSame($wrongPassword->getStatusCode(), $unknownEmail->getStatusCode());
        $this->assertSame(
            $wrongPassword->json('error.code'),
            $unknownEmail->json('error.code'),
        );
        $this->assertSame(
            $wrongPassword->json('error.message'),
            $unknownEmail->json('error.message'),
        );
    }

    public function test_login_with_disabled_account_is_rejected_with_the_same_generic_error(): void
    {
        $user = User::factory()->disabled()->create(['password' => Hash::make('correct-horse-battery')]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ]);

        $response->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_login_requires_email_and_password(): void
    {
        $response = $this->postJson('/api/v1/auth/login', []);

        $response->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $this->assertArrayHasKey('email', $response->json('error.details'));
        $this->assertArrayHasKey('password', $response->json('error.details'));
    }

    public function test_login_rejects_malformed_email(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'not-an-email',
            'password' => 'whatever-password',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('email', $response->json('error.details'));
    }

    public function test_login_is_rate_limited_after_repeated_failures(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery')]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])->assertStatus(401);
        }

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(429)->assertJsonPath('error.code', 'TOO_MANY_ATTEMPTS');
    }

    public function test_successful_login_clears_the_rate_limit_counter(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery')]);

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])->assertStatus(401);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertStatus(200);

        // The rate-limit counter is keyed on email+IP, independent of the
        // session established above — a fresh wrong-password attempt right
        // after a successful login must not still be counted against the
        // pre-success failures (RateLimiter::clear() ran on success).
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_remember_me_sets_a_persistent_remember_token(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery')]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
            'remember_me' => true,
        ])->assertStatus(200);

        $this->assertNotNull($user->fresh()->remember_token);
    }
}
