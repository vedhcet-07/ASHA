import React from 'react';
import { Navigate } from 'react-router-dom';
import { RequireAuth } from '../../app/routes/RequireAuth';

/**
 * DemoRouteGuard bypasses the real authentication guard when the app
 * is running in demo mode (`VITE_DEMO_MODE=true`). In demo mode the
 * mock state already contains a role, so we simply render the children.
 * When not in demo mode we fall back to the existing RequireAuth guard.
 */
export const DemoRouteGuard = ({ children }: { children: React.ReactElement }) => {
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
  if (isDemo) {
    // No auth check needed – demo state handles role switching.
    return children;
  }
  // Normal production flow – enforce auth.
  return <RequireAuth>{children}</RequireAuth>;
};

