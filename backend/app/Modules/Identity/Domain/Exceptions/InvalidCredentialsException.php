<?php

namespace App\Modules\Identity\Domain\Exceptions;

use RuntimeException;

/**
 * Deliberately the single exception for "email not found", "wrong
 * password" and "account not active" (CLAUDE.md §12/§37: never reveal
 * through a distinguishable message whether the email exists or the
 * password was wrong). Callers must not branch on which underlying reason
 * occurred when producing a user-facing response.
 */
final class InvalidCredentialsException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Invalid credentials.');
    }
}
