<?php

namespace App\Modules\Identity\Domain\Support;

/**
 * Single normalization rule for authentication email addresses
 * (CLAUDE.md §7 AUTH-001: "must be normalized according to the approved
 * strategy"). Applied identically at every entry point that reads or
 * writes a UserAccount's email (login, forgot-password, reset-password,
 * future registration) so `Ahmed@Example.com` and `ahmed@example.com`
 * always resolve to the same account, backed by the `users.email` unique
 * index (case-sensitive at the database level, so the application must be
 * the single source of normalization).
 */
final class EmailNormalizer
{
    public static function normalize(string $email): string
    {
        return mb_strtolower(trim($email));
    }
}
