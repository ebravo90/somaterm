import { useAppStore } from '../../store/useAppStore';

export function WebWidget({ url }: { url: string }) {
  const closeWidget = useAppStore(state => state.closeWidget);

  return (
    <div className="w-full h-full flex flex-col bg-soma-panel">
      <div className="h-10 flex items-center justify-between px-4 border-b border-soma-border shrink-0">
        <span className="text-sm text-soma-text-muted truncate max-w-[80%]" title={url}>{url}</span>
        <button 
          onClick={closeWidget}
          className="text-soma-text-muted hover:text-soma-text transition-colors cursor-pointer p-1 rounded hover:bg-soma-border"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div className="grow w-full relative">
        <iframe 
          src={url} 
          className="absolute inset-0 w-full h-full border-0 bg-white"
          title="Web Widget"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
}
