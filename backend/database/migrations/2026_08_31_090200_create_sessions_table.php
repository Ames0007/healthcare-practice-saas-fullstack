<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AUTH-001 session strategy (documented in DECISIONS.md ADR-021):
 * SESSION_DRIVER=database. Column shape follows Laravel's own
 * DatabaseSessionHandler contract exactly (`id`/`payload`/`last_activity`
 * are framework-required column names) — only `user_id` is adapted from the
 * framework's default bigint to `uuid`, matching this project's UUIDv7
 * primary-key convention (backend/database/README.md) for the `users`
 * table it references. `id` stays a framework-generated random session
 * identifier (not one of this project's own UUIDv7 entity ids), so it
 * intentionally does not use HasUuidPrimaryKey/uuid column type.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->uuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
    }
};
