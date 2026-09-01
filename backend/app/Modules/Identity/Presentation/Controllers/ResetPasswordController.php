<?php

namespace App\Modules\Identity\Presentation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Application\Auth\ResetUserPassword;
use App\Modules\Identity\Domain\Exceptions\InvalidResetTokenException;
use App\Modules\Identity\Presentation\Requests\ResetPasswordRequest;
use App\Support\Http\ApiErrorResponse;
use Illuminate\Http\JsonResponse;

class ResetPasswordController extends Controller
{
    public function __construct(private readonly ResetUserPassword $resetUserPassword) {}

    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        try {
            $this->resetUserPassword->handle(
                email: $request->string('email')->toString(),
                token: $request->string('token')->toString(),
                password: $request->string('password')->toString(),
            );
        } catch (InvalidResetTokenException) {
            return ApiErrorResponse::json(
                'INVALID_RESET_TOKEN',
                'This password reset link is invalid or has expired.',
                422,
            );
        }

        return response()->json([
            'data' => ['message' => 'Your password has been reset. You can now sign in.'],
        ]);
    }
}
