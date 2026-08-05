import type { StateCreator } from 'zustand';
import type { AppState, WidgetType, WebViewItem } from '../../types/store.types';

export interface UISlice {
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

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  activeWidget: null,
  setActiveWidget: (widget) => {
    set((state) => {
      let newActiveWebId = state.activeWebId;
      let newWebViews = [...state.webViews];

      if (widget?.type === 'webview') {
        const hasActiveTabs = newWebViews.some(w => !w.isHibernated);
        if (!hasActiveTabs && newWebViews.length > 0) {
          const firstTab = newWebViews[0];
          newWebViews[0] = { ...firstTab, isHibernated: false, lastActiveAt: Date.now() };
          newActiveWebId = firstTab.id;
        } else if (!newActiveWebId && newWebViews.length > 0) {
          const activeTab = newWebViews.find(w => !w.isHibernated);
          if (activeTab) {
            newActiveWebId = activeTab.id;
          } else {
             newWebViews[0] = { ...newWebViews[0], isHibernated: false, lastActiveAt: Date.now() };
             newActiveWebId = newWebViews[0].id;
          }
        }
      }

      return { activeWidget: widget, activeWebId: newActiveWebId, webViews: newWebViews };
    });
  },
  closeWidget: () => set({ activeWidget: null }),

  webViews: [],
  activeWebId: null,

  addWebView: (url) => set((state) => {
    const id = crypto.randomUUID();
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        normalizedUrl = 'https://' + url;
    }
    const newWebViews = [
        ...state.webViews.map(w => ({ ...w, isHibernated: true })),
        { id, url: normalizedUrl, hasUnread: false, isHibernated: false, lastActiveAt: Date.now() }
    ];
    return {
      webViews: newWebViews,
      activeWebId: id,
      activeWidget: { type: 'webview' }
    };
  }),

  removeWebView: (id) => set((state) => {
    const newWebViews = state.webViews.filter(w => w.id !== id);
    let newActiveWebId = state.activeWebId;
    let newActiveWidget = state.activeWidget;

    if (newWebViews.length === 0) {
        newActiveWebId = null;
        if (state.activeWidget?.type === 'webview') {
             newActiveWidget = null;
        }
    } else if (state.activeWebId === id) {
        const lastActive = [...newWebViews].sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
        newActiveWebId = lastActive.id;
        const index = newWebViews.findIndex(w => w.id === lastActive.id);
        if(index !== -1) {
             newWebViews[index] = { ...newWebViews[index], isHibernated: false, lastActiveAt: Date.now() };
        }
    }

    return { 
        webViews: newWebViews, 
        activeWebId: newActiveWebId, 
        activeWidget: newActiveWidget 
    };
  }),

  updateWebViewUrl: (id, newUrl) => set((state) => ({
    webViews: state.webViews.map(w => w.id === id ? { ...w, url: newUrl } : w)
  })),

  setWebViewUnread: (id, hasUnread) => set((state) => ({
    webViews: state.webViews.map(w => w.id === id ? { ...w, hasUnread } : w)
  })),
  
  setWebViewHibernated: (id, hibernated) => set((state) => ({
    webViews: state.webViews.map(w => {
       if (w.id === id) {
           return { ...w, isHibernated: hibernated, lastActiveAt: hibernated ? w.lastActiveAt : Date.now() };
       }
       return w;
    })
  })),
  
  setWebViewAudioStatus: (id, isPlaying) => set((state) => ({
      webViews: state.webViews.map(w => w.id === id ? { ...w, isAudioPlaying: isPlaying } : w)
  })),

  receiveHeartbeat: (id, isPlaying, currentUrl) => set((state) => ({
      webViews: state.webViews.map(w => {
         if (w.id === id) {
             const normalizedUrl = normalizeUrl(currentUrl);
             const updates: Partial<WebViewItem> = { isAudioPlaying: isPlaying };
             if (normalizedUrl !== w.url && !w.isHibernated) {
                 updates.url = normalizedUrl;
             }
             return { ...w, ...updates };
         }
         return w;
      })
  })),

  setActiveWebId: (id) => set((state) => {
    const newWebViews = state.webViews.map(w => {
        if (w.id === id) {
            return { ...w, isHibernated: false, lastActiveAt: Date.now() };
        }
        return { ...w, isHibernated: true };
    });
    return { 
        activeWebId: id,
        webViews: newWebViews,
        activeWidget: { type: 'webview' }
    };
  }),

  isWidgetPanelOpen: true,
  toggleWidgetPanel: () => set((state) => ({ isWidgetPanelOpen: !state.isWidgetPanelOpen })),
  setWidgetPanelOpen: (isOpen) => set({ isWidgetPanelOpen: isOpen }),
});
