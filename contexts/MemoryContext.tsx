import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBrainContext, getHistory, getProfile, clearHistory, exportHistoryJSON, HistoryEntry } from '../services/memoryService';

interface MemoryContextType {
  brain: string;
  history: HistoryEntry[];
  refresh: () => void;
  clear: () => void;
  exportJSON: () => string;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

export const MemoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brain, setBrain] = useState(() => getBrainContext());
  const [history, setHistory] = useState<HistoryEntry[]>(() => getHistory(20));

  const refresh = useCallback(() => {
    setBrain(getBrainContext());
    setHistory(getHistory(20));
  }, []);

  useEffect(() => {
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    const id = setInterval(refresh, 4000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(id); };
  }, [refresh]);

  const clear = useCallback(() => { clearHistory(); refresh(); }, [refresh]);
  const exportJSON = useCallback(() => exportHistoryJSON(), []);

  return <MemoryContext.Provider value={{ brain, history, refresh, clear, exportJSON }}>{children}</MemoryContext.Provider>;
};

export const useMemory = () => {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error('useMemory must be within MemoryProvider');
  return ctx;
};
