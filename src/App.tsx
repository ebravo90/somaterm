import { useState, useRef, useEffect } from 'react';
import { TerminalGrid } from './components/TerminalGrid';
import { useAppStore } from './store/useAppStore';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { NativeWebview, untrackWebView } from './components/Widgets/NativeWebview';
import { AgentWidget } from './components/Widgets/AgentWidget';
import { WebManagerWidget } from './components/Widgets/WebManagerWidget';
import { SettingsModal } from './components/SettingsModal';
import { DebugConsole } from './components/DebugConsole';

// Expose store for Playwright E2E testing
if (import.meta.env.DEV) {
  (window as any).__store = useAppStore;
}

function App() {
  const { 
    activeWidget, 
    setActiveWidget, 
    closeWidget, 
    hasUnread,
    setHasUnread,
    webViews, 
    activeWebId,
    isSettingsOpen,
    terminals
  } = useAppStore();
  
  const [terminalWidth, setTerminalWidth] = useState(66.66); // percentage
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  useEffect(() => {
    const activeTerms = terminals.map(t => ({ id: t.id, name: t.name || t.id }));
    invoke('update_active_terminals_menu', { terminals: activeTerms }).catch(console.error);
  }, [terminals]);

  useEffect(() => {
    useAppStore.getState().addLog({
      level: 'INFO',
      source: 'UX',
      message: 'Somaterm UI initialized successfully.'
    });

    let unlistenClose: Promise<() => void> | null = null;
    try {
      unlistenClose = getCurrentWindow().onCloseRequested(async (event) => {
        event.preventDefault();
        
        const store = useAppStore.getState();
        
        if (store.abortController) {
          store.abortController.abort();
        }
        
        await exit(0);
      });
    } catch (err) {
      console.warn('getCurrentWindow not available in this environment');
    }

    const unlistenUrl = listen('webview-url-changed', (event) => {
      const payload = event.payload as { id: string, url: string };
      if (!payload.url.startsWith('about:blank')) {
        useAppStore.getState().updateWebViewUrl(payload.id, payload.url);
      }
    });

    const unlistenHibernated = listen('webview-hibernated', (event) => {
      const id = event.payload as string;
      const store = useAppStore.getState();
      store.setWebViewHibernated(id, true);
      store.addLog({
        level: 'SYSTEM',
        source: 'WebManager',
        message: `Tab ${id} hibernated due to inactivity.`
      });
      untrackWebView(id);
    });

    const unlistenHeartbeat = listen('webview_media_heartbeat', (event) => {
      const payload = event.payload as { id: string, playing: boolean, url: string };
      const store = useAppStore.getState();
      
      const webview = store.webViews.find(w => w.id === payload.id);
      const previousState = webview ? webview.isAudioPlaying : null;
      
      store.receiveHeartbeat(payload.id, payload.playing, payload.url);
      
      if (previousState === undefined || previousState !== payload.playing) {
        store.addLog({
          level: 'MEDIA',
          source: 'WebManager',
          message: `Heartbeat from tab ${payload.id}: playing=${payload.playing}, url=${payload.url}`
        });
      }
    });

    const unlistenSettings = listen('menu-settings', () => {
      useAppStore.getState().toggleSettings();
    });

    const unlistenNewTerminal = listen('menu-new-terminal', () => {
      useAppStore.getState().addTerminal();
    });

    const unlistenCloseTerminal = listen('menu-close-terminal', () => {
      const state = useAppStore.getState();
      if (state.activeTerminalId) {
        state.closeTerminal(state.activeTerminalId);
      }
    });

    const unlistenClearBuffer = listen('menu-clear-buffer', () => {
      const state = useAppStore.getState();
      if (state.activeTerminalId) {
        window.dispatchEvent(new CustomEvent('somaterm-clear-buffer', { detail: { id: state.activeTerminalId } }));
      }
    });

    const unlistenToggleWeb = listen('menu-toggle-web', () => {
      const store = useAppStore.getState();
      store.activeWidget?.type === 'web_manager' ? store.closeWidget() : store.setActiveWidget({ type: 'web_manager' });
    });

    const unlistenToggleAgent = listen('menu-toggle-agent', () => {
      const store = useAppStore.getState();
      store.activeWidget?.type === 'agent' ? store.closeWidget() : store.setActiveWidget({ type: 'agent' });
    });

    const unlistenClearContext = listen('menu-clear-context', () => {
      useAppStore.getState().clearActiveSession();
    });

    const unlistenDocs = listen('menu-docs', () => {
      const store = useAppStore.getState();
      store.addWebView('https://github.com/ebravo90/somaterm');
      store.setActiveWidget({ type: 'web_manager' });
    });

    const unlistenNavUrl = listen('menu-navigate-url', () => {
      const store = useAppStore.getState();
      store.setActiveWidget({ type: 'web_manager' });
    });

    const unlistenFocusTerminal = listen('menu-focus-terminal', (event) => {
      const termId = event.payload as string;
      useAppStore.getState().setActiveTerminalId(termId);
    });

    const unlistenLog = listen('new-log', (event) => {
      const payload = event.payload as { timestamp: string, level: string, source: string, message: string };
      useAppStore.getState().addLog({
        level: payload.level as any,
        source: payload.source,
        message: payload.message
      });
    });

    const audioTimeout = setInterval(() => {
      const state = useAppStore.getState();
      const now = Date.now();
      state.webViews.forEach(view => {
        if (view.isAudioPlaying && (now - view.lastActiveAt > 5000) && state.activeWebId !== view.id) {
          state.setWebViewAudioStatus(view.id, false);
        }
      });
    }, 5000);
    
    return () => {
      unlistenUrl.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenHibernated.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenHeartbeat.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenSettings.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenNewTerminal.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenCloseTerminal.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenClearBuffer.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenToggleWeb.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenToggleAgent.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenClearContext.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenDocs.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenNavUrl.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenFocusTerminal.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      unlistenLog.then(f => { try { const p = f() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      if (unlistenClose) {
        unlistenClose.then(unlisten => { try { const p = unlisten() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      }
      clearInterval(audioTimeout);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      // If the left mouse button is no longer pressed (e.g. released outside window)
      if (e.buttons !== 1) {
        isDragging.current = false;
        setIsDraggingState(false);
        document.body.style.cursor = 'default';
        return;
      }
      
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 20 && newWidth <= 95) {
        setTerminalWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      setIsDraggingState(false);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-soma-bg text-soma-text">
      <div className={`flex-1 flex min-h-0 flex-row relative ${isSettingsOpen ? "filter blur-sm brightness-50 transition-all duration-300" : "transition-all duration-300"}`}>
      <div 
        style={{ width: activeWidget ? `${terminalWidth}%` : '100%' }}
        className="h-full shrink-0 relative"
      >
        {/* Floating Dock */}
        <div className="absolute top-4 right-4 z-[100] flex flex-col gap-3">
          {/* Agent Toggle */}
          <button 
            onClick={() => {
              if (activeWidget?.type === 'agent') {
                useAppStore.getState().addLog({ level: 'INFO', source: 'UX', message: 'Layout updated: Full Terminal mode' });
                closeWidget();
              } else {
                useAppStore.getState().addLog({ level: 'INFO', source: 'UX', message: 'Widget activated: AI Agent' });
                setActiveWidget({ type: 'agent' });
                setHasUnread(false);
              }
            }}
            className={`p-2 rounded-md transition-all cursor-pointer relative ${
              activeWidget?.type === 'agent' 
                ? 'bg-white/5 backdrop-blur-[2px] text-blue-300 border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' 
                : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
            }`}
            title="Toggle AI Agent"
          >
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-soma-bg" />
            )}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
            </svg>
          </button>

          {/* Web Manager Toggle */}
          <button
            onClick={() => {
              if (activeWidget?.type === 'web_manager') {
                useAppStore.getState().addLog({ level: 'INFO', source: 'UX', message: 'Layout updated: Full Terminal mode' });
                closeWidget();
              } else {
                useAppStore.getState().addLog({ level: 'INFO', source: 'UX', message: 'Widget activated: Web Manager' });
                setActiveWidget({ type: 'web_manager' });
              }
            }}
            className={`p-2 rounded-md transition-all cursor-pointer relative ${
              activeWidget?.type === 'web_manager'
                ? 'bg-white/5 backdrop-blur-[2px] text-blue-300 border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' 
                : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
            }`}
            title="Web Manager"
          >
            {webViews.some(w => w.hasUnread) && (
              <span className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-soma-bg" />
            )}
            {webViews.length > 0 && activeWidget?.type !== 'web_manager' && (
              <span className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 bg-blue-500 text-[10px] text-white font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-soma-bg">
                {webViews.length}
              </span>
            )}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </button>
        </div>
        <TerminalGrid />
      </div>
      
      {activeWidget && (
        <div 
          className="w-1 bg-soma-border hover:bg-gray-700 transition-colors cursor-col-resize shrink-0 z-50 relative"
          onMouseDown={() => {
            isDragging.current = true;
            setIsDraggingState(true);
            document.body.style.cursor = 'col-resize';
          }}
          onDoubleClick={() => {
            setTerminalWidth(66.66);
          }}
        />
      )}
      
      {activeWidget && (
        <div 
          style={{ 
            width: `calc(${100 - terminalWidth}% - 4px)`,
            pointerEvents: isDraggingState ? 'none' : 'auto' 
          }}
          className="h-full shrink-0 flex flex-col overflow-hidden min-h-0"
        >
          {activeWidget.type === 'webview' && activeWebId ? (
            <NativeWebview id={activeWebId} url={webViews.find(w => w.id === activeWebId)?.url || ''} />
          ) : activeWidget.type === 'web_manager' ? (
            <WebManagerWidget />
          ) : (
            <AgentWidget />
          )}
        </div>
      )}
      </div>
      
      {/* Settings Modal overlay */}
      <SettingsModal />

      {/* Debug Console */}
      <DebugConsole />

    </div>
  );
}

export default App;
