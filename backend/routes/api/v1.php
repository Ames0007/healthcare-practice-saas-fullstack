<?php

use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1 Routes
|--------------------------------------------------------------------------
|
| Loaded under the /api/v1 prefix by routes/api.php. Module route files
| are required from here as they are implemented — Identity (AUTH-001),
| then Tenancy (TENANT-001).
|
*/

Route::get('/health', HealthController::class);

require base_path('app/Modules/Identity/Presentation/routes.php');
require base_path('app/Modules/Tenancy/Presentation/routes.php');
