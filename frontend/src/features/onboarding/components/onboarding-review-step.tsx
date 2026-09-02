"use client";

import { useLocale } from "@/i18n/locale-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AppointmentSettingsFormValues, CabinetProfileFormValues, CabinetService } from "@/components/domain/settings/types";
import { CABINET_SPECIALTY_MAP } from "@/components/domain/settings/specialty";
import { formatMad } from "@/features/rapports/format";
import { sortServicesByName } from "@/features/parametres/services";
import { WEEKDAY_ORDER } from "@/features/team/schedule";
import type { CabinetWorkingHoursFormValues } from "@/features/parametres/working-hours";
import type { OnboardingDraftTeamMember, OnboardingStep } from "../onboarding-state";

export interface OnboardingReviewStepProps {
  cabinet: CabinetProfileFormValues;
  hours: CabinetWorkingHoursFormValues;
  services: CabinetService[];
  team: OnboardingDraftTeamMember[];
  preferences: AppointmentSettingsFormValues;
  onEditStep: (step: OnboardingStep) => void;
  onFinish: () => void;
  /** TENANT-001: true while `provisionTenant` is in flight — disables the finish button so a double-click can't fire two provisioning requests. */
  isSubmitting: boolean;
  /** TENANT-001: set when `provisionTenant` rejects — a translated, user-facing message, never a raw error/stack. */
  submitError: string | null;
}

/**
 * Step 6 — Récapitulatif (task §25). No approved wireframe defines a
 * review-before-completion pattern (Spec #9 Screen 07 goes straight to a
 * completion screen) — this step is this task's own explicit addition
 * (§25's exact section-by-section shape), not a spec contradiction (see
 * ADR-019). Every value shown here is read directly from the wizard's own
 * accumulated state — never re-entered or recomputed a second way.
 *
 * `onFinish` now triggers a real `provisionTenant` call (TENANT-001 Gate 4)
 * — `isSubmitting`/`submitError` surface that call's real loading/failure
 * states, the same pattern `LoginPage`/`ForgotPasswordPage` already
 * established for their own backend calls.
 */
export function OnboardingReviewStep({
  cabinet,
  hours,
  services,
  team,
  preferences,
  onEditStep,
  onFinish,
  isSubmitting,
  submitError,
}: OnboardingReviewStepProps) {
  const { t, locale } = useLocale();
  const sortedServices = sortServicesByName(services);

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-text">{t("onboarding.review.heading")}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t("onboarding.review.description")}</p>
      </div>

      <section className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">{t("onboarding.review.cabinetSection")}</h3>
          <Button size="sm" variant="outline" type="button" onClick={() => onEditStep("cabinet")}>
            {t("onboarding.review.editAction")}
          </Button>
        </div>
        <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">{t("parametres.cabinet.form.nameLabel")}</dt>
            <dd className="text-text">{cabinet.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">{t("parametres.cabinet.form.specialtyLabel")}</dt>
            <dd className="text-text">{t(CABINET_SPECIALTY_MAP[cabinet.specialty].translationKey)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">{t("parametres.cabinet.form.phoneLabel")}</dt>
            <dd className="text-text" dir="ltr">
              {cabinet.phone || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">{t("parametres.cabinet.form.cityLabel")}</dt>
            <dd className="text-text">{cabinet.city || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">{t("onboarding.review.hoursSection")}</h3>
          <Button size="sm" variant="outline" type="button" onClick={() => onEditStep("hours")}>
            {t("onboarding.review.editAction")}
          </Button>
        </div>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {WEEKDAY_ORDER.map((weekday) => {
            const day = hours[weekday];
            return (
              <li key={weekday} className="flex items-center justify-between">
                <span className="text-text">{t(`team.weekday.${weekday}`)}</span>
                <span className={day.isOpen ? "text-text" : "text-text-muted"}>
                  {day.isOpen ? `${day.startTime} – ${day.endTime}` : t("onboarding.review.closedDay")}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">{t("onboarding.review.servicesSection")}</h3>
          <Button size="sm" variant="outline" type="button" onClick={() => onEditStep("services")}>
            {t("onboarding.review.editAction")}
          </Button>
        </div>
        {sortedServices.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">{t("onboarding.review.noServices")}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {sortedServices.map((service) => (
              <li key={service.id} className="flex items-center justify-between">
                <span className="text-text">{service.name}</span>
                <span className="text-text-secondary">
                  {t("parametres.services.durationValue", { minutes: service.durationMinutes })} — {formatMad(service.price, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">{t("onboarding.review.teamSection")}</h3>
          <Button size="sm" variant="outline" type="button" onClick={() => onEditStep("team")}>
            {t("onboarding.review.editAction")}
          </Button>
        </div>
        {team.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">{t("onboarding.review.noTeam")}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {team.map((member) => (
              <li key={member.id} className="flex items-center justify-between">
                <span className="text-text">
                  {member.firstName} {member.lastName}
                </span>
                <span className="text-text-secondary">{t(`team.role.${member.role}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">{t("onboarding.review.preferencesSection")}</h3>
          <Button size="sm" variant="outline" type="button" onClick={() => onEditStep("preferences")}>
            {t("onboarding.review.editAction")}
          </Button>
        </div>
        <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">{t("parametres.rendezVous.form.schedulingModeLabel")}</dt>
            <dd className="text-text">{t(`parametres.services.schedulingMode.${preferences.defaultSchedulingMode}`)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">{t("parametres.rendezVous.form.durationLabel")}</dt>
            <dd className="text-text">{t("parametres.services.durationValue", { minutes: Number(preferences.defaultDurationMinutes) })}</dd>
          </div>
        </dl>
      </section>

      {submitError && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {submitError}
        </p>
      )}

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="button" onClick={onFinish} disabled={isSubmitting}>
          {isSubmitting ? t("onboarding.review.submittingAction") : t("onboarding.review.finishAction")}
        </Button>
      </div>
    </Card>
  );
}
