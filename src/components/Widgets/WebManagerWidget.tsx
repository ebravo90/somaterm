import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function WebManagerWidget() {
  const { webViews, activeWebId, addWebView, removeWebView, setActiveWebId, closeWidget } = useAppStore();
  const [newUrl, setNewUrl] = useState('');

  const handleAdd = () => {
    if (newUrl.trim()) {
      addWebView(newUrl);
      setNewUrl('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
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

      <div className="flex flex-col gap-4 p-4 grow overflow-y-auto">
        {webViews.length === 0 ? (
          <div className="text-soma-text-muted text-center py-8 text-sm">
            No open web sessions
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {webViews.map(view => (
              <div 
                key={view.id} 
                onClick={() => setActiveWebId(view.id)}
                className={`flex items-center justify-center @[250px]:justify-between gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  activeWebId === view.id 
                    ? 'bg-soma-accent/10 border-soma-accent/50' 
                    : 'bg-soma-bg border-soma-border hover:border-soma-text-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative shrink-0 flex items-center justify-center">
                    <svg className={`transition-colors ${activeWebId === view.id ? 'text-soma-accent' : 'text-soma-text-muted'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
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
                    removeWebView(view.id); 
                  }} 
                  className="text-soma-text-muted hover:text-red-400 p-1.5 rounded transition-colors shrink-0"
                  title="Close session"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
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
