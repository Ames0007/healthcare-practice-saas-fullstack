import { apiFetch } from "@/lib/api-client";
import type { AuthenticatedUser } from "@/features/auth/api";

/**
 * Cabinet Onboarding provisioning (TENANT-001 Gate 4, RISK-020). Exactly
 * the shape `OnboardingWizard` accumulates — see
 * `features/onboarding/onboarding-state.ts` — sent verbatim as the
 * backend's `ProvisionTenantRequest` expects it
 * (`backend/app/Modules/Tenancy/Presentation/Requests/
 * ProvisionTenantRequest.php`). Returns the same `AuthenticatedUser` shape
 * as `getCurrentUser()`/`login()`, now with a real `tenant`/`membership`,
 * so the caller can update `SessionProvider` state without an extra
 * round trip.
 */
export interface ProvisionTenantCabinetInput {
  name: string;
  specialty: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  preferredLanguage: string;
}

export interface ProvisionTenantPreferencesInput {
  defaultSchedulingMode: string;
  defaultDurationMinutes: number;
}

export interface ProvisionTenantInput {
  cabinet: ProvisionTenantCabinetInput;
  hours: Record<string, { isOpen: boolean; startTime?: string; endTime?: string }>;
  services: Array<{ name: string; durationMinutes: number; price: number; schedulingMode: string; active: boolean }>;
  team: Array<{ firstName: string; lastName: string; professionalTitle: string; role: string; phone: string; email: string }>;
  preferences: ProvisionTenantPreferencesInput;
}

export function provisionTenant(input: ProvisionTenantInput): Promise<AuthenticatedUser> {
  return apiFetch<AuthenticatedUser>("/api/v1/tenants/provision", {
    method: "POST",
    body: input,
  });
}
