import React, { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TopBar } from '@/components/layout/TopBar';
import { LeftRail } from '@/components/layout/LeftRail';
import { FloatingDock } from '@/components/layout/FloatingDock';

/* Unified app shell — warm sand canvas with generous outer padding,
   a rounded alabaster workspace container (rounded-3xl), the contextual
   top bar, a floating left icon rail (desktop) and a bottom dock.
   Page transitions animate in/out via AnimatePresence. */

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen px-0 pb-28 sm:px-5 sm:py-5 lg:px-6 lg:pb-28">
      <div className="mx-auto min-h-full max-w-[1600px] overflow-hidden rounded-none border border-stone-200/50 bg-surface shadow-tactile-lg sm:rounded-[28px]">
        <TopBar />
        <div className="flex">
          <div className="hidden w-[72px] shrink-0 lg:block">
            <LeftRail />
          </div>
          <main ref={scrollRef} className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <FloatingDock />
    </div>
  );
};
