<?php

namespace App\Modules\Identity\Domain\Exceptions;

use RuntimeException;

final class TooManyLoginAttemptsException extends RuntimeException
{
    public function __construct(public readonly int $retryAfterSeconds)
    {
        parent::__construct('Too many login attempts.');
    }
}
