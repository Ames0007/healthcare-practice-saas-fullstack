"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SessionProvider, useSession } from "@/features/auth/session-context";
import { SessionGateLoadingSkeleton, SessionGateUnreachableState } from "./session-gate-fallback";

/**
 * Protects `/app/*` (AUTH-001 §28-29, §32; TENANT-001 §32). This is UX
 * only — the backend independently enforces authentication (and, once a
 * tenant-owned route exists, tenant context) on every API call regardless
 * of what this component renders (CLAUDE.md's own "frontend routing is not
 * security" principle, task's explicit instruction not to claim otherwise).
 *
 * Four non-content states, each distinct: `loading` (skeleton, no flash of
 * the login redirect), `unauthenticated` (redirect to `/auth`, preserving
 * the attempted path as `?from=`), `unreachable` (the backend itself could
 * not be reached — a retry screen, never silently treated as "logged
 * out"), and — new in TENANT-001 — authenticated but with no active
 * `TenantMembership` yet (redirect to `/onboarding`; the mirror image of
 * `OnboardingGuard` redirecting an already-onboarded user back to `/app`).
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthGuardInner>{children}</AuthGuardInner>
    </SessionProvider>
  );
}

function AuthGuardInner({ children }: { children: ReactNode }) {
  const { status, user, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const needsOnboarding = status === "authenticated" && !user?.tenant;

  useEffect(() => {
    if (status === "unauthenticated") {
      const from = pathname ? `?from=${encodeURIComponent(pathname)}` : "";
      router.replace(`/auth${from}`);
      return;
    }

    if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [status, needsOnboarding, pathname, router]);

  if (status === "loading" || status === "unauthenticated" || needsOnboarding) {
    return <SessionGateLoadingSkeleton />;
  }

  if (status === "unreachable") {
    return <SessionGateUnreachableState onRetry={() => void refresh()} />;
  }

  return <>{children}</>;
}
