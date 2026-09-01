import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/config";
import { SessionProvider } from "@/features/auth/session-context";
import {
  getBlackoutSubscriptionMockData,
  getCancelledSubscriptionMockData,
  getExpiredSubscriptionMockData,
  getGraceSubscriptionMockData,
  getSubscriptionMockData,
  getTrialingSubscriptionMockData,
} from "./mock-subscription-data";
import { SubscriptionPage } from "./subscription-page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/abonnement",
}));

// SubscriptionPage reads `useSession()` (AUTH-001) for the Blackout
// screen's real "Se déconnecter" action — this page's own tests don't
// exercise session bootstrap itself, so the network boundary is mocked
// here rather than letting SessionProvider's real `getCurrentUser()` call
// hit an actual fetch (task §36: "Mock network boundaries appropriately").
const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/features/auth/api", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "user-1", email: "practicien@example.ma", status: "active", lastLoginAt: null }),
  logout: logoutMock,
}));

function DirRoot({ children }: { children: React.ReactNode }) {
  const { direction } = useLocale();
  return <div dir={direction}>{children}</div>;
}

function renderPage(initialLocale: Locale, props: React.ComponentProps<typeof SubscriptionPage> = {}) {
  return render(
    <LocaleProvider initialLocale={initialLocale}>
      <DirRoot>
        <SessionProvider>
          <SubscriptionPage {...props} />
        </SessionProvider>
      </DirRoot>
    </LocaleProvider>,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("lang");
});

describe("SubscriptionPage", () => {
  it("renders the header and the Abonnement tab marked active", () => {
    renderPage("fr");

    expect(screen.getByRole("heading", { level: 1, name: "Mon abonnement" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abonnement" })).toHaveAttribute("aria-current", "page");
  });

  it("renders the loading skeleton", () => {
    renderPage("fr", { state: "loading" });
    expect(screen.queryByText("Cabinet")).not.toBeInTheDocument();
  });

  it("renders the error state with a retry action", () => {
    const onRetry = vi.fn();
    renderPage("fr", { state: "error", onRetry });
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("Active: shows plan/status/period/renewal reproducing Screen 47's own worked example", () => {
    renderPage("fr", { subscription: getSubscriptionMockData() });

    expect(screen.getByText("Cabinet")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("Mensuel")).toBeInTheDocument();
    expect(screen.getByText("23 septembre 2026")).toBeInTheDocument();
  });

  it("Active: shows real usage derived from the Team fixtures (2/3 practitioners, 4/5 staff)", () => {
    renderPage("fr", { subscription: getSubscriptionMockData() });

    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("4 / 5")).toBeInTheDocument();
  });

  it("Active: storage usage shows the undefined-limit placeholder, never an invented number", () => {
    renderPage("fr", { subscription: getSubscriptionMockData() });
    expect(screen.getByText("Non défini dans ce prototype")).toBeInTheDocument();
  });

  it("Active: does not show an expiring-soon banner when the renewal date is beyond the 15-day threshold", () => {
    renderPage("fr", { subscription: getSubscriptionMockData() });
    expect(screen.queryByText(/expire dans/)).not.toBeInTheDocument();
  });

  it("Trialing: shows the trial end date and computed days remaining, never a stated total trial length", () => {
    renderPage("fr", { subscription: getTrialingSubscriptionMockData() });

    expect(screen.getByText("Essai")).toBeInTheDocument();
    expect(screen.getByText("30 août 2026")).toBeInTheDocument();
    expect(screen.getByText("(7 jour(s) restant(s))")).toBeInTheDocument();
  });

  it("Expired: shows the expiry date", () => {
    renderPage("fr", { subscription: getExpiredSubscriptionMockData() });
    expect(screen.getByText("Expiré")).toBeInTheDocument();
    const field = screen.getByText("Expiré le").closest("div") as HTMLElement;
    expect(within(field).getByText("23 août 2026")).toBeInTheDocument();
  });

  it("Grace: shows a warning banner with days remaining before suspension", () => {
    renderPage("fr", { subscription: getGraceSubscriptionMockData() });

    expect(screen.getByText("Délai de grâce")).toBeInTheDocument();
    expect(screen.getByText("Votre abonnement a expiré. Il reste 1 jour(s) avant la suspension.")).toBeInTheDocument();
  });

  it("Cancelled: shows the cancellation date", () => {
    renderPage("fr", { subscription: getCancelledSubscriptionMockData() });
    expect(screen.getByText("Annulé")).toBeInTheDocument();
  });

  it("Blackout: renders the full takeover screen with no PageHeader/nav/usage, per Screen 49", () => {
    renderPage("fr", { subscription: getBlackoutSubscriptionMockData() });

    expect(screen.getByRole("heading", { name: "Votre abonnement a expiré" })).toBeInTheDocument();
    expect(screen.getByText("Vos données restent conservées.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abonnement" })).not.toBeInTheDocument();
    expect(screen.queryByText("Utilisation")).not.toBeInTheDocument();
  });

  it("Blackout: support surfaces a future-feature notice; logout calls the real session logout (CLAUDE.md §11 — both remain accessible)", () => {
    renderPage("fr", { subscription: getBlackoutSubscriptionMockData() });

    const supportButton = screen.getByRole("button", { name: "Contacter le support" });
    const logoutButton = screen.getByRole("button", { name: "Se déconnecter" });
    expect(supportButton).not.toBeDisabled();
    expect(logoutButton).not.toBeDisabled();

    fireEvent.click(supportButton);
    expect(screen.getByText("Disponible dans une prochaine étape.")).toBeInTheDocument();

    fireEvent.click(logoutButton);
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("Renouveler opens an informational dialog and never mutates subscription state — no fake payment", () => {
    renderPage("fr", { subscription: getSubscriptionMockData() });

    fireEvent.click(screen.getByRole("button", { name: "Renouveler / Gérer" }));
    expect(screen.getByText("Le changement de plan sera connecté à la facturation SaaS ultérieurement.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compris" }));
    expect(screen.getByText("Message pris en compte.")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it("Blackout: Renouveler mon abonnement opens the same informational dialog", () => {
    renderPage("fr", { subscription: getBlackoutSubscriptionMockData() });

    fireEvent.click(screen.getByRole("button", { name: "Renouveler mon abonnement" }));
    expect(screen.getByText("Le changement de plan sera connecté à la facturation SaaS ultérieurement.")).toBeInTheDocument();
  });

  it("shows the bounded history events, never a payment transaction line", () => {
    renderPage("fr", { subscription: getSubscriptionMockData() });

    expect(screen.getByText("Essai démarré")).toBeInTheDocument();
    expect(screen.getByText("Abonnement activé")).toBeInTheDocument();
    expect(screen.getByText("Abonnement renouvelé")).toBeInTheDocument();
    expect(screen.getByText("Récompense de parrainage appliquée (+1 mois)")).toBeInTheDocument();
  });

  it("renders in Arabic with RTL direction", () => {
    renderPage("ar", { subscription: getSubscriptionMockData() });

    expect(screen.getByRole("heading", { level: 1, name: "اشتراكي" })).toBeInTheDocument();
    expect(screen.getByText("نشط")).toBeInTheDocument();
    expect(document.querySelector("[dir='rtl']")).toBeInTheDocument();
  });
});
