<?php

use App\Modules\Identity\Presentation\Controllers\CurrentUserController;
use App\Modules\Identity\Presentation\Controllers\ForgotPasswordController;
use App\Modules\Identity\Presentation\Controllers\LoginController;
use App\Modules\Identity\Presentation\Controllers\LogoutController;
use App\Modules\Identity\Presentation\Controllers\ResetPasswordController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Identity module routes (AUTH-001)
|--------------------------------------------------------------------------
|
| Required from routes/api/v1.php under the /api/v1 prefix. `login`,
| `forgot-password` and `reset-password` are public but rate-limited
| (coarse per-IP backstop here; the fine-grained per-account+IP throttle
| lives in the Application-layer use cases). `logout`/`me` require an
| authenticated Sanctum session.
|
*/

Route::prefix('auth')->group(function () {
    Route::post('/login', LoginController::class)->middleware('throttle:login');
    Route::post('/forgot-password', ForgotPasswordController::class)->middleware('throttle:forgot-password');
    Route::post('/reset-password', ResetPasswordController::class)->middleware('throttle:reset-password');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', LogoutController::class);
        Route::get('/me', CurrentUserController::class);
    });
});
