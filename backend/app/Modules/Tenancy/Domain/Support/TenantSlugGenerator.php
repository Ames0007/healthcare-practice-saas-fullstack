<?php

namespace App\Modules\Tenancy\Domain\Support;

use Illuminate\Support\Str;

/**
 * Public tenant identifier used by `/book/{slug}` (Spec #4 §5.1, §66) —
 * never a raw UUID publicly, and never sequential/guessable. Pure domain
 * logic: the caller supplies the uniqueness check so this stays
 * framework/persistence-independent (no direct DB query here).
 */
final class TenantSlugGenerator
{
    private const FALLBACK_BASE = 'cabinet';

    private const MAX_SEQUENTIAL_ATTEMPTS = 20;

    /**
     * @param  callable(string): bool  $isTaken
     */
    public static function fromName(string $name, callable $isTaken): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = self::FALLBACK_BASE;
        }

        if (! $isTaken($base)) {
            return $base;
        }

        for ($attempt = 2; $attempt <= self::MAX_SEQUENTIAL_ATTEMPTS; $attempt++) {
            $candidate = "{$base}-{$attempt}";
            if (! $isTaken($candidate)) {
                return $candidate;
            }
        }

        // Practically unreachable (20 sequential collisions on the same
        // base name) — a random suffix guarantees termination rather than
        // failing provisioning outright.
        return $base.'-'.Str::lower(Str::random(6));
    }
}
