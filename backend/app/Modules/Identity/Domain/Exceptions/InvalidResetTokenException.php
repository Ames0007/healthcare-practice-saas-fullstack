<?php

namespace App\Modules\Identity\Domain\Exceptions;

use RuntimeException;

/**
 * Covers every reason a password reset can fail (unknown email, wrong
 * token, expired token, already-used token) behind one message — the
 * same enumeration-protection reasoning as InvalidCredentialsException
 * (AUTH-001 §21/§40).
 */
final class InvalidResetTokenException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('This password reset link is invalid or has expired.');
    }
}
