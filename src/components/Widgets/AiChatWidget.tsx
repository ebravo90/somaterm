import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function AiChatWidget() {
  const { closeWidget, stagedContextFiles, removeContextFile } = useAppStore();
  const [input, setInput] = useState('');

  return (
    <div className="@container w-full h-full flex flex-col bg-soma-panel relative">
      <div className="h-10 flex items-center justify-between px-4 border-b border-soma-border shrink-0">
        <h2 className="text-sm font-medium text-soma-text flex items-center gap-2">
          ✨ AI Chat
        </h2>
        <button 
          onClick={closeWidget}
          className="text-soma-text-muted hover:text-soma-text transition-colors p-1 rounded hover:bg-soma-border"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-sm text-soma-text-muted italic text-center">
          Ready to assist. Add files to context to begin.
        </div>
      </div>

      <div className="p-3 border-t border-soma-border bg-soma-background/50 flex flex-col gap-2">
        {stagedContextFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stagedContextFiles.map(file => (
              <div key={file} className="flex items-center gap-1 bg-soma-border/50 text-soma-text text-xs px-2 py-1 rounded-full border border-soma-border">
                <span>📄</span>
                <span className="truncate max-w-[150px]" title={file}>{file.split(/[/\\]/).pop()}</span>
                <button 
                  onClick={() => removeContextFile(file)}
                  className="ml-1 text-soma-text-muted hover:text-red-400"
                  aria-label="Remove context file"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI..."
            className="w-full bg-soma-bg border border-soma-border rounded-md px-3 py-2 text-sm text-soma-text placeholder-soma-text-muted outline-none focus:border-blue-500/50 resize-none min-h-[40px] max-h-[200px] pr-10"
            rows={1}
          />
          <button 
            className="absolute right-2 bottom-2 p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors rounded"
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
