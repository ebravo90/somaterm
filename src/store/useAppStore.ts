import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export type WidgetType = { type: 'webview' } | { type: 'agent' } | { type: 'web_manager' };

export interface TerminalSession {
  id: string;
  name?: string;
  activeProcess: boolean;
}

export type ChatMessage = { role: 'user' | 'assistant', content: string, meta?: string };
export type WebViewItem = { id: string, url: string, hasUnread: boolean, isHibernated: boolean, isAudioPlaying?: boolean, lastActiveAt: number };
export type LogEntry = { id: string, timestamp: number, level: 'INFO' | 'WARN' | 'ERROR' | 'MEDIA' | 'SYSTEM', source: string, message: string };

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
  setWebViewHibernated: (id: string, hibernated: boolean) => void;
  setWebViewAudioStatus: (id: string, isPlaying: boolean) => void;
  receiveHeartbeat: (id: string, isPlaying: boolean, currentUrl: string) => void;
  setActiveWebId: (id: string) => void;

  isWidgetPanelOpen: boolean;
  toggleWidgetPanel: () => void;
  setWidgetPanelOpen: (isOpen: boolean) => void;
  chatHistory: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  hasUnread: boolean;
  setHasUnread: (value: boolean) => void;

  isSettingsOpen: boolean;
  toggleSettings: () => void;
  isDebugModeEnabled: boolean;
  setDebugMode: (enabled: boolean) => void;
  debugLogs: LogEntry[];
  sessionId: string;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;

  terminals: TerminalSession[];
  addTerminal: () => void;
  renameTerminal: (id: string, name: string) => void;
  closeTerminal: (id: string) => Promise<void>;
}

function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    
    // 1. Gmail background frame
    if (url.pathname.includes('/_/bscframe')) return url.origin + '/mail/';
    
    // 2. YouTube subdomains (Accounts/Studio)
    if (url.hostname.includes('accounts.youtube.com') || url.hostname.includes('studio.youtube.com')) {
        return 'https://www.youtube.com/';
    }
    
    // 3. Google Services
    if (url.hostname === 'ogs.google.com') return 'https://www.google.com/';
    
    // 4. Default return
    return url.href;
  } catch (e) {
    return rawUrl;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  activeWidget: null,
  setActiveWidget: (widget) => set((state) => {
    let newActiveWebId = state.activeWebId;
    let newWebViews = state.webViews;
    
    if (widget?.type === 'web_manager' || widget?.type === 'agent') {
      newActiveWebId = null;
      if (state.activeWebId) {
        newWebViews = state.webViews.map(w => 
          w.id === state.activeWebId ? { ...w, lastActiveAt: Date.now() } : w
        );
      }
    }
    
    return { activeWidget: widget, activeWebId: newActiveWebId, webViews: newWebViews };
  }),
  closeWidget: () => set({ activeWidget: null }),
  
  webViews: [],
  activeWebId: null,
  addWebView: (url: string) => {
    let sanitizedUrl = url.trim();
    if (!/^https?:\/\//i.test(sanitizedUrl)) {
      sanitizedUrl = `https://${sanitizedUrl}`;
    }
    const finalUrl = normalizeUrl(sanitizedUrl);
    const id = Date.now().toString();
    set((state) => ({ 
      webViews: [...state.webViews, { 
        id, 
        url: finalUrl, 
        hasUnread: false, 
        isHibernated: false, 
        lastActiveAt: Date.now() 
      }],
      activeWebId: id,
      activeWidget: { type: 'webview' }
    }));
  },
  removeWebView: (id: string) => {
    set((state) => {
      const newWebViews = state.webViews.filter(w => w.id !== id);
      
      let newActiveWebId = state.activeWebId;
      let newActiveWidget = state.activeWidget;

      if (state.activeWebId === id) {
        newActiveWebId = null;
        if (state.activeWidget?.type === 'webview') {
          newActiveWidget = { type: 'web_manager' };
        }
      }

      return { 
        webViews: newWebViews, 
        activeWebId: newActiveWebId, 
        activeWidget: newActiveWidget 
      };
    });
  },
  updateWebViewUrl: (id: string, newUrl: string) => 
    set((state) => ({
      webViews: state.webViews.map(w => {
        if (w.id === id) {
          return { ...w, url: normalizeUrl(newUrl) };
        }
        return w;
      })
    })),
  setWebViewUnread: (id: string, hasUnread: boolean) => {
    set((state) => ({
      webViews: state.webViews.map(w => w.id === id ? { ...w, hasUnread: hasUnread } : w)
    }));
  },
  setWebViewHibernated: (id: string, hibernated: boolean) => {
    set((state) => ({
      webViews: state.webViews.map(w => w.id === id ? { ...w, isHibernated: hibernated } : w)
    }));
  },
  setWebViewAudioStatus: (id: string, isPlaying: boolean) => {
    set((state) => ({
      webViews: state.webViews.map(w => w.id === id ? { ...w, isAudioPlaying: isPlaying } : w)
    }));
  },
  receiveHeartbeat: (id: string, isPlaying: boolean, currentUrl: string) => {
    set((state) => ({
      webViews: state.webViews.map(w => {
        if (w.id === id) {
          const newUrl = currentUrl ? normalizeUrl(decodeURIComponent(currentUrl)) : w.url;
          return { 
            ...w, 
            isAudioPlaying: isPlaying, 
            url: newUrl, 
            lastActiveAt: isPlaying ? Date.now() : w.lastActiveAt 
          };
        }
        return w;
      })
    }));
  },
  setActiveWebId: (id: string) => {
    const state = get();
    const targetWebView = state.webViews.find(w => w.id === id);
    if (targetWebView?.isHibernated) {
      state.addLog({
        level: 'SYSTEM',
        source: 'WebManager',
        message: `Tab ${id} revived.`
      });
    }

    set((state) => ({
      webViews: state.webViews.map(w => {
        if (w.id === state.activeWebId && w.id !== id) {
          return { ...w, lastActiveAt: Date.now() };
        }
        if (w.id === id) {
          return { ...w, isHibernated: false, lastActiveAt: Date.now() };
        }
        return w;
      }),
      activeWebId: id, 
      activeWidget: { type: 'webview' }
    }));
  },

  isWidgetPanelOpen: false,
  toggleWidgetPanel: () => set((state) => ({ isWidgetPanelOpen: !state.isWidgetPanelOpen })),
  setWidgetPanelOpen: (isOpen) => set({ isWidgetPanelOpen: isOpen }),
  chatHistory: [],
  addChatMessage: (message) => set((state) => ({ chatHistory: [...state.chatHistory, message] })),
  clearChatHistory: () => set({ chatHistory: [] }),
  hasUnread: false,
  setHasUnread: (value) => set({ hasUnread: value }),

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

  terminals: [{ id: `term-${Date.now()}`, activeProcess: false }],
  
  addTerminal: () => set((state) => {
    if (state.terminals.length >= 4) return state;
    
    const baseName = "Terminal";
    let newName = baseName;
    let counter = 2;
    while (state.terminals.some(t => (t.name || t.id).toLowerCase() === newName.toLowerCase())) {
      newName = `${baseName} (${counter})`;
      counter++;
    }
    
    return {
      terminals: [...state.terminals, { id: `term-${Date.now()}`, name: newName, activeProcess: false }]
    };
  }),

  renameTerminal: (id, name) => set((state) => {
    const originalTerminal = state.terminals.find(t => t.id === id);
    if (!originalTerminal) return state;
    
    if (originalTerminal.name === name) return state;
    
    let uniqueName = name;
    let counter = 2;
    while (state.terminals.some(t => t.id !== id && (t.name || t.id).toLowerCase() === uniqueName.toLowerCase())) {
      uniqueName = `${name} (${counter})`;
      counter++;
    }
    
    return {
      terminals: state.terminals.map(t => t.id === id ? { ...t, name: uniqueName } : t)
    };
  }),

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
      console.error("Failed to close PTY:", e);
    }

    set((state) => {
      const newTerms = state.terminals.filter(t => t.id !== id);
      if (newTerms.length === 0) {
        return { terminals: [{ id: `term-${Date.now()}`, name: 'Terminal', activeProcess: false }] };
      }
      return { terminals: newTerms };
    });
  }
}));
