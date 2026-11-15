/**
 * Unit tests for the useActiveRole hook (task 1.9).
 *
 * Validates: Requirements 1.7, 1.9
 *
 * Covers:
 *   - Returns null activeRole when no role is selected
 *   - Returns the activeRole after it is set in the store
 *   - hasRole helper correctly identifies matching and non-matching roles
 *   - Convenience boolean flags (isLeader, isMember, etc.) are correct
 *   - Hook re-renders when the active role changes
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./useAuthStore";
import { useActiveRole } from "./useActiveRole";

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    activeRole: null,
    shgId: null,
    selectedLanguage: "en",
  });
  localStorage.clear();
});

describe("useActiveRole — no role selected", () => {
  it("returns null activeRole", () => {
    const { result } = renderHook(() => useActiveRole());
    expect(result.current.activeRole).toBeNull();
  });

  it("hasRole returns false for every role when none is active", () => {
    const { result } = renderHook(() => useActiveRole());
    expect(result.current.hasRole("leader")).toBe(false);
    expect(result.current.hasRole("member")).toBe(false);
  });

  it("all convenience flags are false", () => {
    const { result } = renderHook(() => useActiveRole());
    expect(result.current.isLeader).toBe(false);
    expect(result.current.isMember).toBe(false);
    expect(result.current.isApprover).toBe(false);
    expect(result.current.isChecker).toBe(false);
    expect(result.current.isBuyer).toBe(false);
    expect(result.current.isFederationStaff).toBe(false);
  });
});

describe("useActiveRole — role selected", () => {
  it("returns the active role from the store", () => {
    act(() => {
      useAuthStore.getState().setActiveRole("leader");
    });
    const { result } = renderHook(() => useActiveRole());
    expect(result.current.activeRole).toBe("leader");
  });

  it("hasRole returns true for the matching role and false for others", () => {
    act(() => {
      useAuthStore.getState().setActiveRole("member");
    });
    const { result } = renderHook(() => useActiveRole());
    expect(result.current.hasRole("member")).toBe(true);
    expect(result.current.hasRole("leader")).toBe(false);
    expect(result.current.hasRole("approver")).toBe(false);
  });

  it("sets the correct convenience flag for each role", () => {
    const roles = [
      { role: "leader", flag: "isLeader" },
      { role: "member", flag: "isMember" },
      { role: "approver", flag: "isApprover" },
      { role: "checker", flag: "isChecker" },
      { role: "buyer", flag: "isBuyer" },
      { role: "federation_staff", flag: "isFederationStaff" },
    ] as const;

    for (const { role, flag } of roles) {
      act(() => {
        useAuthStore.getState().setActiveRole(role);
      });
      const { result } = renderHook(() => useActiveRole());
      expect(result.current[flag]).toBe(true);
    }
  });

  it("re-renders when the active role changes", () => {
    const { result } = renderHook(() => useActiveRole());

    act(() => {
      useAuthStore.getState().setActiveRole("leader");
    });
    expect(result.current.activeRole).toBe("leader");
    expect(result.current.isLeader).toBe(true);

    act(() => {
      useAuthStore.getState().setActiveRole("member");
    });
    expect(result.current.activeRole).toBe("member");
    expect(result.current.isLeader).toBe(false);
    expect(result.current.isMember).toBe(true);
  });
});
