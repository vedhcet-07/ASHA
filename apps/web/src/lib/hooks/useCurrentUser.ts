/**
 * useCurrentUser — ASHA Platform Phase 1 (task 1.9).
 *
 * Wraps Supabase's onAuthStateChange to keep the Zustand auth store in sync
 * with the Supabase session at all times.
 *
 * Usage: mount once near the app root (e.g. inside App.tsx or AuthProvider).
 *
 *   function App() {
 *     useCurrentUser();
 *     return <RouterProvider router={router} />;
 *   }
 *
 * The hook:
 *   1. Subscribes to Supabase auth state changes on mount.
 *   2. Calls setUser(user) when a session is active, setUser(null) on sign-out.
 *   3. Calls clearAuth() on sign-out so activeRole and shgId are also cleared.
 *   4. Unsubscribes on unmount to prevent memory leaks.
 *
 * Note: shgId is NOT resolved here. It is a separate concern (fetching the
 * user's SHG membership from the API) and should be set via setShgId() after
 * the membership query resolves.
 */
import { useEffect } from "react";
import { supabase } from "../supabase";
import { useAuthStore } from "./useAuthStore";

export function useCurrentUser(): void {
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    // Sync the current session immediately on mount (handles page refreshes).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Subscribe to future auth state changes (login, logout, token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        // Sign-out or session expiry — clear all ephemeral + persisted auth.
        clearAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, clearAuth]);
}
