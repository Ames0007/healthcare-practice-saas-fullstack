<?php

namespace Tests\Feature\Identity;

use App\Modules\Identity\Infrastructure\Persistence\User;
use Illuminate\Support\Facades\DB;

class LogoutTest extends IdentityTestCase
{
    public function test_logout_invalidates_the_session(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct-horse-battery')]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertStatus(200);

        $logoutResponse = $this->withSessionCookieFrom($loginResponse)
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200)
            ->assertJsonPath('data.loggedOut', true);

        $this->withSessionCookieFrom($logoutResponse)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }

    public function test_logout_removes_the_session_row(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct-horse-battery')]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertStatus(200);

        $this->assertSame(1, DB::table('sessions')->where('user_id', $user->id)->count());

        $this->withSessionCookieFrom($loginResponse)
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200);

        $this->assertSame(0, DB::table('sessions')->where('user_id', $user->id)->count());
    }

    public function test_logout_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/logout')->assertStatus(401);
    }
}
