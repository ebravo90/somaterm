import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import { secureVault } from '../services/secureStore';

export interface SettingsState {
  useSystemPath: boolean;
  defaultShell: string;
  logLevel: string;
  disableAnimations: boolean;
  tabHibernationTimeout: number;
  showTokenTelemetry: boolean;
  setUseSystemPath: (val: boolean) => void;
  setDefaultShell: (val: string) => void;
  setLogLevel: (val: string) => void;
  setDisableAnimations: (val: boolean) => void;
  setTabHibernationTimeout: (val: number) => void;
  setShowTokenTelemetry: (val: boolean) => void;
  widgetsEnabled: { fileExplorer: boolean };
  setWidgetsEnabled: (val: { fileExplorer: boolean }) => void;
}

const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await secureVault.get<{ value: string }>(name);
    return value ? value.value : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await secureVault.set(name, { value });
    await secureVault.save();
  },
  removeItem: async (name: string): Promise<void> => {
    await secureVault.delete(name);
    await secureVault.save();
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      useSystemPath: false,
      defaultShell: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac') ? 'zsh' : 'bash',
      logLevel: 'info',
      disableAnimations: false,
      tabHibernationTimeout: 5,
      showTokenTelemetry: false,
      widgetsEnabled: { fileExplorer: false },
      setUseSystemPath: (val) => set({ useSystemPath: val }),
      setDefaultShell: (val) => set({ defaultShell: val }),
      setLogLevel: (val) => set({ logLevel: val }),
      setDisableAnimations: (val) => set({ disableAnimations: val }),
      setTabHibernationTimeout: (val) => set({ tabHibernationTimeout: val }),
      setShowTokenTelemetry: (val) => set({ showTokenTelemetry: val }),
      setWidgetsEnabled: (val) => set({ widgetsEnabled: val }),
    }),
    {
      name: 'somaterm-settings',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
