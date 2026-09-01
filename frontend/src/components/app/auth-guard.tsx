"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "@/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionProvider, useSession } from "@/features/auth/session-context";

/**
 * Protects `/app/*` (AUTH-001 §28-29, §32). This is UX only — the backend
 * independently enforces authentication on every API call regardless of
 * what this component renders (CLAUDE.md's own "frontend routing is not
 * security" principle, task's explicit instruction not to claim otherwise).
 *
 * Three non-authenticated states, each distinct (task §33: differentiate
 * validation/invalid-credentials/rate-limited/server-unavailable — applied
 * here to session bootstrap): `loading` (skeleton, no flash of the login
 * redirect), `unauthenticated` (redirect to `/auth`, preserving the
 * attempted path as `?from=` so a future task can return the user to where
 * they were headed), `unreachable` (the backend itself could not be
 * reached — shown as a retry screen, never silently treated as "logged
 * out", which would misrepresent a network problem as an auth failure).
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthGuardInner>{children}</AuthGuardInner>
    </SessionProvider>
  );
}

function AuthGuardInner({ children }: { children: ReactNode }) {
  const { status, refresh } = useSession();
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "unauthenticated") return;

    const from = pathname ? `?from=${encodeURIComponent(pathname)}` : "";
    router.replace(`/auth${from}`);
  }, [status, pathname, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex h-dvh flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (status === "unreachable") {
    return (
      <div className="flex h-dvh items-center justify-center p-6">
        <EmptyState
          title={t("auth.session.unreachableTitle")}
          description={t("auth.session.unreachableDescription")}
          primaryAction={<Button onClick={() => void refresh()}>{t("auth.session.retryAction")}</Button>}
        />
      </div>
    );
  }

  return <>{children}</>;
}
