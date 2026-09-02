<?php

namespace Tests\Support\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Modules\Tenancy\Infrastructure\Persistence\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

/**
 * Test-only model proving `BelongsToTenant` against a real table
 * (TENANT-001 checklist Gate 3 §17/§21) — see
 * `Tests\Feature\Tenancy\TenantIsolationTest`. Table created/dropped by the
 * test itself, never a production migration — mirrors
 * `Tests\Support\Models\UuidFoundationFixture`'s own established pattern.
 */
class TenantScopedFixtureRecord extends Model
{
    use BelongsToTenant;
    use HasUuidPrimaryKey;

    protected $table = 'tenant_scoped_fixture_records';

    protected $guarded = [];
}
