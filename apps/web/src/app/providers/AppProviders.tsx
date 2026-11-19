import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from '@/components/ui/Toast';
import '@/lib/i18n';

/* App providers — no more Chakra. Tailwind + Framer Motion drive the
   warm tactile theme; ToastProvider replaces Chakra's useToast globally. */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <ToastProvider>{children}</ToastProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
};
