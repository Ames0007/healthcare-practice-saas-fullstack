<?php

namespace Tests\Feature\Tenancy;

use App\Modules\Identity\Infrastructure\Persistence\User;
use App\Modules\Tenancy\Infrastructure\Persistence\Tenant;
use App\Modules\Tenancy\Infrastructure\Persistence\TenantMembership;
use App\Modules\Tenancy\Infrastructure\Persistence\TenantSettings;
use Illuminate\Support\Facades\DB;

/**
 * Cabinet Onboarding provisioning (Gate 4, RISK-020). Payload shape mirrors
 * exactly what `OnboardingWizard`'s accumulated draft sends — see
 * `frontend/src/features/onboarding/onboarding-state.ts`.
 */
class ProvisionTenantTest extends TenancyTestCase
{
    private function validPayload(array $overrides = []): array
    {
        return array_replace_recursive([
            'cabinet' => [
                'name' => 'Cabinet Atlas',
                'specialty' => 'dentistry',
                'address' => '12 Rue des Fleurs',
                'city' => 'Casablanca',
                'phone' => '0522000000',
                'email' => 'contact@cabinet-atlas.test',
                'preferredLanguage' => 'fr',
            ],
            'hours' => [
                'monday' => ['isOpen' => true, 'startTime' => '09:00', 'endTime' => '18:00'],
                'sunday' => ['isOpen' => false, 'startTime' => '', 'endTime' => ''],
            ],
            'services' => [
                ['id' => 'draft-1', 'name' => 'Consultation', 'durationMinutes' => 30, 'price' => 200, 'schedulingMode' => 'exact', 'active' => true],
            ],
            'team' => [
                ['id' => 'draft-team-1', 'firstName' => 'Sara', 'lastName' => 'Idrissi', 'professionalTitle' => 'Assistante', 'role' => 'assistant', 'phone' => '0600000000', 'email' => 'sara@example.test'],
            ],
            'preferences' => [
                'defaultSchedulingMode' => 'exact',
                'defaultDurationMinutes' => 30,
            ],
        ], $overrides);
    }

    public function test_provisioning_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/tenants/provision', $this->validPayload());

        $response->assertStatus(401)->assertJsonPath('error.code', 'AUTHENTICATION_REQUIRED');
    }

    public function test_provisioning_creates_tenant_owner_membership_and_settings_transactionally(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'web')->postJson('/api/v1/tenants/provision', $this->validPayload());

        $response->assertStatus(201)
            ->assertJsonPath('data.tenant.name', 'Cabinet Atlas')
            ->assertJsonPath('data.tenant.status', 'active')
            ->assertJsonPath('data.membership.profileType', 'owner_admin')
            ->assertJsonPath('data.membership.isOwner', true);

        $this->assertSame(1, Tenant::query()->count());
        $this->assertSame(1, TenantMembership::query()->count());
        $this->assertSame(1, TenantSettings::query()->count());

        $tenant = Tenant::query()->sole();
        $this->assertSame('dentistry', $tenant->specialty);
        $this->assertSame('MAD', $tenant->currency_code);
        $this->assertNotEmpty($tenant->slug);

        $membership = TenantMembership::query()->sole();
        $this->assertSame($user->id, $membership->user_id);
        $this->assertSame($tenant->id, $membership->tenant_id);
        $this->assertTrue($membership->is_owner);
        $this->assertNotNull($membership->joined_at);

        $settings = TenantSettings::query()->sole();
        $this->assertSame($tenant->id, $settings->tenant_id);
        $this->assertSame(30, $settings->appointment_default_duration_minutes);
        $this->assertSame('Consultation', $settings->onboarding_services[0]['name']);
        $this->assertSame('Sara', $settings->onboarding_team[0]['firstName']);
        $this->assertTrue($settings->onboarding_working_hours['monday']['isOpen']);
    }

    public function test_slug_is_derived_from_the_cabinet_name(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->postJson('/api/v1/tenants/provision', $this->validPayload(['cabinet' => ['name' => 'Cabinet Atlas']]))
            ->assertStatus(201);

        $this->assertSame('cabinet-atlas', Tenant::query()->sole()->slug);
    }

    public function test_duplicate_cabinet_names_receive_distinct_slugs(): void
    {
        $firstOwner = User::factory()->create();
        $secondOwner = User::factory()->create();

        $this->actingAs($firstOwner, 'web')
            ->postJson('/api/v1/tenants/provision', $this->validPayload(['cabinet' => ['name' => 'Cabinet Atlas']]))
            ->assertStatus(201);

        $this->actingAs($secondOwner, 'web')
            ->postJson('/api/v1/tenants/provision', $this->validPayload(['cabinet' => ['name' => 'Cabinet Atlas']]))
            ->assertStatus(201);

        $slugs = Tenant::query()->pluck('slug')->all();
        $this->assertCount(2, array_unique($slugs));
    }

    public function test_a_user_who_already_has_a_membership_cannot_provision_a_second_tenant(): void
    {
        $user = User::factory()->create();
        TenantMembership::factory()->for($user)->create();

        $response = $this->actingAs($user, 'web')->postJson('/api/v1/tenants/provision', $this->validPayload());

        $response->assertStatus(409)->assertJsonPath('error.code', 'TENANT_ALREADY_PROVISIONED');
        $this->assertSame(1, Tenant::query()->count());
    }

    public function test_a_failed_provisioning_attempt_leaves_no_partial_rows(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'web')->postJson('/api/v1/tenants/provision', $this->validPayload([
            'cabinet' => ['name' => ''],
        ]));

        $response->assertStatus(422);
        $this->assertSame(0, Tenant::query()->count());
        $this->assertSame(0, TenantMembership::query()->count());
        $this->assertSame(0, TenantSettings::query()->count());
    }

    public function test_provisioning_rejects_an_unknown_specialty(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'web')->postJson('/api/v1/tenants/provision', $this->validPayload([
            'cabinet' => ['specialty' => 'cardiology'],
        ]));

        $response->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $this->assertArrayHasKey('cabinet.specialty', $response->json('error.details'));
    }

    public function test_provisioning_requires_the_core_cabinet_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'web')->postJson('/api/v1/tenants/provision', []);

        $response->assertStatus(422);
        $details = $response->json('error.details');
        $this->assertArrayHasKey('cabinet.name', $details);
        $this->assertArrayHasKey('cabinet.phone', $details);
        $this->assertArrayHasKey('cabinet.specialty', $details);
        $this->assertArrayHasKey('preferences.defaultSchedulingMode', $details);
    }

    public function test_hours_services_and_team_are_optional(): void
    {
        $user = User::factory()->create();
        $payload = $this->validPayload();
        unset($payload['hours'], $payload['services'], $payload['team']);

        $response = $this->actingAs($user, 'web')->postJson('/api/v1/tenants/provision', $payload);

        $response->assertStatus(201);
        $settings = TenantSettings::query()->sole();
        $this->assertSame([], $settings->onboarding_services);
        $this->assertSame([], $settings->onboarding_team);
    }

    public function test_provisioning_never_creates_a_second_row_of_any_kind_on_conflict(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')->postJson('/api/v1/tenants/provision', $this->validPayload())->assertStatus(201);

        $this->actingAs($user, 'web')->postJson('/api/v1/tenants/provision', $this->validPayload(['cabinet' => ['name' => 'Second Cabinet']]))
            ->assertStatus(409);

        $this->assertSame(1, DB::table('tenants')->count());
        $this->assertSame(1, DB::table('tenant_memberships')->count());
        $this->assertSame(1, DB::table('tenant_settings')->count());
    }
}
