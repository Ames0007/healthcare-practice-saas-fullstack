<?php

namespace App\Modules\Identity\Presentation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Presentation\Resources\UserResource;
use App\Modules\Tenancy\Application\Context\ResolveCurrentTenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Session-bootstrap endpoint (AUTH-001 §14/§27, TENANT-001 §14). Sits
 * behind `auth:sanctum` (routes file) — an unauthenticated request never
 * reaches this class at all; the framework's own AuthenticationException
 * renders as the standard error envelope (see bootstrap/app.php
 * withExceptions). Depending on Tenancy's Application-layer resolver
 * (not its persistence directly) is the explicit cross-module interaction
 * pattern CLAUDE.md §4 asks for.
 */
class CurrentUserController extends Controller
{
    public function __construct(private readonly ResolveCurrentTenantContext $resolveCurrentTenantContext) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        return (new UserResource($user, $this->resolveCurrentTenantContext->handle($user)))
            ->response()
            ->setStatusCode(200);
    }
}
