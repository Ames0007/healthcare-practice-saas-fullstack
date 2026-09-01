"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/locale-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { ApiError, ApiUnavailableError } from "@/lib/api-client";
import { PasswordInput } from "./components/password-input";
import { validateLoginForm } from "./validation";
import { login } from "./api";
import type { LoginFormValues } from "./types";

const INITIAL_VALUES: LoginFormValues = { email: "", password: "", rememberMe: false };

/**
 * Login (AUTH-001, replacing UI-013X's prototype). A successful submission
 * now calls the real backend and navigates to `/app` — it deliberately does
 * NOT bootstrap `useSession()` itself: `/app`'s own `AuthGuard` (rendered
 * fresh on arrival) discovers the session the browser just received via
 * cookie, the same way any direct navigation to `/app` would. This keeps
 * `SessionProvider` scoped to `/app/*` (task's own boundary — `/auth` has
 * no other use for it) instead of wrapping the whole application just for
 * this one redirect.
 */
export function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateLoginForm(values, {
      required: t("auth.login.requiredError"),
      invalidEmail: t("auth.login.invalidEmailError"),
    });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(values.email, values.password, values.rememberMe);

      const from = searchParams.get("from");
      router.push(from && from.startsWith("/app") ? from : "/app");
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") {
        setFormError(t("auth.login.invalidCredentialsError"));
      } else if (error instanceof ApiError && error.code === "TOO_MANY_ATTEMPTS") {
        setFormError(t("auth.login.rateLimitedError"));
      } else if (error instanceof ApiUnavailableError) {
        setFormError(t("auth.login.serverUnavailableError"));
      } else {
        setFormError(t("auth.login.serverUnavailableError"));
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-sm font-semibold text-text-muted">{t("home.title")}</span>
        <h1 className="text-xl font-semibold text-text">{t("auth.login.heading")}</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <Input
          label={t("auth.login.emailLabel")}
          type="email"
          required
          autoComplete="email"
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          error={errors.email}
        />

        <PasswordInput
          label={t("auth.login.passwordLabel")}
          required
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
          error={errors.password}
          showLabel={t("auth.login.showPassword")}
          hideLabel={t("auth.login.hidePassword")}
        />

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={values.rememberMe}
            onChange={(event) => setValues((current) => ({ ...current, rememberMe: event.target.checked }))}
            className="h-4 w-4 rounded border-border-strong"
          />
          {t("auth.login.rememberMe")}
        </label>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("auth.login.submittingAction") : t("auth.login.submitAction")}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3 text-sm">
        <Link href="/auth/forgot-password" className="font-medium text-primary hover:underline">
          {t("auth.login.forgotPasswordLink")}
        </Link>
        <LanguageSwitcher />
      </div>
    </Card>
  );
}
