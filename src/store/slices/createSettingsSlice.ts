import type { StateCreator } from 'zustand';
import type { AppState, AppSettings, LogEntry } from '../../types/store.types';
import { invoke } from '@tauri-apps/api/core';

export interface SettingsSlice {
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  settings: AppSettings;
  updateSettings: (category: keyof AppSettings, updates: Partial<Record<string, unknown>>) => void;
  isDebugModeEnabled: boolean;
  setDebugMode: (enabled: boolean) => void;
  debugLogs: LogEntry[];
  sessionId: string;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  userAvatar: string;
  setUserAvatar: (avatarData: string) => void;
}

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set, get) => ({
  isSettingsOpen: false,
  toggleSettings: () => {
    const willBeOpen = !get().isSettingsOpen;
    get().addLog({
      level: 'INFO',
      source: 'UX',
      message: willBeOpen ? 'Settings modal opened' : 'Settings modal closed'
    });
    set({ isSettingsOpen: willBeOpen });
  },
  
  settings: {
    environment: {
      useSystemPath: true,
      defaultShell: 'zsh',
    },
    qa: {
      logLevel: 'info',
      disableAnimations: false,
    },
    webManager: {
      tabHibernationTimeout: 5,
    },
    agents: {
      showTokenTelemetry: true,
    }
  },
  
  updateSettings: (category, updates) => set((state) => ({
    settings: {
      ...state.settings,
      [category]: {
        ...state.settings[category],
        ...updates
      }
    }
  })),

  isDebugModeEnabled: false,
  setDebugMode: (enabled) => set({ isDebugModeEnabled: enabled }),

  debugLogs: [],
  sessionId: Date.now().toString(),
  
  addLog: (log) => set((state) => {
    const newEntry: LogEntry = {
      ...log,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now()
    };
    const newLogs = [...state.debugLogs, newEntry].slice(-200);
    
    const date = new Date(newEntry.timestamp);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    const mmm = date.getMilliseconds().toString().padStart(3, '0');
    const formattedString = `[${hh}:${mm}:${ss}.${mmm}] [${newEntry.level}] [${newEntry.source}] ${newEntry.message}`;
    
    invoke('write_debug_log', { sessionId: state.sessionId, logLine: formattedString }).catch(err => console.error("Failed to write log:", err));
    
    return { debugLogs: newLogs };
  }),
  
  clearLogs: () => set({ debugLogs: [], sessionId: Date.now().toString() }),
  
  userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=b6e3f4,c0aede,d1d4f9',
  setUserAvatar: (avatarData) => set({ userAvatar: avatarData }),
});
