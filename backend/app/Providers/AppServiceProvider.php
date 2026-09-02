<?php

namespace App\Providers;

use App\Modules\Tenancy\Application\Context\CurrentTenantContextHolder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\SessionGuard;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // AUTH-001: the Identity application layer type-hints the concrete
        // SessionGuard (not the StatefulGuard interface) because it relies
        // on attemptWhen(), which is not part of that interface.
        $this->app->bind(SessionGuard::class, fn ($app) => $app['auth']->guard('web'));

        // TENANT-001: one holder per request — populated by
        // EnsureTenantContext, read by Tenancy\Infrastructure\Persistence\
        // Concerns\BelongsToTenant.
        $this->app->singleton(CurrentTenantContextHolder::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->configurePasswordResetUrl();

        // AUTH-001: both calls below are no-ops in production (every real
        // HTTP request already gets a brand-new process/container, so
        // there is nothing "stale" to forget) — they exist only because
        // Laravel's test HTTP client reuses the SAME application container
        // across sequential simulated requests within one test method
        // (`$this->postJson(...)` then `$this->getJson(...)`), which
        // otherwise leaks two kinds of state between those requests:
        //
        // 1. Sanctum's 'sanctum' RequestGuard caches its resolved user on
        //    the guard instance itself, independently of the underlying
        //    'web' SessionGuard — a session that was logged out in one
        //    simulated request would still "authenticate" a later request
        //    in the same test via that stale cached user.
        // 2. SessionManager caches the resolved Store driver instance;
        //    Store::loadSession() merges freshly-read data on top of
        //    whatever attributes are already in memory
        //    (array_replace($this->attributes, ...)) rather than replacing
        //    them outright, so a later request's session can inherit
        //    attributes (e.g. the auth key) left over from an earlier
        //    simulated request even when reading a different session id.
        //
        // Forgetting both at the end of every request makes each
        // request's guard/session resolution start clean, matching real
        // per-request behavior exactly instead of only accidentally
        // matching it in production.
        $this->app->terminating(function () {
            $this->app['auth']->forgetGuards();
            $this->app['session']->forgetDrivers();
            // Illuminate\Auth\AuthServiceProvider's 'auth.driver' binding
            // and Illuminate\Session\SessionServiceProvider's
            // 'session.store' binding are both container SINGLETONS,
            // resolved once and cached independently of forgetGuards()/
            // forgetDrivers() above. AuthManager::createSessionDriver()
            // builds a fresh SessionGuard using $app['session.store'] —
            // if that singleton still references an earlier request's Store
            // object, a freshly-built guard would read that OLD object's
            // in-memory session data instead of the current request's.
            $this->app->forgetInstance('auth.driver');
            $this->app->forgetInstance('session.store');

            // TENANT-001: CurrentTenantContextHolder is a singleton for the
            // same "one per request" reason as the two bindings above —
            // without forgetting it here, a TenantContext set by one
            // simulated request would still be readable by a later,
            // unrelated one in the same test method.
            $this->app->forgetInstance(CurrentTenantContextHolder::class);
        });
    }

    /**
     * AUTH-001 §16/§50: coarse per-IP backstops on the public auth
     * endpoints. The finer-grained per-account+IP login throttle lives in
     * AuthenticateUser (Application layer) — these two are complementary,
     * not duplicates: this one protects against a botnet sweeping many
     * accounts from one IP, that one protects one account against many
     * IPs.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));

        RateLimiter::for('forgot-password', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        RateLimiter::for('reset-password', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
    }

    /**
     * AUTH-001 §20: the emailed reset link must point at the frontend's
     * own `/auth/reset-password` route (Next.js), not a backend Blade
     * view — the backend has no server-rendered password-reset page.
     */
    private function configurePasswordResetUrl(): void
    {
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $frontendUrl = rtrim(config('app.frontend_url'), '/');

            return sprintf(
                '%s/auth/reset-password?token=%s&email=%s',
                $frontendUrl,
                $token,
                urlencode($notifiable->getEmailForPasswordReset()),
            );
        });
    }
}
