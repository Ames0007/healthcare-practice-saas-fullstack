import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { LocaleProvider } from "@/i18n/locale-provider";
import { ApiError, ApiUnavailableError } from "@/lib/api-client";
import { AuthGuard } from "./auth-guard";

const { getCurrentUserMock, replaceMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("@/features/auth/api", () => ({
  getCurrentUser: getCurrentUserMock,
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/app/patients",
}));

function renderGuarded() {
  return render(
    <LocaleProvider initialLocale="fr">
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>
    </LocaleProvider>,
  );
}

afterEach(() => {
  getCurrentUserMock.mockReset();
  replaceMock.mockReset();
});

describe("AuthGuard", () => {
  it("renders protected content once the backend confirms an authenticated session", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", email: "docteur@cabinet.test", status: "active", lastLoginAt: null });
    renderGuarded();

    expect(await screen.findByText("Protected content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /auth, preserving the attempted path, when the session is not authenticated", async () => {
    getCurrentUserMock.mockRejectedValue(
      new ApiError(401, { code: "AUTHENTICATION_REQUIRED", message: "Authentication required." }),
    );
    renderGuarded();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/auth?from=%2Fapp%2Fpatients"));
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("shows a retry screen — never a redirect — when the backend cannot be reached at all", async () => {
    getCurrentUserMock.mockRejectedValue(new ApiUnavailableError());
    renderGuarded();

    expect(await screen.findByText("Impossible de contacter le serveur")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("retry re-runs the session check and can recover into the authenticated state", async () => {
    getCurrentUserMock.mockRejectedValueOnce(new ApiUnavailableError());
    getCurrentUserMock.mockResolvedValueOnce({ id: "user-1", email: "docteur@cabinet.test", status: "active", lastLoginAt: null });
    renderGuarded();

    fireEvent.click(await screen.findByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Protected content")).toBeInTheDocument();
  });

  it("never touches localStorage anywhere in the bootstrap flow", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1", email: "docteur@cabinet.test", status: "active", lastLoginAt: null });
    renderGuarded();

    await screen.findByText("Protected content");
    expect(window.localStorage.length).toBe(0);
  });
});
