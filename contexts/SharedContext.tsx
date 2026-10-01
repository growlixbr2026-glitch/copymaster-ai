
import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { getActivePersona, personaToContext } from '../services/personaService';

interface SharedContextType {
  sharedContext: string;
  setSharedContext: React.Dispatch<React.SetStateAction<string>>;
  globalError: string | null;
  setGlobalError: React.Dispatch<React.SetStateAction<string | null>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SharedContext = createContext<SharedContextType | undefined>(undefined);

export const SharedContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sharedContext, setSharedContext] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('copymaster_shared_context:v2');
      if (saved) setSharedContext(saved);
      else {
        const activePersona = getActivePersona();
        if (activePersona) setSharedContext(personaToContext(activePersona));
      }
    } catch {
      const activePersona = getActivePersona();
      if (activePersona) setSharedContext(personaToContext(activePersona));
    }
  }, []);

  useEffect(() => {
    try {
      if (sharedContext) localStorage.setItem('copymaster_shared_context:v2', sharedContext);
      else localStorage.removeItem('copymaster_shared_context:v2');
    } catch {}
  }, [sharedContext]);

  // OTIMIZAÇÃO: Memoização do objeto de valor para evitar re-renders em cascata
  const contextValue = useMemo(() => ({
    sharedContext,
    setSharedContext,
    globalError,
    setGlobalError,
    activeTab,
    setActiveTab
  }), [sharedContext, globalError, activeTab]);

  return (
    <SharedContext.Provider value={contextValue}>
      {children}
    </SharedContext.Provider>
  );
};

export const useSharedContext = (): SharedContextType => {
  const context = useContext(SharedContext);
  if (!context) {
    throw new Error('useSharedContext must be used within a SharedContextProvider');
  }
  return context;
};