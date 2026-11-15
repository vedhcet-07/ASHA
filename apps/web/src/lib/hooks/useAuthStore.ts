/**
 * Zustand auth store — ASHA Platform Phase 1 (task 1.9).
 *
 * Persistent slice (localStorage via Zustand persist middleware):
 *   - activeRole: the role the user selected at the role-select screen
 *   - selectedLanguage: the user's preferred language for UI and voice output
 *
 * Ephemeral slice (not persisted — re-fetched from Supabase on mount):
 *   - user: full Supabase User object; populated by useCurrentUser via onAuthStateChange
 *   - shgId: resolved after fetching the user's SHG membership from the backend
 */
import type { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole =
  | "leader"
  | "member"
  | "approver"
  | "checker"
  | "buyer"
  | "federation_staff";

export type SupportedLanguage = "en" | "kn" | "hi";

/** Shape of the full auth store state including all actions. */
interface AuthState {
  // --- Ephemeral (not persisted) ---
  user: User | null;
  shgId: string | null;

  // --- Persisted ---
  activeRole: UserRole | null;
  selectedLanguage: SupportedLanguage;

  // --- Actions ---
  setUser: (user: User | null) => void;
  setActiveRole: (role: UserRole | null) => void;
  setShgId: (shgId: string | null) => void;
  setSelectedLanguage: (lang: SupportedLanguage) => void;
  /** Clears all auth state (called on sign-out). */
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Ephemeral defaults
      user: null,
      shgId: null,

      // Persisted defaults
      activeRole: null,
      selectedLanguage: "en",

      setUser: (user) => set({ user }),
      setActiveRole: (activeRole) => set({ activeRole }),
      setShgId: (shgId) => set({ shgId }),
      setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
      clearAuth: () =>
        set({
          user: null,
          activeRole: null,
          shgId: null,
          selectedLanguage: "en",
        }),
    }),
    {
      name: "asha-auth",
      /**
       * Only persist the non-sensitive UI preferences.
       * user and shgId are intentionally excluded — they are re-hydrated from
       * Supabase on every session mount via useCurrentUser.
       */
      partialize: (state) => ({
        activeRole: state.activeRole,
        selectedLanguage: state.selectedLanguage,
      }),
    },
  ),
);
