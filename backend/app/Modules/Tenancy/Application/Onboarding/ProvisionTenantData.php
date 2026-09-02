<?php

namespace App\Modules\Tenancy\Application\Onboarding;

use App\Modules\Tenancy\Domain\Enums\TenantSpecialty;

/**
 * Validated onboarding-provisioning input (see
 * `Presentation\Requests\ProvisionTenantRequest` for the exact validation
 * rules this assumes has already run).
 */
final readonly class ProvisionTenantData
{
    public function __construct(
        public string $name,
        public TenantSpecialty $specialty,
        public string $phone,
        public ?string $email,
        public ?string $address,
        public ?string $city,
        public string $preferredLanguage,
        public string $defaultSchedulingMode,
        public int $defaultDurationMinutes,
        public array $workingHours,
        public array $services,
        public array $team,
    ) {}

    public static function fromValidated(array $validated): self
    {
        return new self(
            name: $validated['cabinet']['name'],
            specialty: TenantSpecialty::from($validated['cabinet']['specialty']),
            phone: $validated['cabinet']['phone'],
            email: $validated['cabinet']['email'] ?? null,
            address: $validated['cabinet']['address'] ?? null,
            city: $validated['cabinet']['city'] ?? null,
            preferredLanguage: $validated['cabinet']['preferredLanguage'],
            defaultSchedulingMode: $validated['preferences']['defaultSchedulingMode'],
            defaultDurationMinutes: (int) $validated['preferences']['defaultDurationMinutes'],
            workingHours: $validated['hours'] ?? [],
            services: $validated['services'] ?? [],
            team: $validated['team'] ?? [],
        );
    }
}
