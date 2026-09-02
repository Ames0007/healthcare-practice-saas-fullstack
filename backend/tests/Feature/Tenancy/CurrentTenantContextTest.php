<?php

namespace Tests\Feature\Tenancy;

use App\Modules\Identity\Infrastructure\Persistence\User;
use App\Modules\Tenancy\Infrastructure\Persistence\Tenant;
use App\Modules\Tenancy\Infrastructure\Persistence\TenantMembership;
use Illuminate\Support\Facades\Hash;

/**
 * `/auth/me` (and login) now project the authenticated user's current
 * tenant/membership (TENANT-001 §14). Missing/inactive-membership behavior
 * (§15) must resolve to `null`, never an error — an un-onboarded user is
 * an ordinary, expected state (frontend routes them to `/onboarding`).
 */
class CurrentTenantContextTest extends TenancyTestCase
{
    public function test_me_returns_null_tenant_for_a_user_with_no_membership(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.tenant', null)
            ->assertJsonPath('data.membership', null);
    }

    public function test_me_returns_the_active_tenant_and_membership(): void
    {
        $user = User::factory()->create();
        $tenant = Tenant::factory()->create(['name' => 'Cabinet Atlas']);
        $membership = TenantMembership::factory()->for($user)->for($tenant)->owner()->create();

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.tenant.id', $tenant->id)
            ->assertJsonPath('data.tenant.name', 'Cabinet Atlas')
            ->assertJsonPath('data.tenant.slug', $tenant->slug)
            ->assertJsonPath('data.membership.id', $membership->id)
            ->assertJsonPath('data.membership.profileType', 'owner_admin')
            ->assertJsonPath('data.membership.isOwner', true);
    }

    public function test_me_treats_a_disabled_membership_as_no_current_tenant(): void
    {
        $user = User::factory()->create();
        TenantMembership::factory()->for($user)->disabled()->create();

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)->assertJsonPath('data.tenant', null);
    }

    public function test_me_treats_an_invited_only_membership_as_no_current_tenant(): void
    {
        $user = User::factory()->create();
        TenantMembership::factory()->for($user)->invited()->create();

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)->assertJsonPath('data.tenant', null);
    }

    public function test_login_response_already_reflects_the_current_tenant(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-horse-battery')]);
        $tenant = Tenant::factory()->create();
        TenantMembership::factory()->for($user)->for($tenant)->create();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.tenant.id', $tenant->id);
    }

    public function test_two_users_each_with_their_own_tenant_never_see_each_others(): void
    {
        $userA = User::factory()->create();
        $tenantA = Tenant::factory()->create(['name' => 'Cabinet A']);
        TenantMembership::factory()->for($userA)->for($tenantA)->create();

        $userB = User::factory()->create();
        $tenantB = Tenant::factory()->create(['name' => 'Cabinet B']);
        TenantMembership::factory()->for($userB)->for($tenantB)->create();

        $this->actingAs($userA, 'web')->getJson('/api/v1/auth/me')
            ->assertJsonPath('data.tenant.id', $tenantA->id);

        $this->actingAs($userB, 'web')->getJson('/api/v1/auth/me')
            ->assertJsonPath('data.tenant.id', $tenantB->id);
    }
}
