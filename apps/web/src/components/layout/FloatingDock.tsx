import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { navForRole, type NavItem } from './navConfig';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils/cn';

/* Centered floating pill dock — primary view switching with a dark pill
   highlight on the active route (shared layoutId for smooth travel). */

function isActive(item: NavItem, pathname: string): boolean {
  if (item.match === 'exact') return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + '/');
}

export const FloatingDock: React.FC = () => {
  const { role } = useAuth();
  const items = navForRole(role);
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex justify-center px-3">
      <nav className="pointer-events-auto flex items-center gap-1 rounded-full border border-stone-200/70 bg-surface/90 p-1.5 shadow-dock backdrop-blur-md">
        {items.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className="no-underline">
              {({ isActive: navActive }) => {
                const on = navActive || active;
                return (
                  <div
                    className={cn(
                      'relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                      on ? 'text-surface' : 'text-muted hover:text-ink hover:bg-inset',
                    )}
                  >
                    {on && !reduce && (
                      <motion.span
                        layoutId="dock-active"
                        className="absolute inset-0 rounded-full bg-ink shadow-tactile-sm"
                        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                      />
                    )}
                    {on && reduce && <span className="absolute inset-0 rounded-full bg-ink" />}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon size={17} />
                      <span className="hidden sm:inline">{item.label}</span>
                    </span>
                  </div>
                );
              }}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
