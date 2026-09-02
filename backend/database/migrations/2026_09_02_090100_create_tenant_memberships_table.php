<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * TENANT-001 / Tenancy module: connects a User (authentication identity) to
 * a Tenant (Spec #4 §4.2 `tenant_memberships`). `profile_type`/`is_owner`
 * are the smallest future-compatible representation of "who this person is
 * to the cabinet" — fine-grained permission grants belong to a future
 * `membership_permissions` table (AUTHZ-001's scope, not created here).
 *
 * Delete behavior is deliberately `restrict`, never `cascade`
 * (CLAUDE.md §10 / backend/database/README.md "do not casually
 * cascade-delete healthcare tenant relationships"): a tenant or user with
 * live memberships cannot be hard-deleted by a stray FK cascade — deletion
 * is not a real operation in this domain anyway (deactivate, not delete).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_memberships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id');
            $table->string('profile_type');
            $table->string('status')->default('active');
            $table->boolean('is_owner')->default(false);
            $table->timestampTz('joined_at')->nullable();
            $table->timestampsTz();

            $table->unique(['tenant_id', 'user_id']);
            $table->index('user_id');

            $table->foreign('tenant_id')->references('id')->on('tenants')->restrictOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_memberships');
    }
};
