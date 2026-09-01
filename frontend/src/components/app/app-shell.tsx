"use client";

import { useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { useSession } from "@/features/auth/session-context";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { MobileNav } from "@/components/app/mobile-nav";
import { QuickCreateDialog } from "@/components/app/quick-create-dialog";
import { UserMenuDialog } from "@/components/app/user-menu-dialog";
import { Toast } from "@/components/ui/toast";

/**
 * Authenticated application shell (Spec #7 §3, Spec #9 §2-3):
 * AppSidebar + AppTopbar + main content, with a mobile bottom nav replacing
 * the sidebar below the `md` breakpoint. No business data — composed by
 * route layouts under `/app`. Rendered inside `AuthGuard` (`src/app/app/
 * layout.tsx`), so `useSession()` is always available here.
 *
 * Owns the Quick Create dialog, the real user menu/logout dialog
 * (AUTH-001), and the shared future-feature `Toast` state (UI-FIX): the
 * topbar's Créer button and the mobile bottom nav's Plus button live here,
 * across route navigation, so one shared instance of each — not one per
 * surface — mirrors `Dialog`'s own "one focus-trap implementation"
 * precedent.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const { user, logout } = useSession();
  const [isQuickCreateOpen, setQuickCreateOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showFutureNotice(message: string) {
    setToastMessage(message);
  }

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:text-primary-foreground"
      >
        {t("common.skipToContent")}
      </a>

      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          onOpenQuickCreate={() => setQuickCreateOpen(true)}
          onNotifications={() => showFutureNotice(t("topbar.notificationsFutureNotice"))}
          onUserMenu={() => setUserMenuOpen(true)}
        />
        <main id="main-content" className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          {children}
        </main>
        <MobileNav onPlus={() => showFutureNotice(t("nav.plusFutureNotice"))} />
      </div>

      <QuickCreateDialog open={isQuickCreateOpen} onClose={() => setQuickCreateOpen(false)} />
      <UserMenuDialog
        open={isUserMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        email={user?.email ?? ""}
        onLogout={() => void logout()}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
