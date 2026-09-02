<?php

namespace App\Modules\Tenancy\Presentation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Presentation\Resources\UserResource;
use App\Modules\Tenancy\Application\Context\ResolveCurrentTenantContext;
use App\Modules\Tenancy\Application\Onboarding\ProvisionTenant;
use App\Modules\Tenancy\Application\Onboarding\ProvisionTenantData;
use App\Modules\Tenancy\Domain\Exceptions\TenantAlreadyProvisionedException;
use App\Modules\Tenancy\Presentation\Requests\ProvisionTenantRequest;
use App\Support\Http\ApiErrorResponse;
use Illuminate\Http\JsonResponse;

/**
 * Cabinet Onboarding provisioning (Gate 4, RISK-020). `auth:sanctum`-only
 * (routes file) — provisioning always attaches to the authenticated
 * caller, never a client-supplied user id. Deliberately NOT behind
 * `tenant.context`: a user with no tenant yet is exactly who is allowed to
 * call this endpoint.
 */
class ProvisionTenantController extends Controller
{
    public function __construct(
        private readonly ProvisionTenant $provisionTenant,
        private readonly ResolveCurrentTenantContext $resolveCurrentTenantContext,
    ) {}

    public function __invoke(ProvisionTenantRequest $request): JsonResponse
    {
        $user = $request->user();

        try {
            $this->provisionTenant->handle($user, ProvisionTenantData::fromValidated($request->validated()));
        } catch (TenantAlreadyProvisionedException) {
            return ApiErrorResponse::json(
                'TENANT_ALREADY_PROVISIONED',
                'This account is already linked to a cabinet.',
                409,
            );
        }

        return (new UserResource($user, $this->resolveCurrentTenantContext->handle($user)))
            ->response()
            ->setStatusCode(201);
    }
}
