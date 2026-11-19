import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/* Drop-in replacement for Chakra's useToast. Same call shape used across
   the app: toast({ title, status, description }) — rendered as a warm
   tactile toast stack top-right with Framer Motion enter/exit. */

type ToastStatus = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  status: ToastStatus;
}

interface ToastInput {
  title: string;
  description?: string;
  status?: ToastStatus;
  duration?: number;
}

interface ToastCtx {
  toast: (input: ToastInput) => number;
  close: (id: number) => void;
}

const Ctx = createContext<ToastCtx | undefined>(undefined);

const statusStyle: Record<ToastStatus, { icon: React.ReactNode; ring: string; accent: string }> = {
  success: { icon: <CheckCircle2 size={18} />, ring: 'text-success', accent: 'bg-success' },
  error: { icon: <XCircle size={18} />, ring: 'text-danger', accent: 'bg-danger' },
  info: { icon: <Info size={18} />, ring: 'text-info', accent: 'bg-info' },
  warning: { icon: <AlertTriangle size={18} />, ring: 'text-warning', accent: 'bg-warning' },
  loading: { icon: <Info size={18} />, ring: 'text-muted', accent: 'bg-muted' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const reduce = useReducedMotion();

  const close = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = ++idRef.current;
      const item: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        status: input.status || 'info',
      };
      setToasts((t) => [...t, item]);
      const dur = input.duration ?? 3800;
      if (input.status !== 'loading' && dur > 0) {
        window.setTimeout(() => close(id), dur);
      }
      return id;
    },
    [close],
  );

  return (
    <Ctx.Provider value={{ toast, close }}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[200] flex w-[min(92vw,360px)] flex-col gap-2.5 sm:right-5 sm:top-5">
        <AnimatePresence>
          {toasts.map((t) => {
            const s = statusStyle[t.status];
            return (
              <motion.div
                key={t.id}
                layout
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto relative overflow-hidden rounded-2xl border border-stone-200/80 bg-surface p-3.5 pl-4 shadow-tactile-lg"
              >
                <span className={cn('absolute left-0 top-0 h-full w-1', s.accent)} />
                <div className="flex items-start gap-2.5">
                  <span className={cn('mt-0.5 shrink-0', s.ring)}>{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{t.title}</p>
                    {t.description && <p className="mt-0.5 text-xs text-muted">{t.description}</p>}
                  </div>
                  <button
                    onClick={() => close(t.id)}
                    className="-mr-1 -mt-1 rounded-lg p-1 text-muted-2 transition-colors hover:bg-ink/5 hover:text-ink"
                    aria-label="Dismiss"
                  >
                    <X size={15} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
};

export function useToast(): { (input: ToastInput): number; close: (id: number) => void } {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  const fn = ((input: ToastInput) => ctx.toast(input)) as ((input: ToastInput) => number) & {
    close: (id: number) => void;
  };
  fn.close = ctx.close;
  return fn;
}
