import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

/* Warm tactile auth shell — sand canvas with a centered alabaster card,
   brand mark and tagline. The auth form renders via <Outlet />. */

export const AuthLayout: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 text-center"
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-ink text-2xl font-bold text-surface shadow-tactile">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">ASHA</h1>
          <p className="mt-1 text-sm text-muted">Fair work. Clear costs. Trusted payouts.</p>
        </motion.div>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-stone-200/80 bg-surface p-7 shadow-tactile-lg sm:p-8"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
};
