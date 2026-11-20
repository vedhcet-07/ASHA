import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { demoApi, Role } from './demoMock';
import { useAuthStore } from '../lib/store';

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

// Demo personas — switching role swaps the whole auth identity
const DEMO_PERSONAS: Record<Role, { userId: string; fullName: string; shgId: string; shgName: string; role: string }> = {
  leader:   { userId: 'leader-1',   fullName: 'Lata Desai',      shgId: 'shg-1', shgName: 'Saheli SHG', role: 'leader'   },
  member:   { userId: 'member-1',   fullName: 'Priya Sharma',    shgId: 'shg-1', shgName: 'Saheli SHG', role: 'member'   },
  buyer:    { userId: 'buyer-1',    fullName: 'Rajan Mehta',     shgId: '',      shgName: '',            role: 'buyer'    },
  checker:  { userId: 'checker-1',  fullName: 'Deepa Nair',      shgId: 'shg-1', shgName: 'Saheli SHG', role: 'checker'  },
  approver: { userId: 'approver-1', fullName: 'Suresh Verma',    shgId: '',      shgName: '',            role: 'approver' },
};

interface DemoContextProps {
  role: Role;
  setRole: (role: Role) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextProps>({
  role: 'leader',
  setRole: () => {},
  resetDemo: () => {},
});

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const { setAuth } = useAuthStore();

  function applyPersona(role: Role) {
    const p = DEMO_PERSONAS[role];
    setAuth({
      userId: p.userId,
      fullName: p.fullName,
      role: p.role as any,
      accessToken: `demo-token-${role}`,
      shgId: p.shgId,
      shgName: p.shgName,
    });
  }

  // Seed auth store on first mount so the app doesn't redirect to /login
  useEffect(() => {
    if (!isDemo) return;
    applyPersona('leader');
  }, []);

  const setRole = (role: Role) => {
    applyPersona(role);
    // Navigate to the correct dashboard for the chosen role
    const paths: Record<Role, string> = {
      leader:   '/leader',
      member:   '/member',
      buyer:    '/buyer/orders',
      checker:  '/leader/quality',
      approver: '/approver',
    };
    window.location.href = paths[role];
  };

  const resetDemo = () => {
    applyPersona('leader');
    window.location.href = '/leader';
  };

  return (
    <DemoContext.Provider value={{ role: 'leader', setRole, resetDemo }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext);
