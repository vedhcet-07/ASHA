/**
 * Zustand global store for client-only state.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@asha/shared-types";

interface AuthState {
  userId: string | null;
  role: UserRole | null;
  fullName: string | null;
  shgId: string | null;
  shgName: string | null;
  language: string;
  accessToken: string | null;

  setAuth: (data: {
    userId: string;
    role: UserRole;
    fullName: string;
    accessToken: string;
    shgId?: string;
    shgName?: string;
  }) => void;
  setLanguage: (lang: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      fullName: null,
      shgId: null,
      shgName: null,
      language: "en",
      accessToken: null,

      setAuth: (data) =>
        set({
          userId: data.userId,
          role: data.role,
          fullName: data.fullName,
          accessToken: data.accessToken,
          shgId: data.shgId,
          shgName: data.shgName,
        }),

      setLanguage: (lang) => set({ language: lang }),

      clearAuth: () =>
        set({
          userId: null,
          role: null,
          fullName: null,
          shgId: null,
          shgName: null,
          accessToken: null,
        }),
    }),
    {
      name: "asha-auth",
      partialize: (state) => ({
        userId: state.userId,
        role: state.role,
        fullName: state.fullName,
        shgId: state.shgId,
        shgName: state.shgName,
        accessToken: state.accessToken,
        language: state.language,
      }),
    }
  )
);
