<?php

namespace Tests\Feature\Tenancy;

use App\Modules\Tenancy\Application\Context\CurrentTenantContextHolder;
use App\Modules\Tenancy\Domain\Enums\MembershipProfileType;
use App\Modules\Tenancy\Domain\Enums\TenantStatus;
use App\Modules\Tenancy\Domain\ValueObjects\TenantContext;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\Support\Models\TenantScopedFixtureRecord;
use Tests\TestCase;

/**
 * Proves the reusable tenant-scoping mechanism
 * (`Tenancy\Infrastructure\Persistence\Concerns\BelongsToTenant`) against a
 * real, disposable table — the adversarial cross-tenant isolation test this
 * task's checklist Gate 3 §17-21 asks for, generalized ahead of the first
 * real tenant-owned business table (Patients, ...). See that trait's own
 * doc comment for why no production model uses it yet.
 */
class TenantIsolationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('tenant_scoped_fixture_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('label');
            $table->timestampsTz();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('tenant_scoped_fixture_records');

        parent::tearDown();
    }

    private function setCurrentTenant(string $tenantId): void
    {
        app(CurrentTenantContextHolder::class)->set(new TenantContext(
            tenantId: $tenantId,
            tenantName: 'Fixture Tenant',
            tenantSlug: 'fixture-tenant',
            tenantStatus: TenantStatus::Active,
            membershipId: (string) Str::uuid7(),
            profileType: MembershipProfileType::OwnerAdmin,
            isOwner: true,
        ));
    }

    public function test_querying_without_a_resolved_tenant_context_fails_closed(): void
    {
        $this->expectException(RuntimeException::class);

        TenantScopedFixtureRecord::query()->get();
    }

    public function test_creating_without_a_resolved_tenant_context_fails_closed(): void
    {
        $this->expectException(RuntimeException::class);

        TenantScopedFixtureRecord::create(['label' => 'orphan']);
    }

    public function test_a_new_row_is_automatically_stamped_with_the_current_tenant(): void
    {
        $tenantId = (string) Str::uuid7();
        $this->setCurrentTenant($tenantId);

        $record = TenantScopedFixtureRecord::create(['label' => 'consultation']);

        $this->assertSame($tenantId, $record->tenant_id);
    }

    public function test_tenant_a_cannot_see_tenant_bs_rows(): void
    {
        $tenantA = (string) Str::uuid7();
        $tenantB = (string) Str::uuid7();

        $this->setCurrentTenant($tenantA);
        TenantScopedFixtureRecord::create(['label' => 'tenant-a-record']);

        $this->setCurrentTenant($tenantB);
        TenantScopedFixtureRecord::create(['label' => 'tenant-b-record']);

        $this->assertSame(1, TenantScopedFixtureRecord::query()->count());
        $this->assertSame('tenant-b-record', TenantScopedFixtureRecord::query()->sole()->label);

        $this->setCurrentTenant($tenantA);
        $this->assertSame(1, TenantScopedFixtureRecord::query()->count());
        $this->assertSame('tenant-a-record', TenantScopedFixtureRecord::query()->sole()->label);
    }

    public function test_tenant_a_cannot_load_tenant_bs_row_by_id(): void
    {
        $tenantA = (string) Str::uuid7();
        $tenantB = (string) Str::uuid7();

        $this->setCurrentTenant($tenantB);
        $tenantBRecord = TenantScopedFixtureRecord::create(['label' => 'tenant-b-record']);

        $this->setCurrentTenant($tenantA);

        // The IDOR-shaped attack: Tenant A guesses/observes Tenant B's real
        // UUID and asks for it directly by id — the global scope must deny
        // it exactly like an unknown id, never partially leak the row.
        $this->assertNull(TenantScopedFixtureRecord::query()->find($tenantBRecord->id));
    }

    public function test_tenant_a_cannot_update_tenant_bs_row(): void
    {
        $tenantA = (string) Str::uuid7();
        $tenantB = (string) Str::uuid7();

        $this->setCurrentTenant($tenantB);
        $tenantBRecord = TenantScopedFixtureRecord::create(['label' => 'original']);

        $this->setCurrentTenant($tenantA);
        $affected = TenantScopedFixtureRecord::query()->where('id', $tenantBRecord->id)->update(['label' => 'tampered']);

        $this->assertSame(0, $affected);
        $this->assertSame('original', $tenantBRecord->fresh()->label);
    }
}
