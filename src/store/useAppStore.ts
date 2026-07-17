import { create } from 'zustand';

export type WidgetType = { type: 'webview' } | { type: 'agent' } | { type: 'web_manager' };

export type ChatMessage = { role: 'user' | 'assistant', content: string, meta?: string };
export type WebViewItem = { id: string, url: string, hasUnread: boolean };

interface AppState {
  activeWidget: WidgetType | null;
  setActiveWidget: (widget: WidgetType | null) => void;
  closeWidget: () => void;
  
  webViews: WebViewItem[];
  activeWebId: string | null;
  addWebView: (url: string) => void;
  removeWebView: (id: string) => void;
  updateWebViewUrl: (id: string, newUrl: string) => void;
  setWebViewUnread: (id: string, hasUnread: boolean) => void;
  setActiveWebId: (id: string) => void;

  isWidgetPanelOpen: boolean;
  toggleWidgetPanel: () => void;
  setWidgetPanelOpen: (isOpen: boolean) => void;
  chatHistory: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  hasUnread: boolean;
  setHasUnread: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeWidget: null,
  setActiveWidget: (widget) => set({ activeWidget: widget }),
  closeWidget: () => set({ activeWidget: null }),
  
  webViews: [],
  activeWebId: null,
  addWebView: (url: string) => {
    let sanitizedUrl = url.trim();
    if (!/^https?:\/\//i.test(sanitizedUrl)) {
      sanitizedUrl = `https://${sanitizedUrl}`;
    }
    const id = Date.now().toString();
    set((state) => ({ 
      webViews: [...state.webViews, { id, url: sanitizedUrl, hasUnread: false }],
      activeWebId: id,
      activeWidget: { type: 'webview' }
    }));
  },
  removeWebView: (id: string) => {
    set((state) => {
      const newWebViews = state.webViews.filter(w => w.id !== id);
      const newActiveWebId = state.activeWebId === id 
        ? (newWebViews.length > 0 ? newWebViews[newWebViews.length - 1].id : null) 
        : state.activeWebId;
      const newActiveWidget = state.activeWidget?.type === 'web_manager' 
        ? state.activeWidget 
        : (newActiveWebId ? { type: 'webview' } : (state.activeWidget?.type === 'webview' ? null : state.activeWidget));
      return { webViews: newWebViews, activeWebId: newActiveWebId, activeWidget: newActiveWidget as WidgetType | null };
    });
  },
  updateWebViewUrl: (id: string, newUrl: string) => 
    set((state) => ({
      webViews: state.webViews.map(w => 
        w.id === id ? { ...w, url: newUrl } : w
      )
    })),
  setWebViewUnread: (id: string, hasUnread: boolean) => {
    set((state) => ({
      webViews: state.webViews.map(w => w.id === id ? { ...w, hasUnread: hasUnread } : w)
    }));
  },
  setActiveWebId: (id: string) => {
    set({ activeWebId: id, activeWidget: { type: 'webview' } });
  },

  isWidgetPanelOpen: false,
  toggleWidgetPanel: () => set((state) => ({ isWidgetPanelOpen: !state.isWidgetPanelOpen })),
  setWidgetPanelOpen: (isOpen) => set({ isWidgetPanelOpen: isOpen }),
  chatHistory: [],
  addChatMessage: (message) => set((state) => ({ chatHistory: [...state.chatHistory, message] })),
  clearChatHistory: () => set({ chatHistory: [] }),
  hasUnread: false,
  setHasUnread: (value) => set({ hasUnread: value }),
}));
