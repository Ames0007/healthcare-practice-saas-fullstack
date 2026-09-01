<?php

namespace Tests\Feature\Identity;

use App\Modules\Identity\Infrastructure\Persistence\User;

class CurrentUserTest extends IdentityTestCase
{
    public function test_me_returns_the_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonMissingPath('data.password');
    }

    public function test_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401)->assertJsonPath('error.code', 'AUTHENTICATION_REQUIRED');
    }

    public function test_login_then_me_reflects_the_established_session(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct-horse-battery')]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertStatus(200);

        $this->withSessionCookieFrom($loginResponse)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('data.id', $user->id);
    }
}
