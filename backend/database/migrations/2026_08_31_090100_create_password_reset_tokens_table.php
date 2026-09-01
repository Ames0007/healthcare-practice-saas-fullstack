<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Laravel's standard password-broker table (`config/auth.php`
 * passwords.users.table) — email keyed (not a foreign key: a request may
 * arrive for an email with no matching user, and the broker must not leak
 * that distinction — CLAUDE.md §19/AUTH-001 §17). Token is stored hashed by
 * the framework's own `PasswordBroker`, expiry/throttle are enforced from
 * `config/auth.php` (60 min expiry, 60s throttle) — no bespoke token logic
 * needed (AUTH-001 §19).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestampTz('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};
