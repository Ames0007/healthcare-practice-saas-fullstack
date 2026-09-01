<?php

namespace App\Modules\Identity\Presentation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Presentation\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Session-bootstrap endpoint (AUTH-001 §14/§27). Sits behind `auth:sanctum`
 * (routes file) — an unauthenticated request never reaches this class at
 * all; the framework's own AuthenticationException renders as the standard
 * error envelope (see bootstrap/app.php withExceptions).
 */
class CurrentUserController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        return (new UserResource($request->user()))
            ->response()
            ->setStatusCode(200);
    }
}
