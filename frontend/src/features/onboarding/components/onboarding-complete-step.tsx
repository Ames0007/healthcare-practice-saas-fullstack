"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";
import { Card } from "@/components/ui/card";
import { buttonClassNames } from "@/components/ui/button";

/**
 * Completion (task §26, Spec #9 Screen 07). This screen is only ever
 * reached after `OnboardingWizard`'s `handleFinish` has already succeeded
 * (TENANT-001) — the tenant and owner `TenantMembership` are real,
 * committed rows by the time this renders, not a preview. The one action
 * link navigates to `/app`, where `AuthGuard` discovers the new
 * tenant/membership via a fresh `/me` call (see `OnboardingWizard`'s own
 * doc comment for why that refresh happens there, not here).
 */
export function OnboardingCompleteStep() {
  const { t } = useLocale();

  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold text-text">{t("onboarding.complete.heading")}</h1>
      <p className="text-sm text-text-secondary">{t("onboarding.complete.description")}</p>
      <Link href="/app" className={buttonClassNames("primary", "md")}>
        {t("onboarding.complete.exploreAction")}
      </Link>
    </Card>
  );
}
