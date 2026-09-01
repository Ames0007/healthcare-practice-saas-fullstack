<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    // TASK-002: environment-driven origin allowlist instead of the
    // framework's default wildcard (Specification #5 §22 / CLAUDE.md §22).
    // No frontend exists yet (TASK-003); this defaults to the standard
    // local Next.js dev port and is expected to be refined per-environment
    // in TASK-004 (local dev environment) and at production deploy time.
    //
    // AUTH-001: `sanctum/csrf-cookie` added — it lives outside the
    // `api/*` prefix (Sanctum registers it at the application root) but
    // the frontend must fetch it cross-origin before any stateful POST.
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000'))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // AUTH-001: cookies (session + XSRF-TOKEN) must be allowed to cross the
    // localhost:3000 <-> localhost:8000 boundary for Sanctum's stateful SPA
    // authentication to work at all — `allowed_origins` above stays a
    // specific allowlist (never `*`) precisely because credentialed CORS
    // requires it; browsers reject `Access-Control-Allow-Credentials: true`
    // paired with a wildcard origin.
    'supports_credentials' => true,

];
