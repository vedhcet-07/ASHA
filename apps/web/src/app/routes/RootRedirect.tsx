import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../lib/store";

export function RootRedirect() {
  const { accessToken, role } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (role === "leader") return <Navigate to="/leader" replace />;
  if (role === "member") return <Navigate to="/member" replace />;
  if (role === "buyer") return <Navigate to="/buyer/orders" replace />;
  if (role === "approver") return <Navigate to="/approver" replace />;
  if (role === "checker") return <Navigate to="/leader/quality" replace />;

  return <Navigate to="/select-role" replace />;
}

