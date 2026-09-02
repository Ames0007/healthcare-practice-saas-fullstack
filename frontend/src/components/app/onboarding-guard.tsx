"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SessionProvider, useSession } from "@/features/auth/session-context";
import { SessionGateLoadingSkeleton, SessionGateUnreachableState } from "./session-gate-fallback";

/**
 * Protects `/onboarding` (TENANT-001 Gate 5 §32). Requires authentication
 * exactly like `AuthGuard` (`/app`'s own guard) — onboarding provisions a
 * tenant FOR the authenticated caller (`ProvisionTenant`, backend
 * §24-28), so an anonymous visitor is redirected to `/auth` first, same
 * `?from=` preservation. The one difference from `AuthGuard`: a user who
 * ALREADY has an active tenant is redirected to `/app` instead of being
 * allowed to re-enter the wizard — this task has no "provision a second
 * cabinet" flow (checklist §8, no tenant switching). `ProvisionTenant`'s
 * own `TENANT_ALREADY_PROVISIONED` guard is the real security boundary;
 * this redirect is UX only, same "frontend routing is not security"
 * principle as `AuthGuard`.
 */
export function OnboardingGuard({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <OnboardingGuardInner>{children}</OnboardingGuardInner>
    </SessionProvider>
  );
}

function OnboardingGuardInner({ children }: { children: ReactNode }) {
  const { status, user, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const alreadyOnboarded = status === "authenticated" && !!user?.tenant;

  useEffect(() => {
    if (status === "unauthenticated") {
      const from = pathname ? `?from=${encodeURIComponent(pathname)}` : "";
      router.replace(`/auth${from}`);
      return;
    }

    if (alreadyOnboarded) {
      router.replace("/app");
    }
  }, [status, alreadyOnboarded, pathname, router]);

  if (status === "loading" || status === "unauthenticated" || alreadyOnboarded) {
    return <SessionGateLoadingSkeleton />;
  }

  if (status === "unreachable") {
    return <SessionGateUnreachableState onRetry={() => void refresh()} />;
  }

  return <>{children}</>;
}
