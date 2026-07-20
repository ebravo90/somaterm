import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';

function Favicon({ url, active }: { url: string, active: boolean }) {
  const [error, setError] = useState(false);
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    // ignore invalid URLs
  }

  if (error || !domain) {
    return (
      <svg className={`transition-colors ${active ? 'text-soma-accent' : 'text-soma-text-muted'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    );
  }

  return (
    <img 
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
      alt="" 
      className={`w-4 h-4 rounded-sm transition-opacity ${active ? 'opacity-100' : 'opacity-70'}`}
      onError={() => setError(true)}
    />
  );
}

export const WebManagerWidget: React.FC = () => {
  const { webViews, removeWebView, activeWebId, setActiveWebId, closeWidget, updateWebViewUrl, addWebView } = useAppStore();
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const state = useAppStore.getState();
      state.webViews.forEach(view => {
        if (view.id !== state.activeWebId && !view.isHibernated) {
          // 5 minutes = 300,000 ms
          if (now - view.lastActiveAt > 300000) {
            invoke('try_hibernate_webview', { id: view.id }).catch(console.error);
          }
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = (id: string) => {
    removeWebView(id);
    invoke('close_webview', { id }).catch(console.error);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = newUrl.trim();
      if (!input) return;
      
      let finalUrl = input;
      if (input.startsWith('http://') || input.startsWith('https://')) {
        finalUrl = input;
      } else if (input.includes('.') && !input.includes(' ') && !input.startsWith('localhost:')) {
        finalUrl = 'https://' + input;
      } else if (input.startsWith('localhost:')) {
        finalUrl = 'http://' + input;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
      }

      if (activeWebId) {
        invoke('update_webview', { 
          id: activeWebId, 
          url: finalUrl,
          x: 0, y: 0, width: 0, height: 0
        }).catch(console.error);
        updateWebViewUrl(activeWebId, finalUrl);
      } else {
        addWebView(finalUrl);
      }
      setNewUrl('');
    }
  };

  return (
    <div className="@container w-full h-full flex flex-col bg-soma-panel text-soma-text overflow-hidden">
      <div className="flex items-center justify-center @[250px]:justify-between gap-3 p-4 border-b border-soma-border shrink-0">
        <input 
          type="text" 
          value={newUrl} 
          onChange={(e) => setNewUrl(e.target.value)} 
          onKeyDown={handleKeyDown} 
          placeholder="https://example.com"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="hidden @[250px]:block flex-1 bg-soma-bg text-soma-text border border-soma-border rounded-md px-3 py-1.5 outline-none focus:border-soma-accent text-sm min-w-0 shadow-inner" 
        />
        <button 
          onClick={closeWidget}
          className="text-soma-text-muted hover:text-soma-text transition-colors cursor-pointer p-1.5 rounded hover:bg-soma-border shrink-0"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 pb-8 grow overflow-y-auto">
        {webViews.length === 0 ? (
          <div className="text-soma-text-muted text-center py-8 text-sm">
            No open web sessions
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {webViews.map(view => (
              <div 
                key={view.id} 
                onClick={() => {
                  if (view.isHibernated) {
                    invoke('create_webview', {
                      id: view.id,
                      url: view.url,
                      x: 0, y: 0, width: 0, height: 0
                    }).catch(console.error);
                  }
                  setActiveWebId(view.id);
                }}
                className={`relative flex items-center justify-center @[250px]:justify-between gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  activeWebId === view.id 
                    ? 'bg-soma-accent/10 border-soma-accent/50' 
                    : 'bg-soma-bg border-soma-border hover:border-soma-text-muted/30'
                } ${view.isHibernated ? 'opacity-50 grayscale' : ''}`}
              >
                {view.isHibernated && (
                  <svg className="absolute -top-2 -left-2 text-blue-400 opacity-70" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                  </svg>
                )}
                {view.isAudioPlaying && (
                  <div className="absolute top-1 left-7 animate-pulse">
                    <svg className="text-emerald-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Favicon url={view.url} active={activeWebId === view.id} />
                    {view.hasUnread && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                    )}
                  </div>
                  <div className="hidden @[250px]:block flex-1 truncate text-sm">
                    {view.url}
                  </div>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleDelete(view.id); 
                  }} 
                  className="text-soma-text-muted hover:text-red-400 p-1.5 rounded transition-colors shrink-0"
                  title="Close session"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
