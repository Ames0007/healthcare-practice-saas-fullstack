<?php

namespace App\Modules\Identity\Presentation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Application\Auth\AuthenticateUser;
use App\Modules\Identity\Domain\Exceptions\InvalidCredentialsException;
use App\Modules\Identity\Domain\Exceptions\TooManyLoginAttemptsException;
use App\Modules\Identity\Presentation\Requests\LoginRequest;
use App\Modules\Identity\Presentation\Resources\UserResource;
use App\Modules\Tenancy\Application\Context\ResolveCurrentTenantContext;
use App\Support\Http\ApiErrorResponse;
use Illuminate\Http\JsonResponse;

class LoginController extends Controller
{
    public function __construct(
        private readonly AuthenticateUser $authenticateUser,
        private readonly ResolveCurrentTenantContext $resolveCurrentTenantContext,
    ) {}

    public function __invoke(LoginRequest $request): JsonResponse
    {
        try {
            $user = $this->authenticateUser->handle(
                email: $request->string('email')->toString(),
                password: $request->string('password')->toString(),
                remember: $request->boolean('remember_me'),
                ip: (string) $request->ip(),
            );
        } catch (TooManyLoginAttemptsException $exception) {
            return ApiErrorResponse::json(
                'TOO_MANY_ATTEMPTS',
                'Too many login attempts. Please try again later.',
                429,
                ['retry_after' => $exception->retryAfterSeconds],
            );
        } catch (InvalidCredentialsException) {
            return ApiErrorResponse::json('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
        }

        // TENANT-001 §14: login's own response carries the same tenant/
        // membership shape as `/me` so the frontend session state is
        // correct immediately, without a forced extra round trip.
        return (new UserResource($user, $this->resolveCurrentTenantContext->handle($user)))
            ->response()
            ->setStatusCode(200);
    }
}
