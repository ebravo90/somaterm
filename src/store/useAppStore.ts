import { create } from 'zustand';

interface AppState {
  isWidgetPanelOpen: boolean;
  toggleWidgetPanel: () => void;
  setWidgetPanelOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isWidgetPanelOpen: false,
  toggleWidgetPanel: () => set((state) => ({ isWidgetPanelOpen: !state.isWidgetPanelOpen })),
  setWidgetPanelOpen: (isOpen) => set({ isWidgetPanelOpen: isOpen }),
}));
