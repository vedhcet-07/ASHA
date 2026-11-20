import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { demoApi, Role, DemoState } from './demoMock';

interface DemoContextProps {
  state: DemoState;
  setRole: (role: Role) => Promise<void>;
  setActiveMember: (memberId: string) => Promise<void>;
  resetDemo: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DemoContext = createContext<DemoContextProps | undefined>(undefined);

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DemoState>(demoApi.getDemoState as any);

  // Load initial state on mount
  useEffect(() => {
    demoApi.getDemoState().then(setState);
  }, []);

  const refresh = async () => {
    const s = await demoApi.getDemoState();
    setState(s);
  };

  const setRole = async (role: Role) => {
    await demoApi.setRole(role);
    await refresh();
  };

  const setActiveMember = async (memberId: string) => {
    await demoApi.setActiveMember(memberId);
    await refresh();
  };

  const resetDemo = async () => {
    await demoApi.resetDemo();
    await refresh();
  };

  return (
    <DemoContext.Provider value={{ state, setRole, setActiveMember, resetDemo, refresh }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
};

