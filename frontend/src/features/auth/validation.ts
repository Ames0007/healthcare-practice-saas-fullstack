import { isValidEmail } from "@/features/patients/patient-form-validation";
import type { ForgotPasswordFormValues, LoginFormValues, ResetPasswordFormValues } from "./types";

/**
 * Email/required-field validation only (task §7: "Do NOT invent production
 * password-policy enforcement at login" — no minimum-length/complexity
 * rule for the password field). Reuses the existing `isValidEmail`
 * (`features/patients/patient-form-validation.ts`) rather than a second
 * email pattern.
 */
export function validateLoginForm(
  values: LoginFormValues,
  messages: { required: string; invalidEmail: string },
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.email.trim()) {
    errors.email = messages.required;
  } else if (!isValidEmail(values.email)) {
    errors.email = messages.invalidEmail;
  }

  if (!values.password) errors.password = messages.required;

  return errors;
}

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
  messages: { required: string; invalidEmail: string },
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.email.trim()) {
    errors.email = messages.required;
  } else if (!isValidEmail(values.email)) {
    errors.email = messages.invalidEmail;
  }

  return errors;
}

/**
 * AUTH-001 §22: the backend is authoritative (`Illuminate\Validation\
 * Rules\Password::min(8)`, `ResetPasswordRequest`) — this mirrors that
 * exact minimum so a too-short password fails fast client-side with a
 * clear message, instead of only surfacing as a generic backend
 * VALIDATION_ERROR after a round-trip.
 */
export const RESET_PASSWORD_MIN_LENGTH = 8;

export function validateResetPasswordForm(
  values: ResetPasswordFormValues,
  messages: { required: string; mismatch: string; tooShort: string },
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.password) {
    errors.password = messages.required;
  } else if (values.password.length < RESET_PASSWORD_MIN_LENGTH) {
    errors.password = messages.tooShort;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = messages.required;
  } else if (values.password && values.password !== values.confirmPassword) {
    errors.confirmPassword = messages.mismatch;
  }

  return errors;
}
