/**
 * useActiveRole — ASHA Platform Phase 1 (task 1.9).
 *
 * Returns the user's current active role from the Zustand auth store, plus a
 * helper to check whether the user holds a specific role.
 *
 * Usage:
 *
 *   const { activeRole, hasRole, isLeader } = useActiveRole();
 *
 *   if (!isLeader) return <Redirect to="/select-role" />;
 *
 * Notes:
 *   - The active role is the role the user selected on the role-select screen.
 *   - Authorization is always enforced server-side; this hook is for navigation
 *     and conditional rendering only (see requirements 1.9).
 *   - `hasRole` returns false when activeRole is null (unauthenticated).
 */
import type { UserRole } from "./useAuthStore";
import { useAuthStore } from "./useAuthStore";

interface UseActiveRoleResult {
  /** The currently active role, or null if no role has been selected. */
  activeRole: UserRole | null;
  /**
   * Returns true if the current active role matches the given role.
   * Always returns false when the user is not authenticated.
   */
  hasRole: (role: UserRole) => boolean;
  // Convenience boolean flags for the roles defined in Requirement 1.6.
  isLeader: boolean;
  isMember: boolean;
  isApprover: boolean;
  isChecker: boolean;
  isBuyer: boolean;
  isFederationStaff: boolean;
}

export function useActiveRole(): UseActiveRoleResult {
  const activeRole = useAuthStore((s) => s.activeRole);

  const hasRole = (role: UserRole): boolean => activeRole === role;

  return {
    activeRole,
    hasRole,
    isLeader: activeRole === "leader",
    isMember: activeRole === "member",
    isApprover: activeRole === "approver",
    isChecker: activeRole === "checker",
    isBuyer: activeRole === "buyer",
    isFederationStaff: activeRole === "federation_staff",
  };
}
