<?php

namespace App\Modules\Tenancy\Application\Onboarding;

use App\Modules\Identity\Infrastructure\Persistence\User;
use App\Modules\Tenancy\Domain\Enums\MembershipProfileType;
use App\Modules\Tenancy\Domain\Enums\MembershipStatus;
use App\Modules\Tenancy\Domain\Enums\TenantStatus;
use App\Modules\Tenancy\Domain\Exceptions\TenantAlreadyProvisionedException;
use App\Modules\Tenancy\Domain\Support\TenantSlugGenerator;
use App\Modules\Tenancy\Infrastructure\Persistence\Tenant;
use App\Modules\Tenancy\Infrastructure\Persistence\TenantMembership;
use App\Modules\Tenancy\Infrastructure\Persistence\TenantSettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Cabinet Onboarding provisioning (Spec #2 §6, this task's Gate 4;
 * RISK-020, resolved here). Creates exactly one Tenant plus exactly one
 * OWNER TenantMembership (and its TenantSettings row) for the authenticated
 * user, transactionally (checklist §24/§28 "prevent partial provisioning")
 * — a failure at any step leaves none of the three rows behind.
 *
 * V1 deliberately has no tenant-switching (checklist §8), so a user who
 * already has ANY membership (any status, any tenant) cannot provision a
 * second tenant through this use case — `TenantAlreadyProvisionedException`
 * covers both "already owns a cabinet" and "already a staff member
 * elsewhere", since neither can safely provision another one without a
 * multi-tenant UX this task does not build.
 */
final class ProvisionTenant
{
    public function handle(User $user, ProvisionTenantData $data): Tenant
    {
        if (TenantMembership::query()->where('user_id', $user->id)->exists()) {
            throw new TenantAlreadyProvisionedException;
        }

        return DB::transaction(function () use ($user, $data) {
            $slug = TenantSlugGenerator::fromName(
                $data->name,
                fn (string $candidate) => Tenant::query()->where('slug', $candidate)->exists(),
            );

            $tenant = Tenant::create([
                'name' => $data->name,
                'slug' => $slug,
                'specialty' => $data->specialty->value,
                'phone' => $data->phone,
                'email' => $data->email,
                'address' => $data->address,
                'city' => $data->city,
                'preferred_language' => $data->preferredLanguage,
                'currency_code' => 'MAD',
                'timezone' => 'Africa/Casablanca',
                'status' => TenantStatus::Active,
            ]);

            TenantMembership::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'profile_type' => MembershipProfileType::OwnerAdmin,
                'status' => MembershipStatus::Active,
                'is_owner' => true,
                'joined_at' => now(),
            ]);

            TenantSettings::create([
                'tenant_id' => $tenant->id,
                'appointment_default_scheduling_mode' => $data->defaultSchedulingMode,
                'appointment_default_duration_minutes' => $data->defaultDurationMinutes,
                'onboarding_working_hours' => $data->workingHours,
                'onboarding_services' => $data->services,
                'onboarding_team' => $data->team,
            ]);

            Log::info('tenancy.tenant.provisioned', ['tenant_id' => $tenant->id, 'user_id' => $user->id]);

            return $tenant;
        });
    }
}
