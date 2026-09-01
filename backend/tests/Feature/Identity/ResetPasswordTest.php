<?php

namespace Tests\Feature\Identity;

use App\Modules\Identity\Infrastructure\Persistence\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class ResetPasswordTest extends IdentityTestCase
{
    public function test_reset_with_a_valid_token_changes_the_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password-123')]);
        $token = Password::createToken($user);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ]);

        $response->assertStatus(200);
        $this->assertTrue(Hash::check('new-password-456', $user->fresh()->password));
    }

    public function test_old_password_no_longer_works_after_reset(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password-123')]);
        $token = Password::createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ])->assertStatus(200);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'old-password-123',
        ])->assertStatus(401);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'new-password-456',
        ])->assertStatus(200);
    }

    public function test_reset_token_is_single_use(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);

        $payload = [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ];

        $this->postJson('/api/v1/auth/reset-password', $payload)->assertStatus(200);

        $second = $this->postJson('/api/v1/auth/reset-password', array_merge($payload, [
            'password' => 'another-password-789',
            'password_confirmation' => 'another-password-789',
        ]));

        $second->assertStatus(422)->assertJsonPath('error.code', 'INVALID_RESET_TOKEN');
    }

    public function test_reset_with_invalid_token_is_rejected(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'not-a-real-token',
            'email' => $user->email,
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ]);

        $response->assertStatus(422)->assertJsonPath('error.code', 'INVALID_RESET_TOKEN');
    }

    public function test_reset_for_unknown_account_returns_the_same_generic_error(): void
    {
        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'irrelevant-token',
            'email' => 'nobody@example.test',
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ]);

        $response->assertStatus(422)->assertJsonPath('error.code', 'INVALID_RESET_TOKEN');
    }

    public function test_reset_enforces_password_confirmation(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password-456',
            'password_confirmation' => 'different-password',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('password', $response->json('error.details'));
    }

    public function test_reset_enforces_minimum_password_length(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('password', $response->json('error.details'));
    }

    public function test_reset_invalidates_existing_sessions(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password-123')]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'old-password-123',
        ])->assertStatus(200);

        $this->assertSame(1, DB::table('sessions')->where('user_id', $user->id)->count());

        $token = Password::createToken($user);
        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ])->assertStatus(200);

        $this->assertSame(0, DB::table('sessions')->where('user_id', $user->id)->count());
    }
}
