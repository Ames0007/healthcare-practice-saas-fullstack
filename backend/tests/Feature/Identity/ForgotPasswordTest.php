<?php

namespace Tests\Feature\Identity;

use App\Modules\Identity\Infrastructure\Persistence\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

class ForgotPasswordTest extends IdentityTestCase
{
    public function test_forgot_password_for_a_known_account_sends_a_reset_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
            ->assertStatus(200);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_forgot_password_response_is_generic_for_known_and_unknown_accounts(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);
        $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.test']);

        $known->assertStatus(200);
        $unknown->assertStatus(200);
        $this->assertSame($known->json('data.message'), $unknown->json('data.message'));
    }

    public function test_forgot_password_never_sends_a_notification_for_an_unknown_account(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.test'])
            ->assertStatus(200);

        Notification::assertNothingSent();
    }

    public function test_repeated_requests_do_not_reveal_account_existence_via_throttling(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        // First + second request for a REAL account: the second is
        // throttled by Laravel's password broker (60s) internally, but
        // this must not surface as a different HTTP response.
        $firstKnown = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);
        $secondKnown = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);

        // Same two requests for an account that does not exist at all.
        $firstUnknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.test']);
        $secondUnknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.test']);

        foreach ([$firstKnown, $secondKnown, $firstUnknown, $secondUnknown] as $response) {
            $response->assertStatus(200);
            $this->assertSame($firstKnown->json('data.message'), $response->json('data.message'));
        }
    }

    public function test_forgot_password_requires_a_well_formed_email(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }
}
