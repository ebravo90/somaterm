import { create } from 'zustand';

export type WidgetType = { type: 'webview'; url: string };

interface AppState {
  activeWidget: WidgetType | null;
  setActiveWidget: (widget: WidgetType) => void;
  closeWidget: () => void;
  isWidgetPanelOpen: boolean;
  toggleWidgetPanel: () => void;
  setWidgetPanelOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeWidget: null,
  setActiveWidget: (widget) => set({ activeWidget: widget }),
  closeWidget: () => set({ activeWidget: null }),
  isWidgetPanelOpen: false,
  toggleWidgetPanel: () => set((state) => ({ isWidgetPanelOpen: !state.isWidgetPanelOpen })),
  setWidgetPanelOpen: (isOpen) => set({ isWidgetPanelOpen: isOpen }),
}));
