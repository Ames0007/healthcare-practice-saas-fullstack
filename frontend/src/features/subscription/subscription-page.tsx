"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { useSession } from "@/features/auth/session-context";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import type { Subscription, SubscriptionHistoryEvent } from "@/components/domain/subscription/types";
import type { PlanEntitlement, SubscriptionPlan } from "@/components/domain/subscription/types";
import type { TeamMember } from "@/components/domain/team/types";
import { SUBSCRIPTION_STATUS_MAP } from "@/components/domain/subscription/subscription-status";
import { formatDayMonthYear } from "@/features/patients/format";
import { getTeamMembersMockData } from "@/features/team/mock-data";
import { getSubscriptionMockData } from "./mock-subscription-data";
import { getSubscriptionHistoryMockData } from "./mock-subscription-history-data";
import { getSubscriptionPlansMockData, getPlanEntitlementsMockData } from "./mock-plans-data";
import { computeDaysRemaining, isExpiringSoon } from "./subscription-lifecycle";
import { getEntitlementLimit, getUsageState } from "./entitlements";
import { countActivePractitioners, countActiveStaff } from "./usage";
import { MOCK_BUSINESS_DATE } from "@/features/today/mock-data";
import { SubscriptionNav } from "./components/subscription-nav";
import { SubscriptionSkeleton } from "./components/subscription-skeleton";
import { UsageRow } from "./components/usage-row";

export type SubscriptionPageState = "loading" | "loaded" | "error";

export interface SubscriptionPageProps {
  subscription?: Subscription;
  history?: SubscriptionHistoryEvent[];
  plans?: SubscriptionPlan[];
  entitlements?: PlanEntitlement[];
  teamMembers?: TeamMember[];
  businessDate?: string;
  state?: SubscriptionPageState;
  onRetry?: () => void;
}

/**
 * Mon abonnement (UI-011ABC Gate 1), `/app/abonnement` — replaces the
 * generic catch-all placeholder. Reproduces Spec #9 Screen 47's own
 * layout (plan/status/period/renewal + Utilisation) with status-
 * conditional messaging for the other 5 lifecycle states (trialing/
 * expired/grace/cancelled inline; blackout is a full takeover, Screen 49
 * — no `PageHeader`/`SubscriptionNav`, since Screen 49's own wireframe
 * explicitly shows "No operational sidebar." This page cannot suppress
 * the *global* app-shell sidebar (out of this task's bounded scope, see
 * `docs/implementation/DECISIONS.md` ADR-010) — it demonstrates the
 * restricted-state presentation within its own content area only.
 *
 * "Renouveler" never simulates a payment (task's hard constraint) — it
 * opens an informational dialog and closes; no field on `Subscription`
 * is ever mutated by this page.
 */
export function SubscriptionPage({
  subscription: providedSubscription,
  history: providedHistory,
  plans: providedPlans,
  entitlements: providedEntitlements,
  teamMembers: providedTeamMembers,
  businessDate = MOCK_BUSINESS_DATE,
  state = "loaded",
  onRetry,
}: SubscriptionPageProps) {
  const { t, locale } = useLocale();
  const { logout } = useSession();
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (state === "loading") {
    return <SubscriptionSkeleton />;
  }

  if (state === "error") {
    return (
      <EmptyState
        title={t("abonnement.error.title")}
        primaryAction={
          onRetry ? (
            <Button size="sm" onClick={onRetry}>
              {t("abonnement.error.retry")}
            </Button>
          ) : undefined
        }
      />
    );
  }

  const subscription = providedSubscription ?? getSubscriptionMockData();
  const history = providedHistory ?? getSubscriptionHistoryMockData();
  const plans = providedPlans ?? getSubscriptionPlansMockData();
  const entitlements = providedEntitlements ?? getPlanEntitlementsMockData();
  const members = providedTeamMembers ?? getTeamMembersMockData();

  const plan = plans.find((candidate) => candidate.id === subscription.planId);
  const statusMeta = SUBSCRIPTION_STATUS_MAP[subscription.status];

  function handleAcknowledgeRenew() {
    setRenewDialogOpen(false);
    setToastMessage(t("abonnement.toast.acknowledged"));
  }

  if (subscription.status === "blackout") {
    // "Contacter le support"/"Se déconnecter" are real, active controls
    // (CLAUDE.md §11: "only controlled subscription/support/logout
    // functionality remains accessible" during blackout). AUTH-001 wires
    // "Se déconnecter" to the real session logout (no support channel
    // exists yet, so that one still surfaces the established
    // future-feature Toast, UI-FIX).
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-2xl font-semibold text-text">{t("abonnement.blackout.title")}</h1>
        <p className="max-w-md text-sm text-text-secondary">{t("abonnement.blackout.description")}</p>
        <p className="max-w-md text-xs text-text-muted">{t("abonnement.blackout.dataPreserved")}</p>

        <div className="flex flex-col items-center gap-3">
          <Button onClick={() => setRenewDialogOpen(true)}>{t("abonnement.blackout.renewAction")}</Button>
          <div className="flex gap-4 text-sm">
            <Button variant="outline" size="sm" onClick={() => setToastMessage(t("abonnement.blackout.supportNotice"))}>
              {t("abonnement.blackout.supportAction")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              {t("abonnement.blackout.logoutAction")}
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={renewDialogOpen}
          onClose={() => setRenewDialogOpen(false)}
          onConfirm={handleAcknowledgeRenew}
          title={t("abonnement.renewDialog.title")}
          description={t("abonnement.renewDialog.description")}
          cancelLabel={t("abonnement.renewDialog.cancel")}
          confirmLabel={t("abonnement.renewDialog.confirm")}
        />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </div>
    );
  }

  const practitionersUsage = getUsageState(
    getEntitlementLimit(entitlements, subscription.planId, "max_practitioners"),
    countActivePractitioners(members),
  );
  const staffUsage = getUsageState(
    getEntitlementLimit(entitlements, subscription.planId, "max_staff"),
    countActiveStaff(members),
  );
  const storageUsage = getUsageState(getEntitlementLimit(entitlements, subscription.planId, "storage_bytes"), 0);

  const daysUntilRenewal =
    subscription.status === "active" && subscription.currentPeriodEnd
      ? computeDaysRemaining(subscription.currentPeriodEnd, businessDate)
      : undefined;
  const showExpiringSoonBanner =
    subscription.status === "active" &&
    subscription.currentPeriodEnd !== undefined &&
    isExpiringSoon(subscription.currentPeriodEnd, businessDate);
  const daysUntilTrialEnd =
    subscription.status === "trialing" && subscription.trialEndsAt
      ? computeDaysRemaining(subscription.trialEndsAt, businessDate)
      : undefined;
  const daysUntilGraceEnd =
    subscription.status === "grace" && subscription.graceEndsAt
      ? computeDaysRemaining(subscription.graceEndsAt, businessDate)
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("abonnement.pageTitle")}
        description={t("abonnement.pageDescription")}
        primaryAction={
          <Button size="sm" onClick={() => setRenewDialogOpen(true)}>
            {t("abonnement.actions.renew")}
          </Button>
        }
      />

      <SubscriptionNav />

      {showExpiringSoonBanner && daysUntilRenewal !== undefined && (
        <Card variant="alert">
          <p className="text-sm font-medium text-warning">
            {t("abonnement.banner.expiringSoon", { count: daysUntilRenewal })}
          </p>
        </Card>
      )}

      {subscription.status === "grace" && daysUntilGraceEnd !== undefined && (
        <Card variant="alert">
          <p className="text-sm font-medium text-warning">{t("abonnement.banner.grace", { count: daysUntilGraceEnd })}</p>
        </Card>
      )}

      <Card>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("abonnement.plan.planLabel")}</dt>
            <dd className="mt-1 text-sm text-text">{plan?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("abonnement.plan.statusLabel")}</dt>
            <dd className="mt-1">
              <StatusBadge tone={statusMeta.tone}>{t(statusMeta.translationKey)}</StatusBadge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("abonnement.plan.periodLabel")}</dt>
            <dd className="mt-1 text-sm text-text">{t(`abonnement.billingPeriod.${subscription.billingPeriod}`)}</dd>
          </div>

          {subscription.status === "active" && subscription.currentPeriodEnd && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("abonnement.plan.renewalLabel")}</dt>
              <dd className="mt-1 text-sm text-text">{formatDayMonthYear(subscription.currentPeriodEnd, locale)}</dd>
            </div>
          )}

          {subscription.status === "trialing" && subscription.trialEndsAt && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("abonnement.plan.trialEndLabel")}</dt>
              <dd className="mt-1 text-sm text-text">
                {formatDayMonthYear(subscription.trialEndsAt, locale)}
                {daysUntilTrialEnd !== undefined && (
                  <span className="ms-2 text-text-muted">{t("abonnement.daysRemaining", { count: daysUntilTrialEnd })}</span>
                )}
              </dd>
            </div>
          )}

          {subscription.status === "expired" && subscription.currentPeriodEnd && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("abonnement.plan.expiredAtLabel")}</dt>
              <dd className="mt-1 text-sm text-text">{formatDayMonthYear(subscription.currentPeriodEnd, locale)}</dd>
            </div>
          )}

          {subscription.status === "grace" && subscription.graceEndsAt && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("abonnement.plan.graceEndLabel")}</dt>
              <dd className="mt-1 text-sm text-text">{formatDayMonthYear(subscription.graceEndsAt, locale)}</dd>
            </div>
          )}

          {subscription.status === "cancelled" && subscription.cancelledAt && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("abonnement.plan.cancelledAtLabel")}</dt>
              <dd className="mt-1 text-sm text-text">{formatDayMonthYear(subscription.cancelledAt, locale)}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-text">{t("abonnement.usage.sectionTitle")}</h2>
        <div className="mt-2 divide-y divide-border">
          <UsageRow label={t("abonnement.usage.practitioners")} usage={practitionersUsage} />
          <UsageRow label={t("abonnement.usage.staff")} usage={staffUsage} />
          <UsageRow label={t("abonnement.usage.storage")} usage={storageUsage} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-text">{t("abonnement.history.sectionTitle")}</h2>
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {history.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="text-text">
                {t(`abonnement.history.event.${event.type}`, event.months !== undefined ? { count: event.months } : undefined)}
              </span>
              <span className="text-text-muted" dir="ltr">
                {formatDayMonthYear(event.occurredAt, locale)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmDialog
        open={renewDialogOpen}
        onClose={() => setRenewDialogOpen(false)}
        onConfirm={handleAcknowledgeRenew}
        title={t("abonnement.renewDialog.title")}
        description={t("abonnement.renewDialog.description")}
        cancelLabel={t("abonnement.renewDialog.cancel")}
        confirmLabel={t("abonnement.renewDialog.confirm")}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
