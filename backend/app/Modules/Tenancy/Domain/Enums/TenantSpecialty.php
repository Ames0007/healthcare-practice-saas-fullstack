<?php

namespace App\Modules\Tenancy\Domain\Enums;

/**
 * CLAUDE.md's own "Primary initial specialties" list, verbatim — matches
 * the frontend's `CabinetSpecialty` union exactly
 * (`frontend/src/components/domain/settings/types.ts`,
 * `CABINET_SPECIALTY_MAP`). Stored as `tenants.specialty` (plain string
 * column, see that migration's own doc comment) rather than a master-data
 * FK, since no MasterData module exists yet.
 */
enum TenantSpecialty: string
{
    case GeneralMedicine = 'general_medicine';
    case Dentistry = 'dentistry';
    case Physiotherapy = 'physiotherapy';
    case Psychology = 'psychology';
    case Nutrition = 'nutrition';
    case Dermatology = 'dermatology';
    case MultiPractitioner = 'multi_practitioner';
}
