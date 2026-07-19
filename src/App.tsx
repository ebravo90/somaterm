import { useState, useRef, useEffect } from 'react';
import { TerminalCanvas } from './components/TerminalCanvas';
import { useAppStore } from './store/useAppStore';
import { listen } from '@tauri-apps/api/event';
import { NativeWebview, untrackWebView } from './components/Widgets/NativeWebview';
import { AgentWidget } from './components/Widgets/AgentWidget';
import { WebManagerWidget } from './components/Widgets/WebManagerWidget';
import { SettingsModal } from './components/SettingsModal';

function App() {
  const { 
    activeWidget, 
    setActiveWidget, 
    closeWidget, 
    hasUnread,
    setHasUnread,
    webViews, 
    activeWebId
  } = useAppStore();
  
  const [terminalWidth, setTerminalWidth] = useState(66.66); // percentage
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  useEffect(() => {
    const unlistenUrl = listen('webview-url-changed', (event) => {
      const payload = event.payload as { id: string, url: string };
      if (!payload.url.startsWith('about:blank')) {
        useAppStore.getState().updateWebViewUrl(payload.id, payload.url);
      }
    });

    const unlistenHibernated = listen('webview-hibernated', (event) => {
      const id = event.payload as string;
      useAppStore.getState().setWebViewHibernated(id, true);
      untrackWebView(id);
    });

    const unlistenHeartbeat = listen('webview_media_heartbeat', (event) => {
      const payload = event.payload as { id: string, playing: boolean, url: string };
      useAppStore.getState().receiveHeartbeat(payload.id, payload.playing, payload.url);
    });

    const unlistenSettings = listen('toggle-settings', () => {
      useAppStore.getState().toggleSettings();
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
      unlistenUrl.then(f => f());
      unlistenHibernated.then(f => f());
      unlistenHeartbeat.then(f => f());
      unlistenSettings.then(f => f());
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
    <div className="w-screen h-screen bg-soma-bg text-soma-text overflow-hidden flex flex-row relative">
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
                closeWidget();
              } else {
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
                closeWidget();
              } else {
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
        <TerminalCanvas />
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
          className="h-full shrink-0"
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
      {/* Settings Modal overlay */}
      <SettingsModal />

    </div>
  );
}

export default App;
