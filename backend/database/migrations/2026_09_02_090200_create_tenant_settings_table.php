<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * TENANT-001 / Tenancy module (Spec #4 §5.2 `tenant_settings`). Typed
 * columns for the one real cross-module business rule onboarding actually
 * configures today (appointment scheduling defaults) — per spec 5.2
 * "prefer typed columns... rather than putting everything in JSON".
 *
 * `onboarding_*` are deliberately raw JSONB snapshots of onboarding input
 * that belongs to modules not yet built (Scheduling/Availability owns real
 * working hours, Billing owns real `tenant_services`, Team owns real staff
 * records — CLAUDE.md §4/§29-30; this task's own explicit "DO NOT implement
 * Agenda/Finance/HR persistence"). They exist only so a user's onboarding
 * input is not silently discarded (task §27) — a future Scheduling/Billing/
 * Team task migrates this JSON into its own real tables (see
 * RISKS_AND_BLOCKERS.md) and these columns can then be dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->string('appointment_default_scheduling_mode')->default('exact');
            $table->unsignedSmallInteger('appointment_default_duration_minutes')->default(30);
            $table->jsonb('onboarding_working_hours')->nullable();
            $table->jsonb('onboarding_services')->nullable();
            $table->jsonb('onboarding_team')->nullable();
            $table->timestampsTz();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_settings');
    }
};
