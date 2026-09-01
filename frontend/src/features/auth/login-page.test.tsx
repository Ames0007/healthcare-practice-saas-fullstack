import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/config";
import { ApiError, ApiUnavailableError } from "@/lib/api-client";
import { LoginPage } from "./login-page";

const { loginMock, pushMock, searchParamsGetMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  pushMock: vi.fn(),
  searchParamsGetMock: vi.fn().mockReturnValue(null),
}));

vi.mock("@/features/auth/api", () => ({ login: loginMock }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: searchParamsGetMock }),
}));

function DirRoot({ children }: { children: React.ReactNode }) {
  const { direction } = useLocale();
  return <div dir={direction}>{children}</div>;
}

function renderPage(locale: Locale) {
  return render(
    <LocaleProvider initialLocale={locale}>
      <DirRoot>
        <LoginPage />
      </DirRoot>
    </LocaleProvider>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "docteur@cabinet.test" } });
  fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: "hunter22" } });
}

afterEach(() => {
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("lang");
  loginMock.mockReset();
  pushMock.mockReset();
  searchParamsGetMock.mockReset().mockReturnValue(null);
});

describe("LoginPage", () => {
  it("renders email/password fields and the submit action", () => {
    renderPage("fr");
    expect(screen.getByRole("heading", { name: "Connexion à votre espace" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mot de passe/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });

  it("shows required errors for empty email/password on submit", () => {
    renderPage("fr");
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(screen.getAllByText("Ce champ est requis.")).toHaveLength(2);
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email format", () => {
    renderPage("fr");
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(screen.getByText("Adresse email invalide.")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("password is masked by default and the toggle reveals it accessibly", () => {
    renderPage("fr");
    const passwordField = screen.getByLabelText(/^Mot de passe/) as HTMLInputElement;
    expect(passwordField).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(passwordField).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Masquer le mot de passe" })).toBeInTheDocument();
  });

  it("a valid submission calls the real login API and navigates to /app — no localStorage/JS-readable cookie is ever set", async () => {
    loginMock.mockResolvedValue({ id: "user-1", email: "docteur@cabinet.test", status: "active", lastLoginAt: null });
    renderPage("fr");
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/app"));
    expect(loginMock).toHaveBeenCalledWith("docteur@cabinet.test", "hunter22", false);
    expect(window.localStorage.length).toBe(0);
    expect(document.cookie).toBe("");
  });

  it("navigates to a same-app ?from= destination after login instead of /app", async () => {
    loginMock.mockResolvedValue({ id: "user-1", email: "docteur@cabinet.test", status: "active", lastLoginAt: null });
    searchParamsGetMock.mockReturnValue("/app/patients");
    renderPage("fr");
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/app/patients"));
  });

  it("shows a generic invalid-credentials error without revealing which field was wrong", async () => {
    loginMock.mockRejectedValue(new ApiError(401, { code: "INVALID_CREDENTIALS", message: "Invalid email or password." }));
    renderPage("fr");
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou mot de passe incorrect.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a rate-limited message on repeated failures", async () => {
    loginMock.mockRejectedValue(new ApiError(429, { code: "TOO_MANY_ATTEMPTS", message: "Too many attempts." }));
    renderPage("fr");
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Trop de tentatives. Réessayez dans quelques instants.");
  });

  it("shows a server-unavailable message when the backend cannot be reached", async () => {
    loginMock.mockRejectedValue(new ApiUnavailableError());
    renderPage("fr");
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Le serveur est momentanément indisponible. Réessayez.");
  });

  it("disables the submit button and shows a pending label while the request is in flight", async () => {
    let resolveLogin: (value: unknown) => void = () => {};
    loginMock.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    renderPage("fr");
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(screen.getByRole("button", { name: "Connexion en cours..." })).toBeDisabled();
    resolveLogin({ id: "user-1", email: "docteur@cabinet.test", status: "active", lastLoginAt: null });
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });

  it("links to forgot password", () => {
    renderPage("fr");
    expect(screen.getByRole("link", { name: "Mot de passe oublié ?" })).toHaveAttribute("href", "/auth/forgot-password");
  });

  it("renders in Arabic with RTL direction", () => {
    renderPage("ar");
    expect(screen.getByRole("heading", { name: "تسجيل الدخول إلى مساحتك" })).toBeInTheDocument();
    expect(document.querySelector("[dir='rtl']")).toBeInTheDocument();
  });
});
