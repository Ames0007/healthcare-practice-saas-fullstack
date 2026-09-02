<?php

namespace App\Modules\Tenancy\Presentation\Middleware;

use App\Modules\Tenancy\Application\Context\CurrentTenantContextHolder;
use App\Modules\Tenancy\Application\Context\ResolveCurrentTenantContext;
use App\Support\Http\ApiErrorResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Registered as the `tenant.context` middleware alias (bootstrap/app.php).
 * Always runs after `auth:sanctum`. Resolves the authenticated user's
 * TenantContext and populates `CurrentTenantContextHolder` for the
 * duration of the request — the population step
 * `Infrastructure\Persistence\Concerns\BelongsToTenant` depends on. No
 * route uses this yet (no tenant-owned business module exists), but every
 * future one (Patients, Scheduling, ...) attaches it alongside
 * `auth:sanctum`.
 */
class EnsureTenantContext
{
    public function __construct(
        private readonly ResolveCurrentTenantContext $resolveCurrentTenantContext,
        private readonly CurrentTenantContextHolder $holder,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $context = $this->resolveCurrentTenantContext->handle($request->user());

        if (! $context) {
            return ApiErrorResponse::json(
                'TENANT_CONTEXT_REQUIRED',
                'No active tenant membership for this account.',
                403,
            );
        }

        $this->holder->set($context);

        return $next($request);
    }
}
