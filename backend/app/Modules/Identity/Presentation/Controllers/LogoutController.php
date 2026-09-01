<?php

namespace App\Modules\Identity\Presentation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Application\Auth\LogoutUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogoutController extends Controller
{
    public function __construct(private readonly LogoutUser $logoutUser) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->logoutUser->handle($request);

        return response()->json(['data' => ['loggedOut' => true]]);
    }
}
