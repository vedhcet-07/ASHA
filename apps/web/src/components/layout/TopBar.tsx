import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, LogOut, Search } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { titleForPath } from './navConfig';

/* Contextual top header bar — warm surface with the current section
   title, a search/filter pill, role badge, avatar and quick actions. */

export const TopBar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const ctx = titleForPath(pathname);

  return (
    <header className="sticky top-0 z-[110] border-b border-stone-200/70 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex shrink-0 items-center gap-2.5"
          aria-label="ASHA home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-ink text-sm font-bold text-surface shadow-tactile-sm">
            A
          </span>
          <span className="hidden text-lg font-bold tracking-tight text-ink sm:inline">ASHA</span>
        </button>

        <div className="mx-1 hidden h-7 w-px bg-stone-200/80 md:block" />

        {/* Contextual page title */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={ctx.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0"
            >
              <h1 className="truncate text-sm font-bold text-ink sm:text-base">{ctx.title}</h1>
              {ctx.subtitle && (
                <p className="hidden truncate text-xs text-muted lg:block">{ctx.subtitle}</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Search/filter pill */}
        <div className="hidden items-center gap-2 rounded-full border border-stone-200/80 bg-inset/60 px-3 py-1.5 text-sm text-muted-2 shadow-tactile-sm md:flex">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search…"
            className="w-28 bg-transparent text-ink outline-none placeholder:text-muted-2/60 focus:w-40 focus:placeholder:text-transparent lg:w-36"
          />
        </div>

        {/* Role badge */}
        <span className="hidden rounded-full bg-ink/8 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink sm:inline">
          {role}
        </span>

        {/* Quick actions */}
        <button
          onClick={() => navigate('/select-role')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/80 bg-surface text-muted transition-colors hover:bg-inset hover:text-ink shadow-tactile-sm"
          aria-label="Switch role"
          title="Switch role"
        >
          <Repeat size={16} />
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <Avatar name={user?.full_name || 'User'} size="sm" />
          <span className="max-w-[140px] truncate text-sm font-medium text-ink">
            {user?.full_name}
          </span>
        </div>

        <button
          onClick={logout}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/80 bg-surface text-muted transition-colors hover:bg-danger/10 hover:text-danger shadow-tactile-sm"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
