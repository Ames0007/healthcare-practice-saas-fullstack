<?php

use App\Modules\Tenancy\Presentation\Controllers\ProvisionTenantController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Tenancy module routes (TENANT-001)
|--------------------------------------------------------------------------
|
| Required from routes/api/v1.php under the /api/v1 prefix. Provisioning
| requires an authenticated Sanctum session but deliberately NOT the
| `tenant.context` middleware — a user with no tenant yet is exactly who
| is allowed to call this endpoint.
|
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/tenants/provision', ProvisionTenantController::class);
});
