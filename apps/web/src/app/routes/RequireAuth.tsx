import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../lib/store";

interface RequireAuthProps {
  children: React.ReactNode;
}

const isDemo = import.meta.env.VITE_DEMO_MODE === "true";

export function RequireAuth({ children }: RequireAuthProps) {
  const { accessToken } = useAuthStore();

  // In demo mode bypass auth entirely — mock state provides the user context.
  if (isDemo) return <>{children}</>;

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
