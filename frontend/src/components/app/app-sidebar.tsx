"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/locale-provider";
import { useSession } from "@/features/auth/session-context";
import { NAV_ITEMS } from "@/lib/nav-config";
import { cn } from "@/lib/cn";

/**
 * Desktop: expanded sidebar (label + icon). Tablet (md): icon-only rail.
 * Mobile (below md): hidden — AppShell renders the bottom nav instead
 * (Spec #7 §39, #8 §21/§24).
 *
 * The header shows the real tenant name (TENANT-001 §31), not the
 * `topbar.practiceName` demo string the frontend prototype used before a
 * backend existed — `Communication`'s own mock dashboard preview still
 * uses that key deliberately (an unrelated, still-mock feature this task
 * does not touch). Rendered inside `AuthGuard` (`src/app/app/layout.tsx`),
 * which never lets this mount without a resolved `user.tenant`, so no
 * "loading"/"missing tenant" fallback state is needed here.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { user } = useSession();

  return (
    <aside
      aria-label={t("sidebar.navigation")}
      className={cn(
        "hidden shrink-0 flex-col border-e border-border bg-surface md:flex",
        "md:w-(--ds-sidebar-width-collapsed) lg:w-(--ds-sidebar-width)",
      )}
    >
      <div className="flex h-(--ds-topbar-height) items-center border-b border-border px-4">
        <span className="truncate text-sm font-semibold text-text">
          {user?.tenant?.name ?? ""}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-primary-soft text-primary"
                  : "text-text-secondary hover:bg-surface-subtle hover:text-text",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="hidden truncate lg:inline">{t(item.translationKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <span className="hidden truncate text-sm text-text-muted lg:inline">
          Dr. Benali
        </span>
      </div>
    </aside>
  );
}
