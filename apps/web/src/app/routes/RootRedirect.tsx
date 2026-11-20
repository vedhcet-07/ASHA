import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../lib/store";

const isDemo = import.meta.env.VITE_DEMO_MODE === "true";

export function RootRedirect() {
  const { accessToken, role } = useAuthStore();

  // In demo mode auth store is seeded by DemoProvider, but guard against race
  if (!accessToken && !isDemo) {
    return <Navigate to="/login" replace />;
  }

  if (role === "leader")   return <Navigate to="/leader" replace />;
  if (role === "member")   return <Navigate to="/member" replace />;
  if (role === "buyer")    return <Navigate to="/buyer/orders" replace />;
  if (role === "approver") return <Navigate to="/approver" replace />;
  if (role === "checker")  return <Navigate to="/leader/quality" replace />;

  // Demo default: go to leader dashboard
  if (isDemo) return <Navigate to="/leader" replace />;

  return <Navigate to="/select-role" replace />;
}
