<?php

namespace App\Modules\Tenancy\Presentation\Requests;

use App\Modules\Tenancy\Domain\Enums\TenantSpecialty;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates the Cabinet Onboarding wizard's accumulated draft (Gate 4
 * §23-27) exactly as `OnboardingWizard` sends it — see
 * `frontend/src/features/onboarding/onboarding-state.ts` and
 * `components/domain/settings/types.ts` for the exact shapes this mirrors.
 * `hours`/`services`/`team` are validated only loosely (array/basic item
 * shape, bounded size) — they are stored as provisional JSON, not real
 * business records this task owns (see `tenant_settings` migration's own
 * doc comment).
 */
class ProvisionTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cabinet.name' => ['required', 'string', 'max:255'],
            'cabinet.specialty' => [
                'required',
                'string',
                Rule::in(array_map(fn (TenantSpecialty $specialty) => $specialty->value, TenantSpecialty::cases())),
            ],
            'cabinet.address' => ['nullable', 'string', 'max:500'],
            'cabinet.city' => ['nullable', 'string', 'max:120'],
            'cabinet.phone' => ['required', 'string', 'max:30'],
            'cabinet.email' => ['nullable', 'email', 'max:255'],
            'cabinet.preferredLanguage' => ['required', Rule::in(['fr', 'ar'])],

            'preferences.defaultSchedulingMode' => ['required', Rule::in(['exact', 'window'])],
            'preferences.defaultDurationMinutes' => ['required', 'integer', 'min:5', 'max:480'],

            'hours' => ['nullable', 'array', 'max:14'],

            'services' => ['nullable', 'array', 'max:100'],
            'services.*.name' => ['required_with:services', 'string', 'max:255'],
            'services.*.durationMinutes' => ['nullable', 'integer', 'min:0', 'max:1440'],
            'services.*.price' => ['nullable', 'numeric', 'min:0'],
            'services.*.schedulingMode' => ['nullable', 'string', 'max:20'],
            'services.*.active' => ['nullable', 'boolean'],

            'team' => ['nullable', 'array', 'max:50'],
            'team.*.firstName' => ['required_with:team', 'string', 'max:255'],
            'team.*.lastName' => ['required_with:team', 'string', 'max:255'],
            'team.*.professionalTitle' => ['nullable', 'string', 'max:255'],
            'team.*.role' => ['nullable', 'string', 'max:50'],
            'team.*.phone' => ['nullable', 'string', 'max:30'],
            'team.*.email' => ['nullable', 'email', 'max:255'],
        ];
    }
}
