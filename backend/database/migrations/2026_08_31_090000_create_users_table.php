<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AUTH-001 / Identity module: the authentication identity (`UserAccount` in
 * CLAUDE.md §5 terms), deliberately distinct from a future TeamMember
 * (employee) or TenantMembership (tenant relationship) — see
 * backend/ARCHITECTURE.md and CLAUDE.md §5. Only the fields needed for
 * authentication itself exist here; no role, no tenant_id, no employment
 * field (CLAUDE.md §6's own explicit list of what NOT to store on the
 * authentication identity).
 *
 * `email` is globally unique (not tenant-scoped) per backend/database/README
 * "platform-global where the entity is global (`users.email`, ...)" —
 * consistent with `UserAccount` being a platform-level identity that may
 * later hold memberships in multiple tenants.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('status')->default('active');
            $table->timestampTz('email_verified_at')->nullable();
            $table->timestampTz('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
