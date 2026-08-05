import type { StateCreator } from 'zustand';
import type { AppState, TerminalSession } from '../../types/store.types';
import { invoke } from '@tauri-apps/api/core';

export interface TerminalSlice {
  terminals: TerminalSession[];
  activeTerminalId: string | null;
  setActiveTerminalId: (id: string | null) => void;
  addTerminal: () => void;
  renameTerminal: (id: string, name: string) => void;
  closeTerminal: (id: string) => Promise<void>;
}

export const createTerminalSlice: StateCreator<AppState, [], [], TerminalSlice> = (set, get) => {
  const initialId = `term-${Date.now()}`;
  return {
    terminals: [{ id: initialId, name: 'Terminal', activeProcess: false }],
    activeTerminalId: initialId,

  setActiveTerminalId: (id) => set({ activeTerminalId: id }),

  addTerminal: () => set((state) => {
    const id = crypto.randomUUID();
    return {
      terminals: [...state.terminals, { id, activeProcess: false }],
      activeTerminalId: id
    };
  }),

  renameTerminal: (id, name) => set((state) => ({
    terminals: state.terminals.map(t => t.id === id ? { ...t, name } : t)
  })),

  closeTerminal: async (id) => {
    const state = get();
    const session = state.terminals.find(t => t.id === id);
    if (session?.activeProcess) {
      const confirm = window.confirm("Process is still running. Force close?");
      if (!confirm) return;
    }

    try {
      await invoke('close_pty', { id });
    } catch (e) {
      console.error('Failed to close PTY:', e);
    }
    
    set((state) => {
      const newTerms = state.terminals.filter(t => t.id !== id);
      let newActiveId = state.activeTerminalId;
      if (newActiveId === id) {
        newActiveId = newTerms.length > 0 ? newTerms[newTerms.length - 1].id : null;
      }
      
      if (newTerms.length === 0) {
        const newId = `term-${Date.now()}`;
        return { 
          terminals: [{ id: newId, name: 'Terminal', activeProcess: false }],
          activeTerminalId: newId 
        };
      }
      return { terminals: newTerms, activeTerminalId: newActiveId };
    });
  },
};
};
