<?php

namespace App\Support\Http;

use Illuminate\Http\JsonResponse;

/**
 * The stable `{error: {code, message, details, request_id}}` envelope
 * (CLAUDE.md §54, Spec #5 §11). AUTH-001 implements this only for its own
 * five endpoints' known failure modes — the complete, repository-wide
 * exception-to-error-code mapping (arbitrary future codes, every module)
 * is TASK-011's scope (backend/ARCHITECTURE.md); this class is the shared
 * envelope shape future modules' own error mapping should reuse rather
 * than inventing a second one.
 */
final class ApiErrorResponse
{
    public static function json(string $code, string $message, int $status, array $details = []): JsonResponse
    {
        return response()->json([
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details,
                'request_id' => request()->attributes->get('request_id'),
            ],
        ], $status);
    }
}
