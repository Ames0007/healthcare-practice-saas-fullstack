<?php

use App\Http\Middleware\AssignRequestId;
use App\Modules\Tenancy\Presentation\Middleware\EnsureTenantContext;
use App\Support\Http\ApiErrorResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ThrottleRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // AUTH-001: session-cookie authentication for the Next.js SPA
        // (DECISIONS.md ADR-021) — prepends Sanctum's stateful-frontend
        // middleware (session + CSRF) to the api group for requests whose
        // Origin/Referer matches config/sanctum.php's `stateful` list.
        $middleware->statefulApi();

        $middleware->append(AssignRequestId::class);

        // TENANT-001: registered for future tenant-owned business routes
        // (Patients, Scheduling, ...) to attach alongside auth:sanctum —
        // no route uses it yet (see Tenancy\Presentation\Middleware\
        // EnsureTenantContext's own doc comment).
        $middleware->alias([
            'tenant.context' => EnsureTenantContext::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // AUTH-001 §54/CLAUDE.md §54: the stable `{error: {...}}` envelope,
        // mapped here for the exception types AUTH-001's own endpoints can
        // throw. A full, repository-wide exception-code catalog is
        // TASK-011's scope (see app/Support/Http/ApiErrorResponse.php).
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiErrorResponse::json('AUTHENTICATION_REQUIRED', 'Authentication required.', 401);
            }
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiErrorResponse::json('VALIDATION_ERROR', 'The given data was invalid.', 422, $e->errors());
            }
        });

        $exceptions->render(function (ThrottleRequestsHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiErrorResponse::json(
                    'TOO_MANY_ATTEMPTS',
                    'Too many requests. Please try again later.',
                    429,
                    array_filter(['retry_after' => $e->getHeaders()['Retry-After'] ?? null]),
                );
            }
        });

        // InvalidCredentialsException/InvalidResetTokenException are
        // deliberately NOT mapped here: both are always caught inside
        // their own controller (LoginController/ResetPasswordController)
        // and translated to ApiErrorResponse there, so they never reach
        // the global handler — a second mapping here would be dead code.
    })->create();
