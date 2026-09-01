<?php

namespace App\Modules\Identity\Application\Auth;

use App\Modules\Identity\Domain\Exceptions\InvalidResetTokenException;
use App\Modules\Identity\Domain\Support\EmailNormalizer;
use App\Modules\Identity\Infrastructure\Persistence\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;

/**
 * Reset-password use case (AUTH-001 §21). `Password::reset()` validates
 * the token (single-use — the broker deletes it as part of a successful
 * reset) before the callback below ever runs; any failure (unknown email,
 * wrong/expired/already-used token) is collapsed into one
 * InvalidResetTokenException (CLAUDE.md §37 enumeration-protection,
 * applied here to the token itself rather than the login password).
 */
final class ResetUserPassword
{
    public function handle(string $email, string $token, string $password): void
    {
        $normalizedEmail = EmailNormalizer::normalize($email);

        $status = Password::reset(
            [
                'email' => $normalizedEmail,
                'token' => $token,
                'password' => $password,
                'password_confirmation' => $password,
            ],
            function (User $user, string $newPassword) {
                $user->forceFill(['password' => $newPassword])->save();
                $this->invalidateExistingSessions($user);
                Log::info('auth.password.reset', ['user_id' => $user->id]);
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            Log::info('auth.password.reset_failed', ['status' => $status]);

            throw new InvalidResetTokenException;
        }
    }

    /**
     * Reset-password security policy (AUTH-001 §21 "Consider existing
     * sessions"): a password reset invalidates every existing session for
     * the account, on every device — the credential that made those
     * sessions trustworthy just changed. SESSION_DRIVER=database
     * (DECISIONS.md ADR-020) makes this a direct row purge; no session
     * exists for this request itself (the user is not authenticated during
     * password reset), so there is nothing to preserve.
     */
    private function invalidateExistingSessions(User $user): void
    {
        if (config('session.driver') !== 'database') {
            return;
        }

        DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->delete();
    }
}
