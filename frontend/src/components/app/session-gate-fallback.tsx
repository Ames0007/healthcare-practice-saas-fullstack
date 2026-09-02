"use client";

import { useLocale } from "@/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shared "still deciding where to route you" skeleton (TENANT-001 §32) —
 * `AuthGuard` (`/app`) and `OnboardingGuard` (`/onboarding`) both show this
 * while `status` is `loading`/`unauthenticated`, and while a post-
 * authentication redirect (tenant present vs. absent) is about to fire —
 * neither guard flashes its real content before the redirect lands.
 * Extracted from AUTH-001's original inline `AuthGuard` markup once a
 * second guard needed the identical fallback.
 */
export function SessionGateLoadingSkeleton() {
  return (
    <div className="flex h-dvh flex-col gap-4 p-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

/**
 * Shared "backend unreachable" retry state — both guards show this for
 * `status === "unreachable"`, never silently treating a network failure as
 * "logged out" (AUTH-001 §33).
 */
export function SessionGateUnreachableState({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();

  return (
    <div className="flex h-dvh items-center justify-center p-6">
      <EmptyState
        title={t("auth.session.unreachableTitle")}
        description={t("auth.session.unreachableDescription")}
        primaryAction={<Button onClick={onRetry}>{t("auth.session.retryAction")}</Button>}
      />
    </div>
  );
}
