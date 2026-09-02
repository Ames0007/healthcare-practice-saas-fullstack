import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/config";
import { SessionProvider } from "@/features/auth/session-context";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
}));

// AppShell reads `useSession()` (AUTH-001) for the real user-menu/logout
// dialog — mocked here so these structural/UI-FIX tests never hit a real
// fetch (task §36: "Mock network boundaries appropriately").
const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/features/auth/api", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "practicien@example.ma",
    status: "active",
    lastLoginAt: null,
    tenant: { id: "tenant-1", name: "Cabinet Atlas", slug: "cabinet-atlas", status: "active" },
    membership: { id: "membership-1", profileType: "owner_admin", isOwner: true },
  }),
  logout: logoutMock,
}));

function DirRoot({ children }: { children: React.ReactNode }) {
  const { direction } = useLocale();
  return <div dir={direction}>{children}</div>;
}

function renderShell(locale: Locale = "fr") {
  return render(
    <LocaleProvider initialLocale={locale}>
      <DirRoot>
        <SessionProvider>
          <AppShell>
            <p>Demo content</p>
          </AppShell>
        </SessionProvider>
      </DirRoot>
    </LocaleProvider>,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("lang");
});

describe("AppShell", () => {
  it("renders the sidebar, topbar and main content region", async () => {
    renderShell();

    // Sidebar navigation (desktop/tablet) — all primary modules present.
    // Scoped to the sidebar landmark: some items (Aujourd'hui/Agenda/
    // Patients) also render in the mobile bottom nav, which coexists in
    // the DOM in jsdom (no real CSS breakpoint hiding).
    const sidebar = screen.getByRole("complementary");
    // TENANT-001 §31: the real tenant name from the session, not the old
    // `topbar.practiceName` demo string.
    expect(await within(sidebar).findByText("Cabinet Atlas")).toBeInTheDocument();
    expect(within(sidebar).getByText("Aujourd'hui")).toBeInTheDocument();
    expect(within(sidebar).getByText("Agenda")).toBeInTheDocument();
    expect(within(sidebar).getByText("Patients")).toBeInTheDocument();
    expect(within(sidebar).getByText("Finance")).toBeInTheDocument();
    expect(within(sidebar).getByText("Abonnement")).toBeInTheDocument();

    // Topbar
    expect(
      screen.getByPlaceholderText("Rechercher un patient, un numéro, une facture..."),
    ).toBeInTheDocument();

    // Main content is rendered and reachable via the skip link target.
    expect(screen.getByText("Demo content")).toBeInTheDocument();
    expect(document.getElementById("main-content")).toContainElement(
      screen.getByText("Demo content"),
    );
  });

  it("renders a structural mobile bottom nav with the four primary destinations", () => {
    renderShell();

    const mobileNav = screen.getByRole("navigation", { name: "Plus" });
    expect(mobileNav).toBeInTheDocument();

    // Aujourd'hui/Agenda/Patients are links, Plus is the fourth item (a
    // non-navigating placeholder button per Spec 06 TASK-003 §20/§28).
    expect(mobileNav.querySelectorAll("a")).toHaveLength(3);
    expect(mobileNav.querySelector("button")).toHaveTextContent("Plus");
  });

  /**
   * UI-FIX regression guard for the originally-reported dead "Créer"
   * topbar button — it must open a real Quick Create launcher listing
   * only actions whose creation workflow already exists in the completed
   * frontend (Spec #2 §4.3, Spec #7 §5), never a duplicate form.
   */
  describe("Quick Create (topbar Créer button)", () => {
    it("opens the launcher listing only actions with an existing creation workflow", () => {
      renderShell();

      fireEvent.click(screen.getByRole("button", { name: "Créer" }));

      const dialog = screen.getByRole("dialog", { name: "Créer" });
      expect(within(dialog).getByRole("link", { name: /Rendez-vous/ })).toHaveAttribute("href", "/app/agenda");
      expect(within(dialog).getByRole("link", { name: /Patient/ })).toHaveAttribute("href", "/app/patients");
      expect(within(dialog).getByRole("link", { name: /Mouvement de stock/ })).toHaveAttribute(
        "href",
        "/app/stock/movements",
      );
      expect(within(dialog).getByRole("link", { name: /Message/ })).toHaveAttribute("href", "/app/communication");
      expect(within(dialog).getByRole("link", { name: /Décaissement/ })).toHaveAttribute(
        "href",
        "/app/finance/expenses",
      );

      // No manual invoice-creation or context-free payment-capture workflow
      // exists anywhere in the completed frontend — never exposed here.
      expect(within(dialog).queryByText(/facture/i)).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/encaissement/i)).not.toBeInTheDocument();
    });

    it("selecting an action closes the launcher", () => {
      renderShell();

      fireEvent.click(screen.getByRole("button", { name: "Créer" }));
      const dialog = screen.getByRole("dialog", { name: "Créer" });
      fireEvent.click(within(dialog).getByRole("link", { name: /Patient/ }));

      expect(screen.queryByRole("dialog", { name: "Créer" })).not.toBeInTheDocument();
    });

    it("Escape closes the launcher and returns focus to the Créer trigger", () => {
      renderShell();

      const trigger = screen.getByRole("button", { name: "Créer" });
      trigger.focus();
      fireEvent.click(trigger);
      expect(screen.getByRole("dialog", { name: "Créer" })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByRole("dialog", { name: "Créer" })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    });

    it("renders the launcher in Arabic under RTL", () => {
      renderShell("ar");

      expect(document.querySelector("[dir='rtl']")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "إنشاء" }));

      const dialog = screen.getByRole("dialog", { name: "إنشاء" });
      expect(within(dialog).getByRole("link", { name: /مريض/ })).toBeInTheDocument();
    });
  });

  /**
   * UI-FIX: the notification bell and mobile "Plus" were visibly
   * interactive controls with no handler at all. Each surfaces the same
   * established future-feature `Toast` notice already used across the
   * app, rather than staying silently inert.
   */
  describe("future-feature notices", () => {
    it("notifications button shows the future-feature notice", () => {
      renderShell();

      fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
      expect(screen.getByText("Disponible dans une prochaine étape.")).toBeInTheDocument();
    });

    it("mobile Plus button shows the future-feature notice", () => {
      renderShell();

      const mobileNav = screen.getByRole("navigation", { name: "Plus" });
      fireEvent.click(within(mobileNav).getByRole("button", { name: "Plus" }));
      expect(screen.getByText("Disponible dans une prochaine étape.")).toBeInTheDocument();
    });
  });

  /**
   * AUTH-001: the user-account button used to be an inert future-feature
   * notice (UI-FIX) — it now opens a real user menu with the
   * authenticated account's email and a working logout action.
   */
  describe("user menu (AUTH-001)", () => {
    it("opens the user menu showing the authenticated account's email", async () => {
      renderShell();

      fireEvent.click(screen.getByRole("button", { name: "Compte" }));

      const dialog = await screen.findByRole("dialog", { name: "Compte" });
      expect(within(dialog).getByText("practicien@example.ma")).toBeInTheDocument();
    });

    it("Se déconnecter calls the real session logout", async () => {
      renderShell();

      fireEvent.click(screen.getByRole("button", { name: "Compte" }));
      const dialog = await screen.findByRole("dialog", { name: "Compte" });

      fireEvent.click(within(dialog).getByRole("button", { name: "Se déconnecter" }));

      expect(logoutMock).toHaveBeenCalledTimes(1);
    });
  });
});
