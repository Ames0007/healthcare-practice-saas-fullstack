<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * TENANT-001 / Tenancy module: the healthcare cabinet/organization boundary
 * (Spec #4 §5.1 `tenants`, CLAUDE.md §6). `specialty` is a closed string set
 * matching CLAUDE.md's own "Primary initial specialties" list and the
 * frontend's `CabinetSpecialty` union (`Tenancy\Domain\Enums\TenantSpecialty`)
 * — not a `specialty_id` FK to a `specialties` master-data table, since
 * MasterData (`global_master_items`) does not exist yet (TASK-039-041); a
 * later task can migrate this column to a real FK via expand/migrate/contract
 * (see DECISIONS.md ADR-022). `logo_file_id` is deliberately omitted — no
 * object storage exists yet, mirroring the frontend's own `CabinetProfile`
 * doc comment (`components/domain/settings/types.ts`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('specialty');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('preferred_language', 2)->default('fr');
            $table->char('currency_code', 3)->default('MAD');
            $table->string('timezone')->default('Africa/Casablanca');
            $table->string('status')->default('active');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
