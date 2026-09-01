"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiUnavailableError } from "@/lib/api-client";
import { getCurrentUser, logout as logoutRequest, type AuthenticatedUser } from "./api";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "unreachable";

interface SessionContextValue {
  status: SessionStatus;
  user: AuthenticatedUser | null;
  /** Re-runs the `/me` bootstrap check (e.g. after a fresh login). */
  refresh: () => Promise<void>;
  /** Calls the real logout endpoint, then clears local state regardless of the result. */
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Authenticated-session bootstrap (AUTH-001 §27, §32). On mount, asks the
 * backend `/me` who is actually signed in — never trusts frontend memory
 * alone (task's own explicit instruction). Scoped to `/app/*` (where it's
 * rendered from, see `src/app/app/layout.tsx`), not the root layout: `/auth`
 * and `/book` have no use for it.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  function applySessionResult(currentUser: AuthenticatedUser | null, error: unknown) {
    if (currentUser) {
      setUser(currentUser);
      setStatus("authenticated");
      return;
    }

    setUser(null);
    if (error instanceof ApiUnavailableError) {
      setStatus("unreachable");
    } else {
      // Any other failure (401 AUTHENTICATION_REQUIRED, or an unexpected
      // error shape) is treated the same way a real 401 would be —
      // session-expired UX must not create a redirect loop by staying in
      // an ambiguous state (task §32).
      setStatus("unauthenticated");
    }
  }

  // The mount-time check is written as the React docs' own "fetching data
  // in an Effect" pattern (an `ignore` flag, the fetch defined inline
  // rather than as an outside useCallback) rather than reusing `refresh`
  // below — react-hooks' set-state-in-effect rule flags any *named*
  // function invoked from an effect that can reach a setState call
  // (regardless of whether that call sits after an `await`), and only
  // recognizes this exact inline shape as intentional data-fetching.
  useEffect(() => {
    let ignore = false;

    getCurrentUser()
      .then((currentUser) => {
        if (!ignore) applySessionResult(currentUser, null);
      })
      .catch((error: unknown) => {
        if (!ignore) applySessionResult(null, error);
      });

    return () => {
      ignore = true;
    };
  }, []);

  /**
   * Re-runs the `/me` bootstrap check from an event handler (e.g. the
   * "Réessayer" retry button) — never called from inside the mount effect
   * above, so setting "loading" synchronously here is an ordinary event
   * handler state update, not an effect one.
   */
  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const currentUser = await getCurrentUser();
      applySessionResult(currentUser, null);
    } catch (error) {
      applySessionResult(null, error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Logout must clear local state even if the network call failed —
      // there is no LocalStorage/token to also clean up (CLAUDE.md §15).
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ status, user, refresh, logout }),
    [status, user, refresh, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}
