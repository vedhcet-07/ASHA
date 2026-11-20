import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../lib/store";
import type { UserRole } from "@asha/shared-types";

interface RequireRoleProps {
  role: UserRole | UserRole[];
  children: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { role: userRole } = useAuthStore();

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redirect to appropriate area based on actual role
    if (userRole === "leader") return <Navigate to="/leader" replace />;
    if (userRole === "member") return <Navigate to="/member" replace />;
    if (userRole === "approver") return <Navigate to="/approver" replace />;
    if (userRole === "buyer") return <Navigate to="/buyer/orders" replace />;
    if (userRole === "checker") return <Navigate to="/leader/quality" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
