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

export const createTerminalSlice: StateCreator<AppState, [], [], TerminalSlice> = (set) => ({
  terminals: [],
  activeTerminalId: null,

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
    try {
      await invoke('close_pty', { id });
    } catch (e) {
      console.error('Failed to close PTY:', e);
    }
    
    set((state) => {
      const newTerminals = state.terminals.filter(t => t.id !== id);
      return {
        terminals: newTerminals,
        activeTerminalId: state.activeTerminalId === id 
          ? (newTerminals[newTerminals.length - 1]?.id ?? null)
          : state.activeTerminalId
      };
    });
  },
});
