import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Repeat, LogOut } from 'lucide-react';
import { navForRole, type NavItem } from './navConfig';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils/cn';

/* Compact floating vertical icon rail (desktop). Renders the pill itself;
 * MainLayout seats it in a sticky left gutter so it floats within the
 * rounded workspace card. Active items get a dark circle state. */

function isActive(item: NavItem, pathname: string): boolean {
  if (item.match === 'exact') return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + '/');
}

export const LeftRail: React.FC = () => {
  const { role, logout } = useAuth();
  const items = navForRole(role);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  return (
    <div className="sticky top-24 flex flex-col items-center gap-1.5 rounded-full border border-stone-200/70 bg-surface/85 p-2 shadow-rail backdrop-blur-md">
      {items.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <NavLink key={item.to} to={item.to} title={item.label} className="no-underline">
            {() => (
              <div
                className={cn(
                  'group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors',
                  active ? 'bg-ink text-surface shadow-tactile-sm' : 'text-muted hover:bg-inset hover:text-ink',
                )}
              >
                <Icon size={19} />
                {!active && !reduce && (
                  <motion.span className="absolute -right-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-ink opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </div>
            )}
          </NavLink>
        );
      })}

      <div className="my-1 h-px w-6 bg-stone-200/80" />

      <button
        title="Switch role"
        onClick={() => navigate('/select-role')}
        className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted transition-colors hover:bg-inset hover:text-ink"
      >
        <Repeat size={18} />
      </button>
      <button
        title="Logout"
        onClick={logout}
        className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
};
