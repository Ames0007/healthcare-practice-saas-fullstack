"use client";

import { useLocale } from "@/i18n/locale-provider";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface UserMenuDialogProps {
  open: boolean;
  onClose: () => void;
  email: string;
  onLogout: () => void;
}

/**
 * Real logout affordance (AUTH-001 §15/§24/§28-29), replacing the
 * topbar user button's previous "future feature" Toast (UI-FIX/ADR-012).
 * Mirrors QuickCreateDialog's exact `Dialog variant="modal" size="sm"`
 * pattern rather than inventing a new anchored-popover primitive — the
 * established precedent for a compact topbar-triggered menu in this
 * codebase.
 */
export function UserMenuDialog({ open, onClose, email, onLogout }: UserMenuDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="modal"
      size="sm"
      label={t("topbar.userMenu.navigationLabel")}
      closeLabel={t("agenda.drawer.close")}
    >
      <h2 className="text-lg font-semibold text-text">{t("topbar.userMenu.title")}</h2>
      <p className="mt-1 truncate text-sm text-text-secondary">{email}</p>

      <Button
        variant="outline"
        className="mt-6 w-full"
        onClick={() => {
          onClose();
          onLogout();
        }}
      >
        {t("topbar.userMenu.logoutAction")}
      </Button>
    </Dialog>
  );
}
