<?php

namespace Tests\Support;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Shared setup for every feature test that exercises the real Sanctum
 * stateful-SPA session (originally `Tests\Feature\Identity\IdentityTestCase`,
 * AUTH-001; extracted in TENANT-001 once a second module — Tenancy — needed
 * the identical setup). `RefreshDatabase` plus an `Origin` header matching
 * SANCTUM_STATEFUL_DOMAINS (phpunit.xml).
 *
 * Sanctum's EnsureFrontendRequestsAreStateful only applies the session/CSRF
 * middleware stack to requests it recognizes as coming from the frontend
 * (`fromFrontend()` reads the Origin/Referer header) — Laravel's HTTP test
 * client sends neither by default, so without this header every request in
 * these tests would silently run stateless (no session ever started),
 * making login/logout/me impossible to test at all. This mirrors exactly
 * what the real Next.js frontend sends on every fetch.
 *
 * `withCredentials()` mirrors the frontend's own `fetch(..., {credentials:
 * "include"})` (see frontend/src/lib/api-client.ts): `postJson()`/
 * `getJson()` never send ANY cookie — not even ones registered via
 * `withCookie()` — unless this is set
 * (`MakesHttpRequests::prepareCookiesForJsonRequest()` gates on it). Without
 * it, every request in these tests would silently run anonymous regardless
 * of any cookie forwarding, exactly like a real `fetch()` call missing
 * `credentials: "include"` would.
 */
abstract class StatefulApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Origin', 'http://localhost:3000');
        $this->withCredentials();
    }

    /**
     * Laravel's HTTP test client, unlike a real browser, does NOT carry
     * Set-Cookie headers from one response into the next request
     * automatically (`MakesHttpRequests::prepareCookiesForRequest()` only
     * ever sends cookies explicitly registered via `withCookie()`). A test
     * that exercises a real multi-request flow (login, then a follow-up
     * authenticated call) must therefore forward the session cookie
     * explicitly — this is the standard Laravel testing pattern for that,
     * using the framework's own `TestResponse::getCookie()` decryption
     * rather than hand-rolling it.
     */
    protected function withSessionCookieFrom(TestResponse $response): static
    {
        $sessionCookie = $response->getCookie(config('session.cookie'));

        if ($sessionCookie) {
            $this->withCookie($sessionCookie->getName(), $sessionCookie->getValue());
        }

        return $this;
    }
}
