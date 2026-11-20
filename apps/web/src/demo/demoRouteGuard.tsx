import React from 'react';

/**
 * DemoRouteGuard renders its children directly when VITE_DEMO_MODE=true,
 * bypassing auth redirects. In production mode it's a transparent pass-through
 * (individual routes handle their own RequireAuth wrappers in App.tsx).
 */
export const DemoRouteGuard = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
