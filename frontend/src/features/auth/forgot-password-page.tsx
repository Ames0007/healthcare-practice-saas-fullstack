"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/locale-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validateForgotPasswordForm } from "./validation";
import { forgotPassword } from "./api";
import type { ForgotPasswordFormValues } from "./types";

const INITIAL_VALUES: ForgotPasswordFormValues = { email: "" };

/**
 * Forgot password (AUTH-001, replacing UI-013X's prototype). The success
 * state is shown for any well-formed email — the backend's own response is
 * already generic regardless of whether the account exists (CLAUDE.md §17),
 * so this page never has enough information to distinguish the two cases
 * even if it wanted to.
 */
export function ForgotPasswordPage() {
  const { t } = useLocale();
  const [values, setValues] = useState<ForgotPasswordFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateForgotPasswordForm(values, {
      required: t("auth.forgotPassword.requiredError"),
      invalidEmail: t("auth.forgotPassword.invalidEmailError"),
    });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(values.email);
      setSubmitted(true);
    } catch {
      // A malformed-email 422 is already caught by client-side validation
      // above — any error reaching here is a genuine network/server
      // problem, never an account-existence signal (the backend's own
      // response never distinguishes that either).
      setFormError(t("auth.forgotPassword.serverUnavailableError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold text-text">{t("auth.forgotPassword.successHeading")}</h1>
        <p role="status" className="text-sm text-text-secondary">
          {t("auth.forgotPassword.successMessage")}
        </p>
        <Link href="/auth" className="text-sm font-medium text-primary hover:underline">
          {t("auth.forgotPassword.backToLogin")}
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-semibold text-text">{t("auth.forgotPassword.heading")}</h1>
        <p className="text-sm text-text-secondary">{t("auth.forgotPassword.description")}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <Input
          label={t("auth.forgotPassword.emailLabel")}
          type="email"
          required
          autoComplete="email"
          value={values.email}
          onChange={(event) => setValues({ email: event.target.value })}
          error={errors.email}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("auth.forgotPassword.submittingAction") : t("auth.forgotPassword.submitAction")}
        </Button>
      </form>

      <Link href="/auth" className="text-center text-sm font-medium text-primary hover:underline">
        {t("auth.forgotPassword.backToLogin")}
      </Link>
    </Card>
  );
}
