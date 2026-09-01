<?php

namespace App\Modules\Identity\Presentation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // No password-policy rule here deliberately (AUTH-001 §7/§22):
            // an existing account's password must keep working even if a
            // future policy tightens minimum length — only reset/registration
            // enforce the policy going forward.
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember_me' => ['sometimes', 'boolean'],
        ];
    }
}
