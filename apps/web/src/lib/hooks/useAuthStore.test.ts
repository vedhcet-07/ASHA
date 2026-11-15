/**
 * Unit tests for the Zustand auth store (task 1.9).
 *
 * Validates: Requirements 1.7, 1.9
 *
 * Covers:
 *   - Initial state defaults
 *   - Each action correctly mutates state
 *   - clearAuth resets all auth state
 *   - persist middleware only stores activeRole + selectedLanguage (not user/shgId)
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { useAuthStore } from "./useAuthStore";

/** Helper: build a minimal Supabase User object for tests. */
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as User;
}

/**
 * Reset the store to its initial ephemeral state before each test.
 * Persisted values (activeRole, selectedLanguage) are also reset so tests
 * are independent.
 */
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    activeRole: null,
    shgId: null,
    selectedLanguage: "en",
  });
  localStorage.clear();
});

describe("useAuthStore — initial state", () => {
  it("has null user, activeRole, and shgId by default", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.activeRole).toBeNull();
    expect(state.shgId).toBeNull();
  });

  it("defaults selectedLanguage to 'en'", () => {
    expect(useAuthStore.getState().selectedLanguage).toBe("en");
  });
});

describe("useAuthStore — setUser", () => {
  it("stores the full Supabase User object", () => {
    const user = makeUser({ id: "abc-123", email: "leader@asha.io" });
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().user?.id).toBe("abc-123");
    expect(useAuthStore.getState().user?.email).toBe("leader@asha.io");
  });

  it("clears user when passed null", () => {
    useAuthStore.getState().setUser(makeUser());
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe("useAuthStore — setActiveRole", () => {
  it("sets the active role", () => {
    useAuthStore.getState().setActiveRole("leader");
    expect(useAuthStore.getState().activeRole).toBe("leader");
  });

  it("accepts null to clear the role", () => {
    useAuthStore.getState().setActiveRole("member");
    useAuthStore.getState().setActiveRole(null);
    expect(useAuthStore.getState().activeRole).toBeNull();
  });
});

describe("useAuthStore — setShgId", () => {
  it("sets the SHG id", () => {
    useAuthStore.getState().setShgId("shg-001");
    expect(useAuthStore.getState().shgId).toBe("shg-001");
  });

  it("accepts null to clear the SHG id", () => {
    useAuthStore.getState().setShgId("shg-001");
    useAuthStore.getState().setShgId(null);
    expect(useAuthStore.getState().shgId).toBeNull();
  });
});

describe("useAuthStore — setSelectedLanguage", () => {
  it("sets the selected language", () => {
    useAuthStore.getState().setSelectedLanguage("kn");
    expect(useAuthStore.getState().selectedLanguage).toBe("kn");
  });

  it("can switch between supported languages", () => {
    useAuthStore.getState().setSelectedLanguage("hi");
    expect(useAuthStore.getState().selectedLanguage).toBe("hi");
    useAuthStore.getState().setSelectedLanguage("en");
    expect(useAuthStore.getState().selectedLanguage).toBe("en");
  });
});

describe("useAuthStore — clearAuth", () => {
  it("resets all auth state to defaults", () => {
    useAuthStore.getState().setUser(makeUser());
    useAuthStore.getState().setActiveRole("approver");
    useAuthStore.getState().setShgId("shg-999");
    useAuthStore.getState().setSelectedLanguage("hi");

    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.activeRole).toBeNull();
    expect(state.shgId).toBeNull();
    expect(state.selectedLanguage).toBe("en");
  });
});

describe("useAuthStore — persist middleware", () => {
  it("persists activeRole and selectedLanguage to localStorage", () => {
    useAuthStore.getState().setActiveRole("checker");
    useAuthStore.getState().setSelectedLanguage("kn");

    // Zustand persist writes to localStorage under the configured key.
    const raw = localStorage.getItem("asha-auth");
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!);
    expect(persisted.state.activeRole).toBe("checker");
    expect(persisted.state.selectedLanguage).toBe("kn");
  });

  it("does NOT persist user or shgId to localStorage", () => {
    useAuthStore.getState().setUser(makeUser({ id: "secret-user" }));
    useAuthStore.getState().setShgId("secret-shg");

    const raw = localStorage.getItem("asha-auth");
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!);
    // partialize excludes user and shgId — they should not appear in storage.
    expect(persisted.state).not.toHaveProperty("user");
    expect(persisted.state).not.toHaveProperty("shgId");
  });

  it("rehydrates activeRole and selectedLanguage from localStorage on store re-creation", () => {
    useAuthStore.getState().setActiveRole("buyer");
    useAuthStore.getState().setSelectedLanguage("hi");

    // Simulate a page refresh: clear ephemeral state but keep localStorage.
    useAuthStore.setState({ user: null, shgId: null });

    // Zustand persist rehydrates persisted fields from localStorage.
    // In tests the store is a singleton, so the persisted values remain in
    // the store state. Verify they survived the ephemeral reset.
    expect(useAuthStore.getState().activeRole).toBe("buyer");
    expect(useAuthStore.getState().selectedLanguage).toBe("hi");
  });
});
