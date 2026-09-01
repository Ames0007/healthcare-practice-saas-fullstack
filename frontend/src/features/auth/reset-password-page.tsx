"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/locale-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { PasswordInput } from "./components/password-input";
import { validateResetPasswordForm } from "./validation";
import { resetPassword } from "./api";
import type { ResetPasswordFormValues } from "./types";

const INITIAL_VALUES: ResetPasswordFormValues = { password: "", confirmPassword: "" };

/**
 * Reset password (AUTH-001, replacing UI-013X's prototype). `token`/`email`
 * come from the emailed link's query string — a real backend now exists to
 * validate them, so a missing pair or an INVALID_RESET_TOKEN response are
 * now real, distinct states this screen never had before (there was
 * nothing to validate against in the prototype).
 */
export function ResetPasswordPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [values, setValues] = useState<ResetPasswordFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateResetPasswordForm(values, {
      required: t("auth.resetPassword.requiredError"),
      mismatch: t("auth.resetPassword.mismatchError"),
      tooShort: t("auth.resetPassword.tooShortError"),
    });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token as string, email as string, values.password, values.confirmPassword);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_RESET_TOKEN") {
        setTokenInvalid(true);
      } else if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        setFormError(t("auth.resetPassword.requiredError"));
      } else {
        setFormError(t("auth.resetPassword.serverUnavailableError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token || !email || tokenInvalid) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold text-text">{t("auth.resetPassword.missingTokenHeading")}</h1>
        <p role="status" className="text-sm text-text-secondary">
          {tokenInvalid ? t("auth.resetPassword.invalidTokenError") : t("auth.resetPassword.missingTokenMessage")}
        </p>
        <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">
          {t("auth.resetPassword.requestNewLink")}
        </Link>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold text-text">{t("auth.resetPassword.successHeading")}</h1>
        <p role="status" className="text-sm text-text-secondary">
          {t("auth.resetPassword.successMessage")}
        </p>
        <Link href="/auth" className="text-sm font-medium text-primary hover:underline">
          {t("auth.resetPassword.backToLogin")}
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-semibold text-text">{t("auth.resetPassword.heading")}</h1>
        <p className="text-sm text-text-secondary">{t("auth.resetPassword.description")}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <PasswordInput
          label={t("auth.resetPassword.passwordLabel")}
          required
          autoComplete="new-password"
          value={values.password}
          onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
          error={errors.password}
          showLabel={t("auth.login.showPassword")}
          hideLabel={t("auth.login.hidePassword")}
        />

        <PasswordInput
          label={t("auth.resetPassword.confirmPasswordLabel")}
          required
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(event) => setValues((current) => ({ ...current, confirmPassword: event.target.value }))}
          error={errors.confirmPassword}
          showLabel={t("auth.login.showPassword")}
          hideLabel={t("auth.login.hidePassword")}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("auth.resetPassword.submittingAction") : t("auth.resetPassword.submitAction")}
        </Button>
      </form>
    </Card>
  );
}
