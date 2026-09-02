"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import type { AppointmentSettingsFormValues, CabinetProfileFormValues, CabinetService } from "@/components/domain/settings/types";
import type { CabinetWorkingHoursFormValues } from "@/features/parametres/working-hours";
import { ApiError, ApiUnavailableError } from "@/lib/api-client";
import { provisionTenant } from "@/features/tenancy/api";
import {
  buildInitialOnboardingCabinetValues,
  buildInitialOnboardingHoursValues,
  buildInitialOnboardingPreferencesValues,
  EMPTY_ONBOARDING_SERVICES,
  EMPTY_ONBOARDING_TEAM,
  type OnboardingDraftTeamMember,
  type OnboardingStep,
} from "./onboarding-state";
import { OnboardingProgress } from "./components/onboarding-progress";
import { OnboardingCabinetStep } from "./components/onboarding-cabinet-step";
import { OnboardingHoursStep } from "./components/onboarding-hours-step";
import { OnboardingServicesStep } from "./components/onboarding-services-step";
import { OnboardingTeamStep } from "./components/onboarding-team-step";
import { OnboardingPreferencesStep } from "./components/onboarding-preferences-step";
import { OnboardingReviewStep } from "./components/onboarding-review-step";
import { OnboardingCompleteStep } from "./components/onboarding-complete-step";

const STEP_AFTER: Record<Exclude<OnboardingStep, "complete" | "review">, OnboardingStep> = {
  cabinet: "hours",
  hours: "services",
  services: "team",
  team: "preferences",
  preferences: "review",
};

const STEP_BEFORE: Record<Exclude<OnboardingStep, "complete" | "cabinet">, OnboardingStep> = {
  hours: "cabinet",
  services: "hours",
  team: "services",
  preferences: "team",
  review: "preferences",
};

/**
 * Cabinet Onboarding wizard (UI-013X Gate 2 §12; TENANT-001 Gate 4 §23).
 * Each step manages its own local form state (mirroring
 * `CabinetSettingsPage`/`WorkingHoursPage`/`ServicesPage`'s own established
 * validate-on-submit pattern) and only reports upward via
 * `onChange`/`onContinue` — this component just holds the accumulated
 * draft plus which step is active (task §27: back navigation never loses
 * in-memory state, since nothing unmounts the wizard itself, only swaps
 * which step renders). A refresh still resets the whole in-progress draft
 * (no `localStorage`) — expected, unrelated to whether "Terminer la
 * configuration" itself now calls the real backend.
 *
 * `handleFinish` (TENANT-001) is the one place this component talks to the
 * network: it POSTs the accumulated draft to `provisionTenant`
 * (`features/tenancy/api.ts`) and, on success, moves to the completion
 * step. It deliberately does NOT call `useSession().refresh()` here —
 * mirroring `LoginPage`'s own established reasoning, refreshing the
 * `SessionProvider` state this component is itself rendered under would
 * immediately flip `OnboardingGuard`'s "already onboarded" check to true
 * and bounce the user straight to `/app` before they ever see the
 * completion screen. `/app`'s own `AuthGuard` discovers the new
 * tenant/membership fresh (a real `/me` call) whenever the user actually
 * navigates there via the completion screen's link, the same way any
 * direct navigation to `/app` would.
 */
export function OnboardingWizard() {
  const { t } = useLocale();
  const [step, setStep] = useState<OnboardingStep>("cabinet");
  const [cabinet, setCabinet] = useState<CabinetProfileFormValues>(buildInitialOnboardingCabinetValues);
  const [hours, setHours] = useState<CabinetWorkingHoursFormValues>(buildInitialOnboardingHoursValues);
  const [services, setServices] = useState<CabinetService[]>(EMPTY_ONBOARDING_SERVICES);
  const [team, setTeam] = useState<OnboardingDraftTeamMember[]>(EMPTY_ONBOARDING_TEAM);
  const [preferences, setPreferences] = useState<AppointmentSettingsFormValues>(buildInitialOnboardingPreferencesValues);
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function goToStep(target: OnboardingStep) {
    setStep(target);
  }

  function continueFrom(current: Exclude<OnboardingStep, "complete" | "review">) {
    setStep(STEP_AFTER[current]);
  }

  function backFrom(current: Exclude<OnboardingStep, "complete" | "cabinet">) {
    setStep(STEP_BEFORE[current]);
  }

  async function handleFinish() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      await provisionTenant({
        cabinet,
        hours,
        services,
        team,
        preferences: {
          defaultSchedulingMode: preferences.defaultSchedulingMode,
          defaultDurationMinutes: Number(preferences.defaultDurationMinutes),
        },
      });
      setStep("complete");
    } catch (error) {
      if (error instanceof ApiError && error.code === "TENANT_ALREADY_PROVISIONED") {
        setSubmitError(t("onboarding.review.alreadyProvisionedError"));
      } else if (error instanceof ApiUnavailableError) {
        setSubmitError(t("onboarding.review.serverUnavailableError"));
      } else {
        setSubmitError(t("onboarding.review.genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-text-muted">{t("home.title")}</span>
        <LanguageSwitcher />
      </div>

      {step !== "complete" && <OnboardingProgress step={step} />}

      {step === "cabinet" && (
        <OnboardingCabinetStep values={cabinet} onChange={setCabinet} onContinue={() => continueFrom("cabinet")} />
      )}

      {step === "hours" && (
        <OnboardingHoursStep values={hours} onChange={setHours} onContinue={() => continueFrom("hours")} onBack={() => backFrom("hours")} />
      )}

      {step === "services" && (
        <OnboardingServicesStep
          services={services}
          onChange={setServices}
          onContinue={() => continueFrom("services")}
          onBack={() => backFrom("services")}
        />
      )}

      {step === "team" && (
        <OnboardingTeamStep members={team} onChange={setTeam} onContinue={() => continueFrom("team")} onBack={() => backFrom("team")} />
      )}

      {step === "preferences" && (
        <OnboardingPreferencesStep
          values={preferences}
          onChange={setPreferences}
          onContinue={() => continueFrom("preferences")}
          onBack={() => backFrom("preferences")}
        />
      )}

      {step === "review" && (
        <OnboardingReviewStep
          cabinet={cabinet}
          hours={hours}
          services={services}
          team={team}
          preferences={preferences}
          onEditStep={goToStep}
          onFinish={() => void handleFinish()}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      )}

      {step === "complete" && <OnboardingCompleteStep />}
    </div>
  );
}
