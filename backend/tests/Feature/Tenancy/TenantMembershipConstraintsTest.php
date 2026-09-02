<?php

namespace Tests\Feature\Tenancy;

use App\Modules\Identity\Infrastructure\Persistence\User;
use App\Modules\Tenancy\Infrastructure\Persistence\Tenant;
use App\Modules\Tenancy\Infrastructure\Persistence\TenantMembership;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Database-level integrity for `tenant_memberships` (checklist Gate 1
 * §9-10) — proves the constraints hold even if application-layer
 * validation were ever bypassed, not merely that the happy path works.
 */
class TenantMembershipConstraintsTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_same_user_cannot_have_two_membership_rows_in_the_same_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        TenantMembership::factory()->for($tenant)->for($user)->create();

        $this->expectException(QueryException::class);

        TenantMembership::factory()->for($tenant)->for($user)->create();
    }

    public function test_a_tenant_with_a_membership_cannot_be_hard_deleted(): void
    {
        $tenant = Tenant::factory()->create();
        TenantMembership::factory()->for($tenant)->create();

        $this->expectException(QueryException::class);

        $tenant->delete();
    }

    public function test_a_user_with_a_membership_cannot_be_hard_deleted(): void
    {
        $user = User::factory()->create();
        TenantMembership::factory()->for($user)->create();

        $this->expectException(QueryException::class);

        $user->delete();
    }

    public function test_the_same_user_can_belong_to_two_different_tenants(): void
    {
        $user = User::factory()->create();
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        TenantMembership::factory()->for($user)->for($tenantA)->create();
        TenantMembership::factory()->for($user)->for($tenantB)->create();

        $this->assertSame(2, TenantMembership::query()->where('user_id', $user->id)->count());
    }
}
