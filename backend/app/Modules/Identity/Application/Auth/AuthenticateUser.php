<?php

namespace App\Modules\Identity\Application\Auth;

use App\Modules\Identity\Domain\Exceptions\InvalidCredentialsException;
use App\Modules\Identity\Domain\Exceptions\TooManyLoginAttemptsException;
use App\Modules\Identity\Domain\Support\EmailNormalizer;
use App\Modules\Identity\Infrastructure\Persistence\User;
use Illuminate\Auth\SessionGuard;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Login use case (AUTH-001 §12-13, §16, §50). Account+IP throttling is
 * deliberately account-scoped (not IP-only) so a distributed attacker
 * rotating IPs is still slowed against one target account — this is in
 * addition to the coarser per-IP `throttle:login` route middleware
 * (Presentation layer), which is a backstop against broad password-spray
 * across many accounts from one IP.
 *
 * The same code path (generic InvalidCredentialsException + one throttle
 * hit) runs whether the email does not exist, the password is wrong, or
 * the account is disabled — CLAUDE.md §12/§37 requires none of these to be
 * distinguishable to the caller.
 */
final class AuthenticateUser
{
    private const MAX_ATTEMPTS = 5;

    private const DECAY_SECONDS = 60;

    public function __construct(private readonly SessionGuard $guard) {}

    public function handle(string $email, string $password, bool $remember, string $ip): User
    {
        $normalizedEmail = EmailNormalizer::normalize($email);
        $throttleKey = $this->throttleKey($normalizedEmail, $ip);

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_ATTEMPTS)) {
            throw new TooManyLoginAttemptsException(RateLimiter::availableIn($throttleKey));
        }

        // attemptWhen only logs the user in if the callback returns true —
        // an inactive account's session/remember-token is therefore never
        // created, not created-then-torn-down.
        $authenticated = $this->guard->attemptWhen([
            'email' => $normalizedEmail,
            'password' => $password,
        ], fn (User $user) => $user->isActive(), $remember);

        if (! $authenticated) {
            RateLimiter::hit($throttleKey, self::DECAY_SECONDS);
            Log::warning('auth.login.failed', ['ip' => $ip]);

            throw new InvalidCredentialsException;
        }

        RateLimiter::clear($throttleKey);

        /** @var User $user */
        $user = $this->guard->user();
        $user->forceFill(['last_login_at' => now()])->save();

        Log::info('auth.login.success', ['user_id' => $user->id, 'ip' => $ip]);

        return $user;
    }

    private function throttleKey(string $normalizedEmail, string $ip): string
    {
        return 'login:'.sha1($normalizedEmail.'|'.$ip);
    }
}
