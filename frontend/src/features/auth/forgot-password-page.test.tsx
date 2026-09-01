import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/config";
import { ApiUnavailableError } from "@/lib/api-client";
import { ForgotPasswordPage } from "./forgot-password-page";

const { forgotPasswordMock } = vi.hoisted(() => ({ forgotPasswordMock: vi.fn() }));

vi.mock("@/features/auth/api", () => ({ forgotPassword: forgotPasswordMock }));

function DirRoot({ children }: { children: React.ReactNode }) {
  const { direction } = useLocale();
  return <div dir={direction}>{children}</div>;
}

function renderPage(locale: Locale) {
  return render(
    <LocaleProvider initialLocale={locale}>
      <DirRoot>
        <ForgotPasswordPage />
      </DirRoot>
    </LocaleProvider>,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("lang");
  forgotPasswordMock.mockReset();
});

describe("ForgotPasswordPage", () => {
  it("renders the email field and submit action", () => {
    renderPage("fr");
    expect(screen.getByRole("heading", { name: "Mot de passe oublié" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
  });

  it("requires an email", () => {
    renderPage("fr");
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));
    expect(screen.getByText("Ce champ est requis.")).toBeInTheDocument();
    expect(forgotPasswordMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email format", () => {
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));
    expect(screen.getByText("Adresse email invalide.")).toBeInTheDocument();
    expect(forgotPasswordMock).not.toHaveBeenCalled();
  });

  it("shows the generic success state for a well-formed email, real or not — never discloses account existence", async () => {
    forgotPasswordMock.mockResolvedValue({ message: "If an account exists..." });
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "personne-inconnue@cabinet.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));

    expect(
      await screen.findByText("Si un compte existe pour cette adresse, des instructions de réinitialisation seront envoyées."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/n'existe pas/)).not.toBeInTheDocument();
    expect(forgotPasswordMock).toHaveBeenCalledWith("personne-inconnue@cabinet.test");
  });

  it("shows a server-unavailable error when the backend cannot be reached, without claiming success", async () => {
    forgotPasswordMock.mockRejectedValue(new ApiUnavailableError());
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "docteur@cabinet.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Le serveur est momentanément indisponible. Réessayez.");
    expect(screen.queryByText("Vérifiez votre boîte de réception")).not.toBeInTheDocument();
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    forgotPasswordMock.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "docteur@cabinet.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));

    expect(screen.getByRole("button", { name: "Envoi en cours..." })).toBeDisabled();
    resolveRequest({ message: "ok" });
    await waitFor(() => expect(screen.getByText("Vérifiez votre boîte de réception")).toBeInTheDocument());
  });

  it("links back to login", () => {
    renderPage("fr");
    expect(screen.getByRole("link", { name: "Retour à la connexion" })).toHaveAttribute("href", "/auth");
  });

  it("renders in Arabic with RTL direction", () => {
    renderPage("ar");
    expect(screen.getByRole("heading", { name: "نسيت كلمة المرور" })).toBeInTheDocument();
    expect(document.querySelector("[dir='rtl']")).toBeInTheDocument();
  });
});
