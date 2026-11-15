/**
 * ProtectedRoute — ASHA Platform Phase 1 (task 1.8).
 *
 * A React Router v7 layout route that enforces authentication and optionally
 * a specific active role before rendering nested child routes.
 *
 * Behaviour:
 *   1. If the user is not authenticated (store.user === null) → redirect /login
 *   2. If a requiredRole is provided and activeRole !== requiredRole → redirect /select-role
 *   3. Otherwise → render <Outlet /> so nested routes can mount
 *
 * This component is for navigation / UX purposes only.
 * All authorization is enforced server-side (Requirement 1.9).
 */
import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../../lib/hooks/useAuthStore";
import { useAuthStore } from "../../lib/hooks/useAuthStore";

interface ProtectedRouteProps {
  /**
   * When set, the user's activeRole must match this value.
   * If omitted, any authenticated user may access the route.
   */
  requiredRole?: UserRole;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);

  // 1. Not authenticated — send to login
  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  // 2. Authenticated but wrong (or no) active role — send to role selector
  if (requiredRole !== undefined && activeRole !== requiredRole) {
    return <Navigate to="/select-role" replace />;
  }

  // 3. All checks pass — render the child routes
  return <Outlet />;
}
