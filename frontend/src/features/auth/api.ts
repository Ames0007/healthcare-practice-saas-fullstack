import { apiFetch } from "@/lib/api-client";

/**
 * Typed boundary to the Identity module's five endpoints (AUTH-001 §12-21).
 * Built on the shared `apiFetch` (`@/lib/api-client`) — no `fetch(...)` call
 * anywhere else in `features/auth`.
 */
export interface CurrentTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface CurrentMembership {
  id: string;
  profileType: string;
  isOwner: boolean;
}

/**
 * `tenant`/`membership` (TENANT-001 §14) are both `null` for an
 * authenticated user with no active `TenantMembership` yet — an ordinary,
 * expected state (a just-registered owner who hasn't finished onboarding),
 * never an error. `AuthGuard`/`OnboardingGuard`
 * (`components/app/auth-guard.tsx`/`onboarding-guard.tsx`) branch on this.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  tenant: CurrentTenant | null;
  membership: CurrentMembership | null;
}

export function login(email: string, password: string, rememberMe: boolean): Promise<AuthenticatedUser> {
  return apiFetch<AuthenticatedUser>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password, remember_me: rememberMe },
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>("/api/v1/auth/logout", { method: "POST" });
}

export function getCurrentUser(): Promise<AuthenticatedUser> {
  return apiFetch<AuthenticatedUser>("/api/v1/auth/me");
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPassword(
  token: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: { token, email, password, password_confirmation: passwordConfirmation },
  });
}
