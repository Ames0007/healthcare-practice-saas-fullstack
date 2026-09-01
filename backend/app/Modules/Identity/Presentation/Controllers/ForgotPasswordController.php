<?php

namespace App\Modules\Identity\Presentation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Application\Auth\RequestPasswordReset;
use App\Modules\Identity\Presentation\Requests\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;

class ForgotPasswordController extends Controller
{
    public function __construct(private readonly RequestPasswordReset $requestPasswordReset) {}

    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $this->requestPasswordReset->handle($request->string('email')->toString());

        // Always the same generic response regardless of whether the
        // account exists (CLAUDE.md §17/AUTH-001 §18) — enforced in the
        // controller, not just documented, so no future edit to the use
        // case can accidentally leak account existence through this path.
        return response()->json([
            'data' => [
                'message' => 'If an account exists for this email, reset instructions will be sent.',
            ],
        ]);
    }
}
