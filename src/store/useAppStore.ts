import { create } from 'zustand';

export type WidgetType = { type: 'webview'; url: string } | { type: 'agent' };

export type ChatMessage = { role: 'user' | 'assistant', content: string, meta?: string };

interface AppState {
  activeWidget: WidgetType | null;
  setActiveWidget: (widget: WidgetType | null) => void;
  closeWidget: () => void;
  isWidgetPanelOpen: boolean;
  toggleWidgetPanel: () => void;
  setWidgetPanelOpen: (isOpen: boolean) => void;
  chatHistory: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  hasUnread: boolean;
  setHasUnread: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeWidget: null,
  setActiveWidget: (widget) => set({ activeWidget: widget }),
  closeWidget: () => set({ activeWidget: null }),
  isWidgetPanelOpen: false,
  toggleWidgetPanel: () => set((state) => ({ isWidgetPanelOpen: !state.isWidgetPanelOpen })),
  setWidgetPanelOpen: (isOpen) => set({ isWidgetPanelOpen: isOpen }),
  chatHistory: [],
  addChatMessage: (message) => set((state) => ({ chatHistory: [...state.chatHistory, message] })),
  clearChatHistory: () => set({ chatHistory: [] }),
  hasUnread: false,
  setHasUnread: (value) => set({ hasUnread: value }),
}));
