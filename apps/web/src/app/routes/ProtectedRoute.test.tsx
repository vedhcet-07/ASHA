/**
 * Unit tests for ProtectedRoute — ASHA Platform Phase 1 (task 1.8).
 *
 * Validates: Requirements 1.9
 *
 * Covers:
 *   1. Unauthenticated user is redirected to /login
 *   2. Authenticated leader accessing /member/tasks is redirected to /select-role
 *   3. Authenticated leader accessing /leader/dashboard renders without redirect
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuthStore } from "../../lib/hooks/useAuthStore";
import type { UserRole } from "../../lib/hooks/useAuthStore";
import type { User } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal Supabase User stub sufficient for the auth-store. */
function makeUser(id = "user-001"): User {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "test@asha.io",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: "2026-01-01T00:00:00Z",
  } as User;
}

/**
 * Renders a MemoryRouter with:
 *   - an initial entry at `initialPath`
 *   - a ProtectedRoute (optionally with requiredRole) wrapping a stub child
 *   - a /login and /select-role page so we can assert which one was landed on
 */
function renderWithRouter(initialPath: string, requiredRole?: UserRole) {
  // Build the route element separately so we avoid passing undefined explicitly
  // when exactOptionalPropertyTypes is enabled.
  const guardElement =
    requiredRole !== undefined ? (
      <ProtectedRoute requiredRole={requiredRole} />
    ) : (
      <ProtectedRoute />
    );

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        {/* Protected subtree */}
        <Route element={guardElement}>
          <Route path={initialPath} element={<p>Protected Content</p>} />
        </Route>

        {/* Redirect targets */}
        <Route path="/login" element={<p>Login Page</p>} />
        <Route path="/select-role" element={<p>Select Role Page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset Zustand store to unauthenticated state before every test.
  useAuthStore.setState({
    user: null,
    activeRole: null,
    shgId: null,
    selectedLanguage: "en",
  });
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProtectedRoute — unauthenticated user", () => {
  it("redirects to /login when user is null", () => {
    // Store is unauthenticated by default (user: null)
    renderWithRouter("/leader/dashboard", "leader");

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /login even when no requiredRole is set", () => {
    renderWithRouter("/select-role");

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});

describe("ProtectedRoute — wrong role", () => {
  it("redirects a leader to /select-role when accessing /member/tasks", () => {
    useAuthStore.setState({ user: makeUser(), activeRole: "leader" });

    renderWithRouter("/member/tasks", "member");

    expect(screen.getByText("Select Role Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects a member to /select-role when accessing /leader/dashboard", () => {
    useAuthStore.setState({ user: makeUser(), activeRole: "member" });

    renderWithRouter("/leader/dashboard", "leader");

    expect(screen.getByText("Select Role Page")).toBeInTheDocument();
  });

  it("redirects a user with no active role to /select-role when requiredRole is set", () => {
    // Authenticated but no role chosen yet
    useAuthStore.setState({ user: makeUser(), activeRole: null });

    renderWithRouter("/leader/dashboard", "leader");

    expect(screen.getByText("Select Role Page")).toBeInTheDocument();
  });
});

describe("ProtectedRoute — correct role", () => {
  it("renders children for a leader accessing /leader/dashboard", () => {
    useAuthStore.setState({ user: makeUser(), activeRole: "leader" });

    renderWithRouter("/leader/dashboard", "leader");

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    expect(screen.queryByText("Select Role Page")).not.toBeInTheDocument();
  });

  it("renders children for a member accessing /member/tasks", () => {
    useAuthStore.setState({ user: makeUser(), activeRole: "member" });

    renderWithRouter("/member/tasks", "member");

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders children when no requiredRole is specified and user is authenticated", () => {
    useAuthStore.setState({ user: makeUser(), activeRole: "leader" });

    renderWithRouter("/select-role");

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
