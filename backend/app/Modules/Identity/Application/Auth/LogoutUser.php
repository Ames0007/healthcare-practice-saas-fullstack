<?php

namespace App\Modules\Identity\Application\Auth;

use App\Modules\Identity\Infrastructure\Persistence\User;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Logout use case (AUTH-001 §15). Invalidates the current session and
 * rotates the CSRF token, per Laravel's own documented logout sequence —
 * so the old session id is unusable even if it leaked, and the pre-logout
 * CSRF token cannot be replayed against the now-anonymous session.
 */
final class LogoutUser
{
    public function __construct(private readonly SessionGuard $guard) {}

    public function handle(Request $request): void
    {
        /** @var User|null $user */
        $user = $this->guard->user();

        $this->guard->logout();

        // The route's own `auth:sanctum` middleware (Illuminate\Auth\
        // Middleware\Authenticate::authenticate()) already called
        // Auth::shouldUse('sanctum') for this request, which changes what
        // "the default guard" means for the rest of it. Two separate
        // caches now hold the pre-logout user via that default: (1)
        // AuthManager's own per-name guard cache, cleared by forgetGuards()
        // — and (2) Illuminate\Auth\AuthServiceProvider's 'auth.driver'
        // container SINGLETON (aliased to the Guard contract), resolved
        // once and cached independently of forgetGuards(). Laravel's own
        // DatabaseSessionHandler::addUserInformation() reads user_id via
        // exactly that singleton when the session is saved at the end of
        // this response — without forgetting BOTH here, the freshly
        // rotated (correctly anonymous) session row would still be
        // written with the just-logged-out user's id.
        Auth::forgetGuards();
        app()->forgetInstance('auth.driver');

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        Log::info('auth.logout', ['user_id' => $user?->id]);
    }
}
