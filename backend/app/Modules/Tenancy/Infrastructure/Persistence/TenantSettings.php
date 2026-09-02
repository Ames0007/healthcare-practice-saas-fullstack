<?php

namespace App\Modules\Tenancy\Infrastructure\Persistence;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tenant-level configuration (Spec #4 §5.2). `appointment_default_*` are
 * the one typed, currently-real setting (spec 5.2 "prefer typed columns...
 * for critical business rules"); `onboarding_*` are raw provisional JSON
 * snapshots — see this table's migration for why they are JSON rather than
 * real Scheduling/Billing/Team records.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $appointment_default_scheduling_mode
 * @property int $appointment_default_duration_minutes
 * @property array|null $onboarding_working_hours
 * @property array|null $onboarding_services
 * @property array|null $onboarding_team
 */
class TenantSettings extends Model
{
    use HasUuidPrimaryKey;

    protected $table = 'tenant_settings';

    protected $fillable = [
        'tenant_id',
        'appointment_default_scheduling_mode',
        'appointment_default_duration_minutes',
        'onboarding_working_hours',
        'onboarding_services',
        'onboarding_team',
    ];

    protected function casts(): array
    {
        return [
            'appointment_default_duration_minutes' => 'integer',
            'onboarding_working_hours' => 'array',
            'onboarding_services' => 'array',
            'onboarding_team' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
