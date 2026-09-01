import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/config";
import { ApiError } from "@/lib/api-client";
import { ResetPasswordPage } from "./reset-password-page";

const { resetPasswordMock, searchParams } = vi.hoisted(() => ({
  resetPasswordMock: vi.fn(),
  searchParams: new Map<string, string>([
    ["token", "a-real-looking-token"],
    ["email", "docteur@cabinet.test"],
  ]),
}));

vi.mock("@/features/auth/api", () => ({ resetPassword: resetPasswordMock }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => searchParams.get(key) ?? null }),
}));

function DirRoot({ children }: { children: React.ReactNode }) {
  const { direction } = useLocale();
  return <div dir={direction}>{children}</div>;
}

function renderPage(locale: Locale) {
  return render(
    <LocaleProvider initialLocale={locale}>
      <DirRoot>
        <ResetPasswordPage />
      </DirRoot>
    </LocaleProvider>,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("lang");
  resetPasswordMock.mockReset();
  searchParams.set("token", "a-real-looking-token");
  searchParams.set("email", "docteur@cabinet.test");
});

describe("ResetPasswordPage", () => {
  it("renders both password fields and the submit action", () => {
    renderPage("fr");
    expect(screen.getByRole("heading", { name: "Réinitialiser le mot de passe" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nouveau mot de passe/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirmer le mot de passe/)).toBeInTheDocument();
  });

  it("shows an invalid-link state when the token/email are missing from the URL", () => {
    searchParams.delete("token");
    renderPage("fr");

    expect(screen.getByRole("heading", { name: "Lien de réinitialisation invalide" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Demander un nouveau lien" })).toHaveAttribute(
      "href",
      "/auth/forgot-password",
    );
  });

  it("requires both fields", () => {
    renderPage("fr");
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(screen.getAllByText("Ce champ est requis.")).toHaveLength(2);
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("rejects a mismatched confirmation", () => {
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe/), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText(/^Confirmer le mot de passe/), { target: { value: "abcd1235" } });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(screen.getByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
  });

  it("rejects a password shorter than the backend's own minimum", () => {
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe/), { target: { value: "short1" } });
    fireEvent.change(screen.getByLabelText(/^Confirmer le mot de passe/), { target: { value: "short1" } });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(screen.getByText("Le mot de passe doit contenir au moins 8 caractères.")).toBeInTheDocument();
  });

  it("shows the success state and calls the real reset API with the URL's token/email", async () => {
    resetPasswordMock.mockResolvedValue({ message: "Your password has been reset." });
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe/), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText(/^Confirmer le mot de passe/), { target: { value: "abcd1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(await screen.findByText("Mot de passe mis à jour")).toBeInTheDocument();
    expect(screen.getByText("Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.")).toBeInTheDocument();
    expect(resetPasswordMock).toHaveBeenCalledWith("a-real-looking-token", "docteur@cabinet.test", "abcd1234", "abcd1234");
  });

  it("shows an invalid/expired-link state when the backend rejects the token", async () => {
    resetPasswordMock.mockRejectedValue(
      new ApiError(422, { code: "INVALID_RESET_TOKEN", message: "This password reset link is invalid or has expired." }),
    );
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe/), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText(/^Confirmer le mot de passe/), { target: { value: "abcd1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(await screen.findByRole("heading", { name: "Lien de réinitialisation invalide" })).toBeInTheDocument();
    expect(screen.getByText("Ce lien de réinitialisation est invalide ou a expiré.")).toBeInTheDocument();
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveReset: (value: unknown) => void = () => {};
    resetPasswordMock.mockReturnValue(new Promise((resolve) => { resolveReset = resolve; }));
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe/), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText(/^Confirmer le mot de passe/), { target: { value: "abcd1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(screen.getByRole("button", { name: "Réinitialisation en cours..." })).toBeDisabled();
    resolveReset({ message: "ok" });
    await waitFor(() => expect(screen.getByText("Mot de passe mis à jour")).toBeInTheDocument());
  });

  it("each password field has its own independent show/hide toggle", () => {
    renderPage("fr");
    const toggles = screen.getAllByRole("button", { name: "Afficher le mot de passe" });
    expect(toggles).toHaveLength(2);

    fireEvent.click(toggles[0]);
    expect(screen.getByLabelText(/^Nouveau mot de passe/)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/^Confirmer le mot de passe/)).toHaveAttribute("type", "password");
  });

  it("renders in Arabic with RTL direction", () => {
    renderPage("ar");
    expect(screen.getByRole("heading", { name: "إعادة تعيين كلمة المرور" })).toBeInTheDocument();
    expect(document.querySelector("[dir='rtl']")).toBeInTheDocument();
  });
});
