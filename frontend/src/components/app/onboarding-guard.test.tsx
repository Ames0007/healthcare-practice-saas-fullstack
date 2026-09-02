import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider } from "@/i18n/locale-provider";
import { ApiError, ApiUnavailableError } from "@/lib/api-client";
import { OnboardingGuard } from "./onboarding-guard";

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
  usePathname: () => "/onboarding",
}));

const ONBOARDED_USER = {
  id: "user-1",
  email: "docteur@cabinet.test",
  status: "active",
  lastLoginAt: null,
  tenant: { id: "tenant-1", name: "Cabinet Atlas", slug: "cabinet-atlas", status: "active" },
  membership: { id: "membership-1", profileType: "owner_admin", isOwner: true },
};

const NOT_YET_ONBOARDED_USER = {
  id: "user-1",
  email: "docteur@cabinet.test",
  status: "active",
  lastLoginAt: null,
  tenant: null,
  membership: null,
};

function renderGuarded() {
  return render(
    <LocaleProvider initialLocale="fr">
      <OnboardingGuard>
        <p>Onboarding wizard</p>
      </OnboardingGuard>
    </LocaleProvider>,
  );
}

afterEach(() => {
  getCurrentUserMock.mockReset();
  replaceMock.mockReset();
});

describe("OnboardingGuard", () => {
  it("renders the wizard for an authenticated user with no active tenant yet", async () => {
    getCurrentUserMock.mockResolvedValue(NOT_YET_ONBOARDED_USER);
    renderGuarded();

    expect(await screen.findByText("Onboarding wizard")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /auth, preserving the attempted path, when the session is not authenticated", async () => {
    getCurrentUserMock.mockRejectedValue(
      new ApiError(401, { code: "AUTHENTICATION_REQUIRED", message: "Authentication required." }),
    );
    renderGuarded();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/auth?from=%2Fonboarding"));
    expect(screen.queryByText("Onboarding wizard")).not.toBeInTheDocument();
  });

  it("redirects to /app — never showing the wizard again — when the user already has an active tenant", async () => {
    getCurrentUserMock.mockResolvedValue(ONBOARDED_USER);
    renderGuarded();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/app"));
    expect(screen.queryByText("Onboarding wizard")).not.toBeInTheDocument();
  });

  it("shows a retry screen — never a redirect — when the backend cannot be reached at all", async () => {
    getCurrentUserMock.mockRejectedValue(new ApiUnavailableError());
    renderGuarded();

    expect(await screen.findByText("Impossible de contacter le serveur")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
