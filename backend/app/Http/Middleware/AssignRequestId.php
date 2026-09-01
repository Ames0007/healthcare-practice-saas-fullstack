<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Minimal request-correlation-id support (CLAUDE.md §38/§54: safe logs and
 * error envelopes carry a `request_id`). This assigns/propagates one for
 * every `api/*` request and echoes it back as `X-Request-Id` — the full
 * cross-cutting version (queue-job propagation, provider-call propagation,
 * structured-log middleware for every route) is TASK-012's scope; this
 * exists now only so AUTH-001's own ApiErrorResponse envelope has a real
 * value to report instead of always `null`.
 */
class AssignRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->header('X-Request-Id') ?: (string) Str::uuid();

        $request->attributes->set('request_id', $requestId);

        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
