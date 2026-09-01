<?php

namespace App\Modules\Identity\Application\Auth;

use App\Modules\Identity\Domain\Support\EmailNormalizer;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;

/**
 * Forgot-password use case (AUTH-001 §18-19). Uses Laravel's own
 * PasswordBroker (`config/auth.php` passwords.users — expire 60 min,
 * throttle 60s) rather than bespoke token generation: it already produces
 * a cryptographically random, single-use, time-limited, hashed-at-rest
 * token, which is exactly Spec #5 §12/AUTH-001 §19's requirement.
 */
final class RequestPasswordReset
{
    public function handle(string $email): void
    {
        $normalizedEmail = EmailNormalizer::normalize($email);

        $status = Password::sendResetLink(['email' => $normalizedEmail]);

        // Deliberately never branch response behavior on $status: RESET_LINK_SENT,
        // INVALID_USER and RESET_THROTTLED must look identical to the caller, or a
        // rapid double-request would let an attacker distinguish "this email has an
        // account" (throttled on 2nd request) from "this email has no account"
        // (never throttled) — CLAUDE.md §17/§37 enumeration-protection rule applied
        // to the throttle state itself, not just the response body.
        Log::info('auth.password.forgot_requested', ['status' => $status]);
    }
}
