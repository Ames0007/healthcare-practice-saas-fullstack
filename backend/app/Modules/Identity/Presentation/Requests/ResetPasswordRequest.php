<?php

namespace App\Modules\Identity\Presentation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            // AUTH-001 §22 password policy: reasonable modern baseline
            // (minimum length only) rather than invented complexity rules
            // (CLAUDE.md §51 "do not invent requirements") — no approved
            // spec/wireframe defines a stricter policy (grep-confirmed).
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
        ];
    }
}
